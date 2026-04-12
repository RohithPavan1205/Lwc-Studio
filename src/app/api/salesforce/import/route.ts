import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { decryptToken } from '@/utils/crypto/tokens';
import { SF_TOOLING_URL } from '@/utils/salesforce-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: initialConn } = await supabase
      .from('salesforce_connections')
      .select('instance_url, access_token')
      .eq('user_id', user.id)
      .single();

    console.log('[import API] Connection fetch - access_token present:', !!initialConn?.access_token, ', instance_url present:', !!initialConn?.instance_url);

    if (!initialConn?.access_token || !initialConn?.instance_url) {
      return NextResponse.json({ error: 'No Salesforce connection found' }, { status: 400 });
    }

    try {
      await checkAndRefreshToken(user.id);
    } catch (err: any) {
      if (err.name === 'REAUTH_REQUIRED') {
        return NextResponse.json({ error: 'REAUTH_REQUIRED' }, { status: 401 });
      }
      throw err;
    }

    // Re-fetch since checkAndRefreshToken might have saved a new encrypted token
    const { data: conn } = await supabase
      .from('salesforce_connections')
      .select('instance_url, access_token')
      .eq('user_id', user.id)
      .single();

    if (!conn?.instance_url || !conn?.access_token) {
      return NextResponse.json({ error: 'No Salesforce connection found' }, { status: 400 });
    }

    const token = decryptToken(conn.access_token);
    const instanceUrl = conn.instance_url;

    if (action === 'list') {
      const query = `SELECT Id, DeveloperName, MasterLabel, ApiVersion FROM LightningComponentBundle WHERE NamespacePrefix = null`;
      const toolingUrl = `${SF_TOOLING_URL(instanceUrl)}?q=${encodeURIComponent(query)}`;

      console.log('[import] instance_url:', instanceUrl);
      console.log('[import] full URL:', toolingUrl);
      // FIX 6 — removed token length/prefix logging

      const res = await fetch(toolingUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rawText = await res.text();
      console.log('[import] SF response status:', res.status);

      if (!res.ok) {
        console.log('[import] SF response body:', rawText);
        return NextResponse.json({ error: 'Failed to list components', details: rawText }, { status: res.status });
      }

      const data = JSON.parse(rawText);
      return NextResponse.json({ components: data.records });
    }

    if (action === 'files') {
      const bundleId = searchParams.get('bundleId');
      if (!bundleId) {
        return NextResponse.json({ error: 'Bundle ID is required' }, { status: 400 });
      }

      // FIX 5 — SOQL injection guard: Salesforce IDs are always 15 or 18 alphanumeric chars
      if (!/^[a-zA-Z0-9]{15,18}$/.test(bundleId)) {
        return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
      }

      const query = `SELECT FilePath, Source FROM LightningComponentResource WHERE LightningComponentBundleId = '${bundleId}'`;
      const url = `${SF_TOOLING_URL(instanceUrl)}?q=${encodeURIComponent(query)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to load component files', details: data }, { status: res.status });
      }

      let html = '';
      let js = '';
      let css = '';
      let xml = '';
      let hasExtraFiles = false;

      for (const record of data.records) {
        const filePath = record.FilePath || '';
        const source = record.Source || '';

        if (filePath.endsWith('.html')) {
          html = source;
        } else if (filePath.endsWith('.css')) {
          css = source;
        } else if (filePath.endsWith('.js') && !filePath.endsWith('.js-meta.xml')) {
          js = source;
        } else if (filePath.endsWith('.js-meta.xml')) {
          xml = source;
        } else {
          hasExtraFiles = true;
        }
      }

      // If xml was not in LightningComponentResource (it usually isn't), query the bundle metadata
      if (!xml) {
        try {
          const bundleQuery = `SELECT ApiVersion, Description, IsExposed, MasterLabel, TargetConfigs, Metadata FROM LightningComponentBundle WHERE Id = '${bundleId}'`;
          const bundleUrl = `${SF_TOOLING_URL(instanceUrl)}?q=${encodeURIComponent(bundleQuery)}`;
          const bundleRes = await fetch(bundleUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const bundleData = await bundleRes.json();
          
          if (bundleRes.ok && bundleData.records && bundleData.records.length > 0) {
            const rec = bundleData.records[0];
            const md = rec.Metadata || {};
            
            let generatedXml = `<?xml version="1.0" encoding="UTF-8"?>\n<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">\n`;
            
            const apiV = rec.ApiVersion || md.apiVersion || '62.0';
            generatedXml += `    <apiVersion>${apiV}</apiVersion>\n`;
            
            const isExp = md.isExposed !== undefined ? md.isExposed : (rec.IsExposed || false);
            generatedXml += `    <isExposed>${isExp}</isExposed>\n`;
            
            const label = rec.MasterLabel || md.masterLabel;
            if (label) generatedXml += `    <masterLabel>${label}</masterLabel>\n`;
            
            const desc = rec.Description || md.description;
            if (desc) generatedXml += `    <description>${desc}</description>\n`;
            
            if (md.targets && md.targets.target) {
              generatedXml += `    <targets>\n`;
              const targetsList = Array.isArray(md.targets.target) ? md.targets.target : [md.targets.target];
              targetsList.forEach((t: string) => {
                generatedXml += `        <target>${t}</target>\n`;
              });
              generatedXml += `    </targets>\n`;
            }
            
            const targetConfigs = rec.TargetConfigs || md.targetConfigs;
            if (targetConfigs) {
              let tcStr = String(targetConfigs);
              // Handle potential base64 from Metadata object
              if (!tcStr.includes('<targetConfig') && tcStr.length > 20) {
                try {
                  const decoded = Buffer.from(tcStr, 'base64').toString('utf8');
                  if (decoded.includes('<targetConfig')) {
                    tcStr = decoded;
                  }
                } catch(e) {}
              }
              if (!tcStr.includes('<targetConfigs>')) {
                 generatedXml += `    <targetConfigs>\n${tcStr}\n    </targetConfigs>\n`;
              } else {
                 generatedXml += `    ${tcStr}\n`;
              }
            }
            
            generatedXml += `</LightningComponentBundle>`;
            xml = generatedXml;
          }
        } catch (e) {
          console.error('[salesforce/import] Failed to build XML from bundle', e);
        }
      }

      return NextResponse.json({
        html,
        js,
        css,
        xml,
        hasExtraFiles,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('[salesforce/import]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
