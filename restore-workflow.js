const { DatabaseSync } = require('node:sqlite');

console.log('=== Restoring Workflow to Use WhatsApp Trigger ===\n');

const dbPath = 'C:/Users/jiten/.n8n/database.sqlite';
const db = new DatabaseSync(dbPath);

// Read current workflow
const row = db.prepare("SELECT nodes FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
if (!row) {
    console.log('Error: Workflow not found');
    process.exit(1);
}

let nodes = JSON.parse(row.nodes || '[]');
console.log(`Found ${nodes.length} nodes in workflow`);

// Find and fix the trigger node
const triggerNode = nodes.find(n => n.type?.includes('whatsAppTrigger') || n.name?.includes('Trigger'));
console.log('\nTrigger node found:', triggerNode?.name, triggerNode?.type);

// Also check what other nodes we have
console.log('\nAll nodes:');
nodes.forEach((n, i) => {
    const isWebhook = n.type === 'n8n-nodes-base.webhook';
    const isWhatsAppTrigger = n.type === 'n8n-nodes-base.whatsAppTrigger';
    console.log(`  ${i}: ${n.name} [${n.type}] - ${isWebhook ? 'WEBHOOK' : isWhatsAppTrigger ? 'WHATSAPP_TRIGGER' : ''}`);
});

// Check connections
const connRow = db.prepare("SELECT connections FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
const connections = JSON.parse(connRow.connections || '{}');
console.log('\nConnections:', Object.keys(connections).length, 'connections');

// Look for webhook nodes that should be removed
const webhookNodes = nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
console.log(`\nWebhook nodes found: ${webhookNodes.length}`);

if (webhookNodes.length > 0) {
    console.log('\nThese webhook nodes need to be removed:');
    webhookNodes.forEach((n, i) => {
        console.log(`  ${i}: ${n.name} (${n.id})`);
    });
    
    // Remove webhook nodes and fix connections
    nodes = nodes.filter(n => n.type !== 'n8n-nodes-base.webhook');
    
    // Clean up connections
    const newConnections = {};
    Object.entries(connections).forEach(([fromName, conns]) => {
        const fromNode = nodes.find(n => n.name === fromName);
        if (fromNode && fromNode.type !== 'n8n-nodes-base.webhook') {
            newConnections[fromName] = conns;
        }
    });
    
    // Update database
    db.prepare("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = 'USdZGa2vqGuUstP7'")
        .run(JSON.stringify(nodes), JSON.stringify(newConnections));
    
    console.log(`\n✅ Removed ${webhookNodes.length} webhook nodes`);
    console.log(`✅ Remaining ${nodes.length} nodes`);
} else {
    console.log('\nNo webhook nodes found - workflow appears correct');
}

// Verify final state
const updatedRow = db.prepare("SELECT nodes FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
const updatedNodes = JSON.parse(updatedRow.nodes || '[]');
const updatedWebhooks = updatedNodes.filter(n => n.type === 'n8n-nodes-base.webhook');
const updatedWhatsAppTriggers = updatedNodes.filter(n => n.type === 'n8n-nodes-base.whatsAppTrigger');

console.log(`\nFinal state:`);
console.log(`  Total nodes: ${updatedNodes.length}`);
console.log(`  Webhook nodes: ${updatedWebhooks.length}`);
console.log(`  WhatsApp Trigger nodes: ${updatedWhatsAppTriggers.length}`);

db.close();
console.log('\nDone!');
