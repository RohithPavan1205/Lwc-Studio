import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST (request: Request) {
  try {
    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure we have at least one project for this user
    let { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    let project = projects?.[0];

    if (!project) {
       const { data: newProject, error: projectError } = await supabase
         .from('projects')
         .insert({ name: 'Default Project', user_id: user.id })
         .select()
         .single();
       
       if (projectError) return NextResponse.json({ error: 'Project creation failed' }, { status: 500 });
       project = newProject;
    }

    if (!project) return NextResponse.json({ error: 'Project data missing' }, { status: 500 });

    // Check if test component already exists in ANY of user's projects
    const { data: existingComponent } = await supabase
      .from('components')
      .select('id, name')
      .eq('name', 'helloWorldTester')
      .in('project_id', (await supabase.from('projects').select('id').eq('user_id', user.id)).data?.map(p => p.id) || [])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingComponent) {
      return NextResponse.json({ 
        success: true, 
        componentId: existingComponent.id,
        message: 'Loaded existing test component'
      });
    }

    // Create the test component only if it doesn't exist
    const { data: component, error: compError } = await supabase
      .from('components')
      .insert({
        project_id: project.id,
        name: 'helloWorldTester',
        html_content: '<template>\n    <div class="slds-box slds-theme_default">\n        <h1 class="slds-text-heading_medium">{title}</h1>\n    </div>\n</template>',
        js_content: "import { LightningElement, api } from 'lwc';\n\nexport default class MyComp extends LightningElement {\n    @api title = 'Hello World';\n}",
        css_content: ".slds-box {\n    padding: 16px;\n    background-color: #1e1e1e;\n    color: white;\n    border-radius: 8px;\n}"
      })
      .select()
      .single();

    if (compError || !component) {
      console.error('Component creation error:', compError);
      return NextResponse.json({ error: 'Component creation failed' }, { status: 500 });
    }

    return NextResponse.json({ 
       success: true, 
       componentId: component.id,
       message: 'Newly seeded test component'
    });

  } catch (err) {
    console.error('Seed crash:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
