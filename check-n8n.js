const fs = require('fs');
const http = require('http');
const { DatabaseSync } = require('node:sqlite');

async function main() {
  // Check DB
  const dbPath = '.n8n_demo_runtime/.n8n/database.sqlite';
  console.log('DB exists:', fs.existsSync(dbPath));
  
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db.prepare("SELECT id, name, active FROM workflow_entity").all();
    console.log('Workflows in demo n8n:', rows.length);
    rows.forEach(r => console.log(' ', r.id, r.name, r.active));
  } catch(e) {
    console.log('DB error:', e.message);
  }
  db.close();
  
  // Test webhook
  const body = JSON.stringify({ phone: '919876543210', name: 'Test', text: 'Hello' });
  const req = http.request('http://localhost:5678/webhook/whatsapp-restaurant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Webhook status:', res.statusCode);
      console.log('Webhook response:', d.substring(0, 300));
    });
  });
  req.on('error', (err) => {
    console.log('Webhook check: n8n on port 5678 is not currently listening (' + err.code + ')');
  });
  req.write(body);
  req.end();
}

main().catch(console.error);
