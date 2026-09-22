const http = require('http');

async function testIntegration() {
  console.log('=== Testing WhatsApp Simulator → n8n Integration ===\n');
  
  // Step 1: Start n8n
  console.log('Step 1: Starting demo n8n...');
  const startBody = JSON.stringify({});
  const startReq = http.request('http://localhost:3585/api/runtime/n8n/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(startBody) }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      const result = JSON.parse(d);
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        console.error('Failed to start n8n:', result.error);
        return;
      }
      
      // Step 2: Wait for n8n to be ready
      console.log('\nStep 2: Waiting for n8n to be ready...');
      await new Promise(r => setTimeout(r, 35000));
      
      // Check status
      http.get('http://localhost:3585/api/health', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const health = JSON.parse(d);
          console.log('Health check:', JSON.stringify(health.n8nRuntime, null, 2));
          
          // Step 3: Test webhook directly
          console.log('\nStep 3: Testing webhook directly...');
          const body = JSON.stringify({ phone: '919876543210', name: 'Test', text: 'Hello' });
          const req = http.request('http://localhost:' + health.n8nRuntime.configuredPort + '/webhook/whatsapp-restaurant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
              console.log('Direct webhook status:', res.statusCode);
              console.log('Response:', d.substring(0, 300));
              
              // Step 4: Test via simulator
              console.log('\nStep 4: Testing via simulator...');
              const chatBody = JSON.stringify({ text: 'Hello, what do you have?', phone: '919876543210', name: 'Demo Customer' });
              const chatReq = http.request('http://localhost:3585/api/test/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(chatBody) }
              }, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                  const chatResult = JSON.parse(d);
                  console.log('Decision:', chatResult.data.agentDecision);
                  console.log('Reply preview:', chatResult.data.reply ? chatResult.data.reply.substring(0, 200) + '...' : 'none');
                });
              });
              chatReq.write(chatBody);
              chatReq.end();
            });
          });
          req.write(body);
          req.end();
        });
      });
    });
  });
  startReq.write(startBody);
  startReq.end();
}

testIntegration().catch(console.error);
