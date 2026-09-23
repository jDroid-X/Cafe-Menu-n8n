const http = require('http');

console.log('=== Testing WhatsApp → n8n Integration ===\n');

// Test 1: Check if backend/n8n is running
console.log('1. Checking if server is running on port 3585...');
http.get('http://localhost:3585/api/health', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('   Status:', res.statusCode, '- Server is', res.statusCode === 200 ? 'RUNNING' : 'NOT RUNNING');
        
        // Test 2: Try executing the workflow via API
        console.log('\n2. Testing workflow execution via API...');
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
        
        const startReq = http.request('http://localhost:3585/api/runtime/n8n/start', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (execRes) => {
            let execData = '';
            execRes.on('data', c => execData += c);
            execRes.on('end', () => {
                console.log('   Execution API Status:', execRes.statusCode);
                console.log('   Response:', execData.substring(0, 300));
                
                // Test 3: Check simulator status
                console.log('\n3. Checking simulator API...');
                http.get('http://localhost:3585/api/runtime/n8n/status', (simRes) => {
                    let simData = '';
                    simRes.on('data', c => simData += c);
                    simRes.on('end', () => {
                        const status = JSON.parse(simData);
                        console.log('   Simulator n8n status:', JSON.stringify(status.data, null, 2));
                    });
                }).on('error', e => console.log('   Simulator error:', e.message));
            });
        });
        startReq.on('error', e => console.log('   Execution API error:', e.message));
        startReq.write(body);
        startReq.end();
    });
}).on('error', e => console.log('   Connection error:', e.message));
