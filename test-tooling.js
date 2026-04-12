const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

function decryptToken(encryptedBase64) {
  try {
    const encryptedText = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedData = Buffer.from(parts.join(':'), 'hex');
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!', 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) { return null; }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users } = await supabase.from('salesforce_connections').select('*');
  const conn = users[0];
  const token = decryptToken(conn.access_token);
  
  const query = "SELECT MasterLabel, Metadata FROM LightningComponentBundle LIMIT 1";
  const url = `${conn.instance_url}/services/data/v60.0/tooling/query/?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log(JSON.stringify(data.records[0].Metadata, null, 2));
}

run().catch(console.error);
