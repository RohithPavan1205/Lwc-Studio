import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/components/bootstrap
 * Ensures the authenticated user has at least one component to work with.
 * Returns an existing component or creates a new starter "Hello World" one.
 * Components are now owned directly by user_id — no projects layer.
 */
export async function POST() {
  try {
    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if the user already has a hello-world starter component
    const { data: existingComponent } = await supabase
      .from('components')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('name', 'helloWorldStarter')
      .maybeSingle();

    if (existingComponent) {
      return NextResponse.json({
        success: true,
        componentId: existingComponent.id,
        message: 'Loaded existing starter component',
      });
    }

    // Create a starter component directly under this user
    const { data: component, error: compError } = await supabase
      .from('components')
      .insert({
        user_id: user.id,
        name: 'helloWorldStarter',
        html_content:
          '<template>\n    <div class="slds-box slds-theme_default">\n        <h1 class="slds-text-heading_medium">{title}</h1>\n        <p>Welcome to LWC Studio!</p>\n    </div>\n</template>',
        js_content:
          "import { LightningElement, api } from 'lwc';\n\nexport default class HelloWorldStarter extends LightningElement {\n    @api title = 'Hello World';\n}",
        css_content:
          ':host {\n    display: block;\n}\n.slds-box {\n    padding: 16px;\n}',
      })
      .select('id')
      .single();

    if (compError || !component) {
      console.error('[bootstrap] Component creation error:', compError);
      return NextResponse.json({ error: 'Component creation failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      componentId: component.id,
      message: 'Created starter component',
    });
  } catch (err) {
    console.error('[bootstrap] Crash:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
