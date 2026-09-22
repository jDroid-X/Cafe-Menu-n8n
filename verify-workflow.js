const { DatabaseSync } = require('node:sqlite');

console.log('=== Verifying CafeMenu Workflow ===\n');

const dbPath = 'C:/Users/jiten/.n8n/database.sqlite';
const db = new DatabaseSync(dbPath, { readOnly: true });

// Check workflow status
const row = db.prepare("SELECT id, name, active, nodes, connections FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
if (row) {
    console.log('Workflow ID:', row.id);
    console.log('Name:', row.name);
    console.log('Active:', row.active);
    
    const nodes = JSON.parse(row.nodes || '[]');
    console.log('\nNodes (' + nodes.length + ' total):');
    nodes.forEach((n, i) => {
        console.log(`  ${i}: ${n.name} [${n.type}]`);
        if (n.parameters?.path) console.log(`      Webhook path: ${n.parameters.path}`);
        if (n.parameters?.httpMethod) console.log(`      HTTP method: ${n.parameters.httpMethod}`);
    });
    
    const webhookNodes = nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
    console.log(`\nWebhook nodes: ${webhookNodes.length}`);
    if (webhookNodes.length > 0) {
        console.log('✅ Webhook trigger is configured!');
    } else {
        console.log('❌ No webhook trigger found - you need to add one in n8n UI');
    }
} else {
    console.log('Workflow not found!');
}

db.close();
