export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { createClient } from '@/utils/supabase/server';

// Simple in-memory cache
const cache = new Map<string, { data: unknown, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(_request: Request) {
  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache
    const cachedEntry = cache.get(user.id);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(`[SF Org Sync] Returning cached components for user ${user.id}`);
      return NextResponse.json({ components: cachedEntry.data });
    }

    const { data: connection } = await supabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', user.id)
      .single();

    if (!connection || !connection.instance_url) {
      return NextResponse.json({ error: 'Organization not connected' }, { status: 400 });
    }

    const token = await checkAndRefreshToken(user.id);
    if (!token) {
      return NextResponse.json({ error: 'Failed to authenticate with Salesforce' }, { status: 401 });
    }

    const instanceUrl = connection.instance_url;

    // Fetch custom components from Salesforce Tooling API
    console.log('[SF Org Sync] Fetching component bundles...');
    const listQuery = encodeURIComponent(`SELECT Id, DeveloperName, Description, LastModifiedDate FROM LightningComponentBundle WHERE NamespacePrefix = null ORDER BY LastModifiedDate DESC`);
    
    const bundleRes = await fetch(`${instanceUrl}/services/data/v58.0/tooling/query?q=${listQuery}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!bundleRes.ok) {
        const errorData = await bundleRes.json();
        console.error("[SF Org Sync] Bundle fetching error:", errorData);
        return NextResponse.json({ error: "Failed to fetch bundles from Salesforce" }, { status: 500 });
    }

    const bundleData = await bundleRes.json();
    const bundles = bundleData.records || [];
    console.log(`[SF Org Sync] Found ${bundles.length} components. Fetching sources...`);

    // Fetch resources for each bundle
    // We use Promise.all to fetch them in parallel for speed.
    const components = await Promise.all(bundles.map(async (bundle: { Id: string, DeveloperName: string, Description?: string, LastModifiedDate: string }) => {
      const resourceQuery = encodeURIComponent(`SELECT FilePath, Source FROM LightningComponentResource WHERE LightningComponentBundleId = '${bundle.Id}'`);
      
      const res = await fetch(`${instanceUrl}/services/data/v58.0/tooling/query?q=${resourceQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let htmlContent = '';
      let jsContent = '';
      let cssContent = '';

      if (res.ok) {
        const resourceData = await res.json();
        const resources = resourceData.records || [];
        
        for (const file of resources) {
          const path = file.FilePath as string;
          if (path.endsWith('.html')) htmlContent = file.Source || '';
          else if (path.endsWith('.js')) jsContent = file.Source || '';
          else if (path.endsWith('.css')) cssContent = file.Source || '';
        }
      }

      return {
        id: bundle.Id,
        name: bundle.DeveloperName,
        description: bundle.Description || '',
        lastModified: bundle.LastModifiedDate,
        htmlContent,
        jsContent,
        cssContent
      };
    }));

    // Cache the result
    cache.set(user.id, { data: components, timestamp: Date.now() });

    return NextResponse.json({ components });
  } catch (error: unknown) {
    console.error('[SF Org Sync] Error fetching org components:', error);
    const msg = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
