// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Brand: jDroid-X- CafeMenu
// Automated Test Suite: Verification of Rules 1-6 & Enterprise Features
// ==========================================================

const assert = require('node:assert');
const DatabaseService = require('../src/database/db');
const DatabaseSeeder = require('../src/database/seed');
const RestaurantModel = require('../src/models/RestaurantModel');
const MenuModel = require('../src/models/MenuModel');
const FAQModel = require('../src/models/FAQModel');
const OrderModel = require('../src/models/OrderModel');
const ConfigModel = require('../src/models/ConfigModel');
const SimulatorService = require('../src/services/SimulatorService');
const N8nManager = require('../src/runtime/N8nManager');

async function runTests() {
    console.log(`
==========================================================
🧪 STARTING ACCEPTANCE TEST SUITE - jDroid-X- CafeMenu
==========================================================
    `);

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ [FAIL] ${name}:`, err.message);
            failed++;
        }
    }

    // Force seed database to fresh state
    DatabaseSeeder.seedAll(true);

    const simulator = new SimulatorService();
    const menuModel = new MenuModel();
    const faqModel = new FAQModel();
    const orderModel = new OrderModel();
    const restModel = new RestaurantModel();
    const configModel = new ConfigModel();
    const n8nManager = N8nManager.getInstance();

    // T01: Startup Isolation & Brand Initializer
    await test('T01: jDroid-X- CafeMenu DB & Brand Initialization', async () => {
        const rest = restModel.getConfig();
        assert.ok(rest, 'Restaurant config must exist');
        assert.strictEqual(rest.restaurant_name, 'jDroid-X- CafeMenu');
    });

    // T02: Configuration Save
    await test('T02: Profile Configuration Persistence', async () => {
        const updated = restModel.updateConfig({ restaurant_name: 'jDroid-X- CafeMenu Express' });
        assert.strictEqual(updated.restaurant_name, 'jDroid-X- CafeMenu Express');
        // Restore
        restModel.updateConfig({ restaurant_name: 'jDroid-X- CafeMenu' });
    });

    // T03: Rule 1: First Message Greeting with Options (Image 1)
    await test('T03: Rule 1 Greeting ("Hi" with order/FAQ/stock options)', async () => {
        const res = await simulator.processMessage({ text: 'Hi' });
        assert.strictEqual(res.agentDecision, 'RULE_1_GREETING');
        assert.ok(res.reply.includes('Welcome to *jDroid-X- CafeMenu*'), 'Must welcome to jDroid-X- CafeMenu');
        assert.ok(res.reply.includes('Place an order'), 'Must include Place an order option');
        assert.ok(res.reply.includes('FAQ / Information'), 'Must include FAQ option');
        assert.ok(res.reply.includes('Check order / stock'), 'Must include Check order / stock option');
    });

    // T04: FAQ Query (Image 1 Rule 3)
    await test('T04: Rule 3 FAQ Lookup ("What are your opening hours?")', async () => {
        const res = await simulator.processMessage({ text: 'What are your opening hours?' });
        assert.strictEqual(res.agentDecision, 'FAQ_LOOKUP');
        assert.ok(res.reply.includes('9:00 AM to 11:00 PM'), 'FAQ answer must reflect configured timing');
    });

    // T05: Order Missing Quantity (Image 1 Rule 2)
    await test('T05: Rule 2 Order Missing Quantity ("I want Vada Pav")', async () => {
        const res = await simulator.processMessage({ text: 'I want Vada Pav' });
        assert.strictEqual(res.agentDecision, 'ORDER_MISSING_QUANTITY');
        assert.ok(res.reply.toLowerCase().includes('how many'), 'Agent must ask for missing quantity');
    });

    // T06: Order Complete (Image 1 Rule 2)
    await test('T06: Rule 2 Complete Order Capture ("MBS Coding, two Vada Pav")', async () => {
        const res = await simulator.processMessage({ text: 'MBS Coding, two Vada Pav' });
        assert.strictEqual(res.agentDecision, 'ORDER_CONFIRMED_AND_SAVED');
        assert.ok(res.reply.includes('is confirmed ✅'), 'Order confirmation must match Image 1 Rule 2');
        assert.ok(res.toolsCalled.includes('Post Orders'), 'Post Orders tool must be called');

        // Verify order in database
        const orders = orderModel.getAll({ customerName: 'MBS Coding' });
        assert.ok(orders.length > 0, 'Order must be persisted in SQLite table');
        assert.strictEqual(orders[0].quantity, 2);
        assert.strictEqual(orders[0].description, 'Order accepted (item available)');
    });

    // T07: Out-of-Stock Item Rejection (Image 1 Rule 2)
    await test('T07: Rule 2 Out-of-Stock Rejection ("I want Paneer Tikka Pav")', async () => {
        const res = await simulator.processMessage({ text: 'I want 2 Paneer Tikka Pav' });
        assert.strictEqual(res.agentDecision, 'ITEM_OUT_OF_STOCK_REFUSED');
        assert.ok(res.reply.includes('is out of stock ❌'), 'Must output exact out of stock message from Image 1');
        assert.ok(res.reply.includes('Available options:'), 'Must list available options');
    });

    // T08: Rule 4 Check Stock Inquiry (Image 1)
    await test('T08: Rule 4 Check Stock ("Check stock Vada Pav")', async () => {
        const res = await simulator.processMessage({ text: 'Check stock Vada Pav' });
        assert.strictEqual(res.agentDecision, 'CHECK_STOCK_ITEM_FOUND');
        assert.ok(res.reply.includes('Vada Pav'), 'Stock check must mention item');
        assert.ok(res.reply.includes('available at *₹30* ✅'), 'Stock check must report quantity and price');
    });

    // T09: Rule 4 Check Order Status (Image 1)
    await test('T09: Rule 4 Check Order ("Check order ORD-882101")', async () => {
        const res = await simulator.processMessage({ text: 'Check order ORD-882101' });
        assert.strictEqual(res.agentDecision, 'CHECK_ORDER_FOUND');
        assert.ok(res.reply.includes('ORD-882101'), 'Must identify order code');
        assert.ok(res.reply.includes('Delivered'), 'Must report order status');
    });

    // T10: Rule 5 Cancel Order Polite Refusal (Image 1 & 2)
    await test('T10: Rule 5 Cancel Order Policy ("I want to cancel my order")', async () => {
        const res = await simulator.processMessage({ text: 'I want to cancel my order' });
        assert.strictEqual(res.agentDecision, 'CANCEL_ORDER_REFUSED');
        assert.ok(res.reply.includes('Sorry 🙏 I cannot cancel orders directly'), 'Must output polite refusal verbatim from Image 1 & 2');
        assert.ok(res.reply.includes('Please call the restaurant owner first'), 'Must direct customer to owner');
        assert.ok(res.reply.includes('Owner Contact: +95 1224567890'), 'Must provide owner contact');
    });

    // T11: Conversation Context Memory
    await test('T11: Multi-Turn Context Memory', async () => {
        const sessionKey = 'test_session_user_88';
        await simulator.processMessage({ text: 'Hi, my name is Priya Sharma', phone: sessionKey });
        const res = await simulator.processMessage({ text: 'I want two Misal Pav', phone: sessionKey });
        assert.strictEqual(res.agentDecision, 'ORDER_CONFIRMED_AND_SAVED');
        assert.ok(res.reply.includes('Priya Sharma'), 'Agent must remember customer name from session context');
    });

    // T12: Simulated Inventory & LLM Failures
    await test('T12: Simulated Failures Graceful Contingency', async () => {
        simulator.setSimulationFlags({ inventoryFailure: true });
        const invRes = await simulator.processMessage({ text: 'Check stock Vada Pav' });
        assert.strictEqual(invRes.agentDecision, 'CHECK_STOCK_OUT_OF_STOCK');
        simulator.setSimulationFlags({ inventoryFailure: false, llmFailure: true });

        const llmRes = await simulator.processMessage({ text: 'Hello' });
        assert.strictEqual(llmRes.agentDecision, 'SIMULATED_LLM_FAILURE');
        simulator.setSimulationFlags({ llmFailure: false });
    });

    // T13: CFO Financial Analytics Engine
    await test('T13: CFO Analytics Calculations', async () => {
        const analytics = orderModel.getCFOAnalytics();
        assert.ok(analytics.totalRevenue > 0, 'Total Revenue must be positive');
        assert.ok(analytics.totalOrders >= 4, 'Must have at least 4 sample orders');
        assert.ok(analytics.aov > 0, 'AOV must be calculated');
        assert.ok(analytics.pendingPaymentAmount >= 0, 'Pending receivables must be computed');
    });

    // T14: Bulk Menu Import (bulkUpsert)
    await test('T14: Bulk Menu CSV/JSON Upsert', async () => {
        const newItems = [
            { item_code: 'TEST01', item_name: 'Special Kanda Poha', category: 'Breakfast', price: 40.0, quantity: 20 },
            { item_code: 'TEST02', item_name: 'Jalebi Fafda', category: 'Sweets', price: 80.0, quantity: 15 }
        ];
        const res = menuModel.bulkUpsert(newItems);
        assert.strictEqual(res.total, 2);
        const item1 = menuModel.getByCode('TEST01');
        assert.strictEqual(item1.item_name, 'Special Kanda Poha');
    });

    // T15: Regression & Safety Gate
    await test('T15: Final Regression Verification', async () => {
        const allItems = menuModel.getAll();
        const allFaqs = faqModel.getAll();
        const allOrders = orderModel.getAll();
        assert.ok(allItems.length >= 6);
        assert.ok(allFaqs.length >= 6);
        assert.ok(allOrders.length >= 4);
    });

    // T16: Live Two-Way n8n Workflow Synchronization (USdZGa2vqGuUstP7)
    await test('T16: Live Two-Way n8n Workflow Synchronization', async () => {
        const N8nSyncService = require('../src/services/N8nSyncService');
        const syncService = N8nSyncService.getInstance();
        const status = syncService.syncNow();
        assert.ok(status.synced, 'n8n workflow must be synced');
        assert.strictEqual(status.workflowId, 'USdZGa2vqGuUstP7');
        assert.strictEqual(status.workflowName, 'CafeMenu Whatsapp');
        assert.ok(status.nodeCount >= 7, 'Must have at least 7 active nodes in workflow');
        assert.ok(status.systemMessage.includes('jDroid-X- CafeMenu'), 'System prompt must contain jDroid-X- CafeMenu');
        assert.ok(status.tools.includes('Get Inventory'), 'Must include Get Inventory tool');
    });

    // T17: Multi-Restaurant Dynamic Brand Sync & Push to n8n Canvas
    await test('T17: Multi-Restaurant Dynamic Brand Sync & Push to n8n Canvas', async () => {
        const N8nSyncService = require('../src/services/N8nSyncService');
        const syncService = N8nSyncService.getInstance();

        // 1. Update Brand Name to a new restaurant brand
        const testBrand = 'Royal Bistro Express';
        const testPhone = '+91 9988776655';
        restModel.updateConfig({ restaurant_name: testBrand, contact_number: testPhone });

        // 2. Push to n8n
        const pushResult = await syncService.pushToN8n({
            restaurant_name: testBrand,
            contact_number: testPhone,
            model: 'models/gemini-1.5-flash',
            inventory_sheet: 'Inventory',
            faq_sheet: 'FAQ',
            orders_sheet: 'Orders'
        });
        assert.ok(pushResult.success, 'Push to n8n must succeed');

        // 3. Verify simulator immediately uses the new brand name
        const simRes = await simulator.processMessage({ text: 'Hi', phone: '919876543210' });
        assert.ok(simRes.reply.includes(testBrand), `Greeting must contain updated brand ${testBrand}`);

        // 4. Verify Rule 5 cancellation refusal uses the updated phone number
        const cancelRes = await simulator.processMessage({ text: 'I want to cancel my order', phone: '919876543210' });
        assert.ok(cancelRes.reply.includes(testPhone), `Cancellation must contain updated contact phone ${testPhone}`);

        // 5. Restore default brand
        restModel.updateConfig({ restaurant_name: 'jDroid-X- CafeMenu', contact_number: '+95 1224567890' });
        await syncService.pushToN8n({ restaurant_name: 'jDroid-X- CafeMenu', contact_number: '+95 1224567890' });
    });

    // T18: Comprehensive 5-Node Settings & Force Sync Verification
    await test('T18: Comprehensive 5-Node Settings & Force Sync Verification', async () => {
        const N8nSyncService = require('../src/services/N8nSyncService');
        const syncService = N8nSyncService.getInstance();
        const { DatabaseSync } = require('node:sqlite');

        // 1. Push comprehensive 5-node configuration
        const pushResult = await syncService.pushToN8n({
            restaurant_name: 'jDroid-X- CafeMenu',
            contact_number: '+95 1224567890',
            model: 'models/gemini-1.5-pro',
            temperature: 0.15,
            max_tokens: 600,
            top_p: 0.9,
            top_k: 35,
            gemini_api_key: 'AIzaSyTestKey5NodeVerification12345',
            contextWindowLength: 15,
            session_key: 'customer_session_v1',
            spreadsheet_id: 'restaurant_database_live',
            inventory_sheet: 'Menu_Catalog',
            inventory_range: 'A:H',
            inventory_operation: 'read',
            faq_sheet: 'Knowledge_Base',
            faq_range: 'A:E',
            faq_operation: 'read',
            orders_sheet: 'Live_Orders',
            orders_mapping_mode: 'autoMapInputData',
            orders_operation: 'append',
            sheets_client_id: 'test-oauth-client.apps.googleusercontent.com',
            sheets_client_secret: 'GOCSPX-test-secret-999',
            systemMessage: 'System prompt test for 5 nodes'
        });

        assert.ok(pushResult.success, 'pushToN8n must succeed');
        assert.ok(pushResult.versionCounter > 1, 'Version counter must increment');

        // 2. Read directly from n8n database and verify all 5 nodes
        const db = new DatabaseSync('C:/Users/jiten/.n8n/database.sqlite');
        const row = db.prepare('SELECT nodes FROM workflow_entity WHERE id = ?').get('USdZGa2vqGuUstP7');
        const nodes = JSON.parse(row.nodes);

        // Node 1: Gemini
        const geminiNode = nodes.find(n => n.name?.includes('Gemini') || n.type?.includes('lmChatGoogleGemini'));
        assert.ok(geminiNode, 'Gemini node must exist');
        assert.strictEqual(geminiNode.parameters.modelName, 'models/gemini-1.5-pro');
        assert.strictEqual(geminiNode.parameters.options.temperature, 0.15);
        assert.strictEqual(geminiNode.parameters.options.maxOutputTokens, 600);
        assert.ok(geminiNode.credentials.googlePalmApi, 'Gemini credential must be attached');

        // Node 2: Memory
        const memNode = nodes.find(n => n.name?.includes('Memory') || n.type?.includes('memoryBufferWindow'));
        assert.ok(memNode, 'Memory node must exist');
        assert.strictEqual(memNode.parameters.contextWindowLength, 15);
        assert.strictEqual(memNode.parameters.sessionKey, 'customer_session_v1');

        // Node 3: Inventory
        const invNode = nodes.find(n => n.name === 'Get Inventory' || (n.type === 'n8n-nodes-base.googleSheetsTool' && !n.name?.includes('FAQ') && !n.name?.includes('Order')));
        assert.ok(invNode, 'Get Inventory node must exist');
        assert.ok(invNode.parameters.sheetName?.value, 'Inventory sheet reference must exist');
        assert.strictEqual(invNode.parameters.options.range, 'A:H');
        assert.strictEqual(invNode.parameters.operation, 'read');
        assert.ok(invNode.credentials.googleSheetsOAuth2Api, 'Inventory sheets credential must be attached');

        // Node 4: FAQ
        const faqNode = nodes.find(n => n.name === 'FAQ' || n.name === 'Get FAQ');
        assert.ok(faqNode, 'Get FAQ node must exist');
        assert.ok(faqNode.parameters.sheetName?.value, 'FAQ sheet reference must exist');
        assert.strictEqual(faqNode.parameters.options.range, 'A:E');
        assert.strictEqual(faqNode.parameters.operation, 'read');

        // Node 5: Orders
        const ordersNode = nodes.find(n => n.name === 'Post Orders');
        assert.ok(ordersNode, 'Post Orders node must exist');
        assert.ok(ordersNode.parameters.sheetName?.value, 'Orders sheet reference must exist');
        assert.strictEqual(ordersNode.parameters.columns.mappingMode, 'autoMapInputData');
        assert.strictEqual(ordersNode.parameters.operation, 'append');

        // 3. Verify encrypted credentials in credentials_entity
        const geminiCred = db.prepare('SELECT id, data FROM credentials_entity WHERE id = ?').get('gemini-api-cred-default');
        assert.ok(geminiCred, 'Gemini credential must exist in n8n database');
        assert.ok(geminiCred.data.startsWith('U2FsdGVkX1'), 'Data must be AES-256 encrypted');

        // 4. Restore default node settings
        await syncService.pushToN8n({
            restaurant_name: 'jDroid-X- CafeMenu',
            contact_number: '+95 1224567890',
            model: 'models/gemini-1.5-flash',
            temperature: 0.2,
            max_tokens: 450,
            contextWindowLength: 10,
            session_key: 'chat_history',
            spreadsheet_id: 'restaurant_database',
            inventory_sheet: 'Inventory',
            inventory_range: 'A:G',
            faq_sheet: 'FAQ',
            faq_range: 'A:D',
            orders_sheet: 'Orders',
            orders_mapping_mode: 'autoMapInputData'
        });
    });

    console.log(`
==========================================================
📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED
==========================================================
    `);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test Runner Exception:', err);
    process.exit(1);
});
