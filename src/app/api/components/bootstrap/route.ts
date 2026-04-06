import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST () {
  try {
    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if test component already exists for user
    const { data: existingComponent } = await supabase
      .from('components')
      .select('id, name')
      .eq('name', 'helloWorldTester')
      .eq('user_id', user.id)
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
        user_id: user.id,
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
