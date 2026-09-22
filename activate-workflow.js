const { DatabaseSync } = require('node:sqlite');
const dbPath = 'C:/Users/jiten/.n8n/database.sqlite';
const db = new DatabaseSync(dbPath);

// Activate the workflow
db.prepare("UPDATE workflow_entity SET active = 1 WHERE id = 'USdZGa2vqGuUstP7'").run();

// Verify
const row = db.prepare("SELECT id, name, active FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
console.log('Workflow activated:', row.id, row.name, 'active:', row.active);

db.close();
console.log('Done');
