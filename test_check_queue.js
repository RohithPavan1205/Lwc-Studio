const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...vals] = line.split('=');
    process.env[key.trim()] = vals.join('=').trim();
  }
});

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: users } = await supabase.from('salesforce_connections').select('*').limit(1);
  if (!users || users.length === 0) { console.log('No connected orgs'); return; }
  const conn = users[0];

  const soql = encodeURIComponent("SELECT Id, Status, StartDate, CompletedDate FROM DeployRequest ORDER BY StartDate DESC LIMIT 5");
  const res = await fetch(`${conn.instance_url}/services/data/v58.0/tooling/query?q=${soql}`, {
    headers: { 'Authorization': `Bearer ${conn.access_token}` },
  });
  const data = await res.json();
  console.log("Recent deployments:", JSON.stringify(data, null, 2));
}
run();
