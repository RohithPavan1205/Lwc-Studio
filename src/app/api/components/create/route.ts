import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Salesforce LWC: letters/numbers only, start with letter (case-insensitive), ≤40 chars
const LWC_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

/**
 * POST /api/components/create
 * Creates a new LWC component with full metadata.
 * Accepts pre-generated boilerplate from the client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      masterLabel,
      isExposed = true,
      includeCss = true,
      targets = ['lightning__AppPage'],
      apiVersion = '62.0',
      description = '',
      // Pre-generated boilerplate from client
      htmlContent,
      jsContent,
      cssContent,
      metaXml,
    } = body as {
      name: string;
      masterLabel?: string;
      isExposed?: boolean;
      includeCss?: boolean;
      targets?: string[];
      apiVersion?: string;
      description?: string;
      htmlContent?: string;
      jsContent?: string;
      cssContent?: string | null;
      metaXml?: string;
    };

    // ── Validate name ─────────────────────────────────────────────────────────
    if (!name) {
      return NextResponse.json({ error: 'Component name is required' }, { status: 400 });
    }
    if (name.length > 40) {
      return NextResponse.json(
        { error: 'Name must be 40 characters or less (Salesforce limit)' },
        { status: 400 }
      );
    }
    if (!LWC_NAME_REGEX.test(name)) {
      return NextResponse.json(
        {
          error:
            'Invalid component name. Must start with a letter and contain only letters and numbers.',
        },
        { status: 400 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // ── Duplicate check ────────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('components')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `A component named "${name}" already exists` },
        { status: 409 }
      );
    }

    // ── Boilerplate fallback (if client didn't provide) ────────────────────────
    const baseClassName = name.charAt(0).toUpperCase() + name.slice(1);

    const finalHtml =
      htmlContent ??
      `<template>\n  <div class="container">\n    <h1>{componentTitle}</h1>\n  </div>\n</template>`;

    const finalJs =
      jsContent ??
      `import { LightningElement } from 'lwc';\n\nexport default class ${baseClassName} extends LightningElement {\n  componentTitle = '${name}';\n}`;

    // CSS is null/empty if includeCss is false
    const finalCss = includeCss ? (cssContent ?? `.container {\n  padding: 1rem;\n}`) : null;

    // Master label fallback: insert spaces before uppercase letters
    const finalMasterLabel =
      masterLabel ||
      name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c: string) => c.toUpperCase());

    // ── Insert into Supabase ───────────────────────────────────────────────────
    const now = new Date().toISOString();

    // Build the insert payload — include new columns; they'll be silently ignored
    // if the migration hasn't run yet (Supabase won't error, just won't persist them)
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      name,
      html_content: finalHtml,
      js_content: finalJs,
      css_content: finalCss,
      created_at: now,
      updated_at: now,
      // New LWC Studio metadata columns
      master_label: finalMasterLabel,
      is_exposed: isExposed,
      targets: targets, // stored as jsonb array
      api_version: apiVersion,
      description: description || null,
      include_css: includeCss,
      meta_xml: metaXml ?? null,
    };

    const { data: component, error: insertError } = await supabase
      .from('components')
      .insert(insertPayload)
      .select('id, name, created_at, updated_at')
      .single();

    if (insertError) {
      // If it's an unknown column error (migration not applied yet), retry without new columns
      if (
        insertError.code === '42703' || // undefined_column in Postgres
        insertError.message?.includes('column') ||
        insertError.message?.includes('does not exist')
      ) {
        // New columns not found — retrying without metadata columns
        const { data: fallbackComponent, error: fallbackError } = await supabase
          .from('components')
          .insert({
            user_id: user.id,
            name,
            html_content: finalHtml,
            js_content: finalJs,
            css_content: finalCss,
            created_at: now,
            updated_at: now,
          })
          .select('id, name, created_at, updated_at')
          .single();

        if (fallbackError || !fallbackComponent) {
          return NextResponse.json({ error: 'Failed to create component' }, { status: 500 });
        }

        return NextResponse.json({ success: true, component: fallbackComponent }, { status: 201 });
      }

      return NextResponse.json({ error: 'Failed to create component' }, { status: 500 });
    }

    if (!component) {
      return NextResponse.json({ error: 'Failed to create component' }, { status: 500 });
    }

    return NextResponse.json({ success: true, component }, { status: 201 });
  } catch (err: unknown) {
    void err;
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
