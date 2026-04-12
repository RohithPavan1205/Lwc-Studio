const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('salesforce_connections').select('instance_url, preview_page_url').limit(1);
  console.log('With preview_page_url:', { data, error });
  const { data: data2, error: error2 } = await supabase.from('salesforce_connections').select('instance_url').limit(1);
  console.log('Without preview_page_url:', { data: data2, error: error2 });
})();
