const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('C:/Users/jiten/.n8n/database.sqlite', { readOnly: true });
const row = db.prepare("SELECT id, name, active FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'").get();
console.log(JSON.stringify(row, null, 2));
db.close();
