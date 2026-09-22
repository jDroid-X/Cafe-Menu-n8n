const http = require('http');

// Test n8n execution API
const body = JSON.stringify({
  workflowId: 'USdZGa2vqGuUstP7',
  data: [{
    json: {
      phone: '919876543210',
      name: 'Test Customer',
      text: 'Hello, show me the menu'
    }
  }]
});

const req = http.request('http://localhost:5678/api/v1/executions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', d.substring(0, 500));
  });
});
req.on('error', e => console.log('Error:', e.message));
req.write(body);
req.end();
