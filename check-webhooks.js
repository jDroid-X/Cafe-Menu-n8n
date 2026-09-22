const { DatabaseSync } = require('node:sqlite');
const dbPath = 'C:/Users/jiten/.n8n/database.sqlite';
const db = new DatabaseSync(dbPath, { readOnly: true });

// Check webhook entities
try {
  const rows = db.prepare("SELECT * FROM webhook_entity").all();
  console.log('Webhooks:', rows.length);
  rows.forEach(r => console.log(' ', r.id, r.path, r.workflowId));
} catch(e) {
  console.log('No webhook_entity table or error:', e.message);
}

// Check if workflow has webhook data
const row = db.prepare("SELECT nodes FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
if (row && row.nodes) {
  const nodes = JSON.parse(row.nodes);
  const webhookNodes = nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
  console.log('\nWebhook nodes:', webhookNodes.length);
  webhookNodes.forEach(n => {
    console.log('  Name:', n.name);
    console.log('  Path:', n.parameters?.path);
    console.log('  Method:', n.parameters?.httpMethod);
  });
}

db.close();
