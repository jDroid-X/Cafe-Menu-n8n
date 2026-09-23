import sqlite3
import json

db_path = r'C:\Users\jiten\.n8n\database.sqlite'
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('PRAGMA foreign_keys = OFF;')

c.execute("SELECT nodes, activeVersionId FROM workflow_entity WHERE id = 'USdZGa2vqGuUstP7'")
row = c.fetchone()
if not row:
    print('Workflow not found!')
    exit(1)

nodes = json.loads(row[0])
version_id = row[1]

for node in nodes:
    if node['name'] == 'Input Msg':
        node['parameters']['jsCode'] = """const item = $input.item.json;
const body = item.body || item;
const rawMsg = body.message || body.chatInput || body.text || item.chatInput || item.message || 'Hello';
const sender = String(body.senderId || item.senderId || (item.chatInput ? '0000000000' : '1111111111'));
const session = String(body.sessionId || item.sessionId || sender);

return {
  json: {
    ...item,
    chatInput: rawMsg,
    input: rawMsg,
    message: rawMsg,
    senderId: sender,
    sessionId: session
  }
};
"""
    elif node['name'] == 'Output Msg':
        node['parameters']['jsCode'] = """const items = $input.all();
return items.map(it => {
  const reply = it.json.output || it.json.text || it.json.message || '';
  return {
    json: {
      reply: reply,
      output: reply,
      status: 'success',
      senderId: it.json.senderId || '1111111111',
      model: 'models/gemini-2.5-flash',
      n8nWorkflowActive: true,
      geminiModelActive: true,
      runtimeStatus: 'ONLINE_LIVE',
      timestamp: new Date().toISOString()
    }
  };
});
"""
    elif node['name'] == 'Google Gemini Chat Model1':
        node['parameters']['modelName'] = 'models/gemini-2.5-flash'

nodes_str = json.dumps(nodes)
c.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'USdZGa2vqGuUstP7'", (nodes_str,))
c.execute("UPDATE workflow_history SET nodes = ? WHERE workflowId = 'USdZGa2vqGuUstP7' AND versionId = ?", (nodes_str, version_id))
conn.commit()
conn.close()
print("SUCCESS: Updated Gemini model to models/gemini-2.5-flash")
