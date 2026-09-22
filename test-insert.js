const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = '.n8n_demo_runtime/.n8n/database.sqlite';
const wfData = JSON.parse(fs.readFileSync('n8n/restaurant_workflow.json', 'utf8'));
const workflowId = 'demo_test_' + Date.now();
const now = new Date().toISOString();
const versionId = 'v' + Date.now();

console.log('DB exists:', fs.existsSync(dbPath));
console.log('Workflow nodes:', (wfData.nodes || []).length);

const db = new DatabaseSync(dbPath);
db.prepare("DELETE FROM workflow_entity WHERE id LIKE 'demo_%'").run();

// Corrected: 9 placeholders (?) for 9 bind values
const sql = `INSERT INTO workflow_entity 
  (id, name, active, nodes, connections, settings, staticData, pinData,
   versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
   isArchived, versionCounter, description, activeVersionId, nodeGroups, sourceWorkflowId)
VALUES (?, ?, 1, ?, ?, ?, NULL, NULL, ?, 0, ?, NULL, ?, ?, 0, 1, NULL, NULL, '[]', NULL)`;

try {
  db.prepare(sql).run(
    workflowId,                                       // 1: id
    wfData.name,                                      // 2: name
    JSON.stringify(wfData.nodes || []),               // 3: nodes
    JSON.stringify(wfData.connections || {}),          // 4: connections
    JSON.stringify(wfData.settings || {}),             // 5: settings
    versionId,                                         // 6: versionId
    '{}',                                              // 7: meta
    now,                                               // 8: createdAt
    now                                                // 9: updatedAt
  );
  
  const rows = db.prepare("SELECT id, name, active FROM workflow_entity WHERE id LIKE 'demo_%'").all();
  console.log('Inserted:', rows.length, 'rows');
  rows.forEach(r => console.log(' ', r.id, r.name, r.active));
} catch(e) {
  console.log('ERROR:', e.message);
  console.log('SQL:', sql);
}

db.close();
console.log('Done');

