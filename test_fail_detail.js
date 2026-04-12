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
  if (!users) return;
  const conn = users[0];

  const statusSoap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header><met:SessionHeader><met:sessionId>${conn.access_token}</met:sessionId></met:SessionHeader></soapenv:Header>
  <soapenv:Body>
    <met:checkDeployStatus>
      <met:asyncProcessId>0Afg5000006E9PlCAK</met:asyncProcessId>
      <met:includeDetails>true</met:includeDetails>
    </met:checkDeployStatus>
  </soapenv:Body>
</soapenv:Envelope>`;
  const statusRes = await fetch(`${conn.instance_url}/services/Soap/m/58.0`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', SOAPAction: 'checkDeployStatus' },
    body: statusSoap,
  });
  console.log(await statusRes.text());
}
run();
