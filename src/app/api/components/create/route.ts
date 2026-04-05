import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return NextResponse.json({ error: 'Invalid component name' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) throw new Error('Supabase Error');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure we have a project
    let { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    let project = projects?.[0];

    if (!project) {
       const { data: newProject } = await supabase.from('projects').insert({ name: 'Default Project', user_id: user.id }).select().single();
       project = newProject;
    }

    if (!project) return NextResponse.json({ error: 'Project evaluation failed' }, { status: 500 });

    // Default LWC Boilerplate
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`;

    const htmlContent = `<template>
    <lightning-card title="${name}">
        <div class="slds-p-around_medium">
            <h1 class="slds-text-heading_small">Welcome to LWC Studio</h1>
            <p>Your new playground is ready!</p>
        </div>
    </lightning-card>
</template>`;
    
    // Capitalize first letter
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const jsContent = `import { LightningElement } from 'lwc';

export default class ${className} extends LightningElement {
    
}`;
    const cssContent = `:host {
    display: block;
    --sds-c-card-color-background: #1e1e1e;
    --sds-c-card-text-color: #ffffff;
}`;

    const { data: component, error: compError } = await supabase.from('components').insert({
        project_id: project.id,
        name,
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent,
        xml_content: xmlContent
      }).select().single();

    if (compError) throw compError;

    // Snapshot version
    await supabase.from('versions').insert({
        component_id: component.id,
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent,
        xml_content: xmlContent
    });

    return NextResponse.json({ success: true, id: component.id });

  } catch (err: unknown) {
    console.error('Create crash:', err);
    return NextResponse.json({ error: 'Server Crash', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
