// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Database Seeder - Brand: jDroid-X- CafeMenu
// Rules from Image 1 & 2 and Active n8n on port 5678
// ==========================================================

const DatabaseService = require('./db');

class DatabaseSeeder {
    static seedAll(forceReset = false) {
        const db = DatabaseService.getInstance();

        if (forceReset) {
            db.exec(`
                DELETE FROM orders;
                DELETE FROM conversation_messages;
                DELETE FROM conversation_sessions;
                DELETE FROM menu_items;
                DELETE FROM faq_items;
                DELETE FROM restaurant_config;
                DELETE FROM agent_config;
                DELETE FROM memory_config;
                DELETE FROM integration_config;
                DELETE FROM n8n_config;
                DELETE FROM audit_log;
                DELETE FROM sqlite_sequence WHERE name IN (
                    'orders', 'conversation_messages', 'conversation_sessions',
                    'menu_items', 'faq_items', 'restaurant_config',
                    'agent_config', 'memory_config', 'integration_config',
                    'n8n_config', 'audit_log'
                );
            `);
        }

        // 1. Seed Restaurant Profile (jDroid-X- CafeMenu)
        const restaurantCount = db.queryOne('SELECT COUNT(*) as count FROM restaurant_config').count;
        if (restaurantCount === 0) {
            db.run(`
                INSERT INTO restaurant_config (
                    restaurant_name, welcome_message, currency, currency_symbol,
                    timezone, opening_hours, delivery_enabled, contact_number, min_order_amount, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'jDroid-X- CafeMenu',
                'Welcome to jDroid-X- CafeMenu 🍽️\nHow can I help you today?\n- 🛒 Place an order\n- ℹ️ FAQ / Information\n- 📦 Check order / stock',
                'INR',
                '₹',
                'Asia/Kolkata',
                '09:00 AM - 11:00 PM',
                1,
                '+95 1224567890',
                50.0,
                1
            ]);
        }

        // 2. Seed Menu Items
        const menuCount = db.queryOne('SELECT COUNT(*) as count FROM menu_items').count;
        if (menuCount === 0) {
            const items = [
                {
                    code: 'VP01',
                    name: 'Vada Pav',
                    category: 'Snacks',
                    description: 'Mumbai style spicy potato fritter served in fresh pav with sweet and garlic chutney.',
                    price: 30.0,
                    quantity: 45,
                    status: 'AVAILABLE'
                },
                {
                    code: 'MP02',
                    name: 'Misal Pav',
                    category: 'Snacks',
                    description: 'Traditional Kolhapuri spicy sprouted lentil curry topped with farsan, onions, and lemon served with pav.',
                    price: 70.0,
                    quantity: 30,
                    status: 'AVAILABLE'
                },
                {
                    code: 'PT03',
                    name: 'Paneer Tikka Pav',
                    category: 'Snacks',
                    description: 'Char-grilled cottage cheese cubes marinated in tandoori masala inside buttered pav.',
                    price: 90.0,
                    quantity: 0,
                    status: 'OUT_OF_STOCK' // For testing Image 1 Rule 2 out of stock rejection
                },
                {
                    code: 'CB04',
                    name: 'Cutting Chai',
                    category: 'Beverages',
                    description: 'Hot aromatic ginger and cardamom brewed tea.',
                    price: 15.0,
                    quantity: 100,
                    status: 'AVAILABLE'
                },
                {
                    code: 'MS05',
                    name: 'Mango Lassi',
                    category: 'Beverages',
                    description: 'Thick creamy sweetened yogurt shake flavored with Alphonso mango pulp.',
                    price: 50.0,
                    quantity: 0,
                    status: 'OUT_OF_STOCK'
                },
                {
                    code: 'BP06',
                    name: 'Butter Pav Bhaji',
                    category: 'Main Course',
                    description: 'Mashed vegetable curry in rich butter, served with two toasted pavs.',
                    price: 120.0,
                    quantity: 25,
                    status: 'AVAILABLE'
                }
            ];

            for (const item of items) {
                db.run(`
                    INSERT INTO menu_items (item_code, item_name, category, description, price, quantity, status, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                `, [item.code, item.name, item.category, item.description, item.price, item.quantity, item.status]);
            }
        }

        // 3. Seed FAQs (Expanded based on Image 1 & 2)
        const faqCount = db.queryOne('SELECT COUNT(*) as count FROM faq_items').count;
        if (faqCount === 0) {
            const faqs = [
                {
                    category: 'Timing',
                    question: 'What are your opening hours?',
                    answer: 'jDroid-X- CafeMenu is open daily from 9:00 AM to 11:00 PM, Monday through Sunday.'
                },
                {
                    category: 'Delivery',
                    question: 'Do you offer home delivery and what is the delivery time?',
                    answer: 'Yes, we provide home delivery within a 5 km radius in 30 to 45 minutes. Free delivery on orders above ₹150.'
                },
                {
                    category: 'Payment',
                    question: 'What payment methods do you accept?',
                    answer: 'We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm), and major cards on delivery.'
                },
                {
                    category: 'Order Status',
                    question: 'How do I check my order status?',
                    answer: 'You can check your order by asking "check order" followed by your order ID or customer name.'
                },
                {
                    category: 'Cancellation',
                    question: 'Can I cancel my order?',
                    answer: 'Orders cannot be cancelled directly via chat. Please call the restaurant owner directly at +95 1224567890 to request cancellation.'
                },
                {
                    category: 'Stock',
                    question: 'How do I check food availability or stock?',
                    answer: 'Simply ask "check stock [food item]" or "what is available" to see our fresh menu items.'
                },
                {
                    category: 'Vegetarian',
                    question: 'Is all food vegetarian?',
                    answer: 'Yes! jDroid-X- CafeMenu is 100% pure vegetarian with dedicated Jain options.'
                }
            ];

            for (const f of faqs) {
                db.run(`
                    INSERT INTO faq_items (category, question, answer, active)
                    VALUES (?, ?, ?, 1)
                `, [f.category, f.question, f.answer]);
            }
        }

        // 4. Seed AI Agent Configuration (Rules verbatim from Image 1 & 2)
        const agentCount = db.queryOne('SELECT COUNT(*) as count FROM agent_config').count;
        if (agentCount === 0) {
            db.run(`
                INSERT INTO agent_config (
                    identity_prompt, restaurant_rules, order_rules, inventory_rules, faq_rules,
                    response_style, response_language, temperature, max_tokens, fallback_message, enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                'You are a smart food ordering assistant for "jDroid-X- CafeMenu".',
                '1. When a user sends their first message (like hi, hello), reply with:\n"Welcome to jDroid-X- CafeMenu 🍽️\nHow can I help you today?\n- 🛒 Place an order\n- ℹ️ FAQ / Information\n- 📦 Check order / stock"\n(👉 Keep the tone friendly like a food delivery app, not like a product e-commerce site)',
                '2. If user wants *order*:\n- Ask step by step: name, food item, quantity\n- Check Inventory sheet before confirming\n  - If available -> "Your order for *[item]* (x quantity) is confirmed ✅"\n  - If not available -> "Sorry, *[item]* is out of stock ❌. Available options: [list items]"\n- Only confirmed orders go into the Orders sheet\n- In Orders sheet always include:\n  Status = Confirmed / Rejected\n  Description = "Order accepted (item available)" OR "Order rejected (out of stock)"',
                '4. If user wants *check order* or *check stock*:\n- Ask for food name or order id\n- Look up in database/sheets (Orders / Inventory)\n  - If checking order -> reply with status (Confirmed / Rejected / Cancelled / Delivered / In Progress)\n  - If checking stock -> reply with available quantity of that food\n  - Also list all *available* food items with quantity if requested',
                '3. If user wants *FAQ*:\n- Answer short and clear (delivery time, payment method, restaurant hours)\n5. If user wants *cancel order*:\n- Reply politely: "Sorry 🙏 I cannot cancel orders directly. Please call the restaurant owner first and inform them. Owner Contact: +95 1224567890"',
                '6. Always reply in short text like a normal WhatsApp chat. Do not use **bold** or long paragraphs. Use *stars* only for highlighting words. Keep tone friendly, polite, and food-delivery app style.',
                'English',
                0.2,
                450,
                'Sorry 🙏 Please call our restaurant owner at +95 1224567890 for immediate assistance.'
            ]);
        }

        // 5. Seed Memory Configuration
        const memoryCount = db.queryOne('SELECT COUNT(*) as count FROM memory_config').count;
        if (memoryCount === 0) {
            db.run(`
                INSERT INTO memory_config (enabled, memory_type, max_messages, session_key_expression, expiry_minutes)
                VALUES (1, 'WINDOW_BUFFER', 10, 'sender_phone', 60)
            `);
        }

        // 6. Seed Integration Configuration
        const intCount = db.queryOne('SELECT COUNT(*) as count FROM integration_config').count;
        if (intCount === 0) {
            db.run(`
                INSERT INTO integration_config (provider, mode, endpoint, credential_reference, config_json, enabled, status)
                VALUES 
                ('WHATSAPP', 'MOCK', 'https://graph.facebook.com/v19.0', 'ENV:WHATSAPP_TOKEN', '{"app_id":"demo_app_123","phone_number_id":"demo_phone_456","verify_token":"demo_verify_token"}', 1, 'READY'),
                ('GOOGLE_SHEETS', 'LOCAL', 'https://sheets.googleapis.com/v4/spreadsheets', 'ENV:GOOGLE_OAUTH', '{"spreadsheet_name":"Food Delivery System","inventory_sheet":"Inventory","orders_sheet":"Orders","faq_sheet":"FAQ"}', 1, 'READY'),
                ('LLM', 'MOCK', 'https://generativelanguage.googleapis.com', 'ENV:GEMINI_API_KEY', '{"model":"gemini-1.5-flash","temperature":0.2}', 1, 'READY')
            `);
        }

        // 7. Seed n8n Configuration (Active on Port 5678 as requested)
        const n8nCount = db.queryOne('SELECT COUNT(*) as count FROM n8n_config').count;
        if (n8nCount === 0) {
            db.run(`
                INSERT INTO n8n_config (host, port, workflow_name, webhook_base_url, execution_mode, is_running, log_level)
                VALUES ('localhost', 5678, 'jDroid-X- CafeMenu AI Workflow', 'http://localhost:5678/webhook/whatsapp-restaurant', 'ACTIVE_INSTANCE', 1, 'info')
            `);
        }

        // 8. Seed Initial Orders (For CFO Dashboard verification)
        const orderCount = db.queryOne('SELECT COUNT(*) as count FROM orders').count;
        if (orderCount === 0) {
            const sampleOrders = [
                {
                    code: 'ORD-882101',
                    name: 'Rajesh Kumar',
                    phone: '+91 9820011223',
                    item: 'Vada Pav',
                    qty: 3,
                    price: 30.0,
                    total: 90.0,
                    status: 'Delivered',
                    payment: 'Payment Received',
                    desc: 'Order accepted (item available)',
                    notes: 'Extra sweet chutney requested'
                },
                {
                    code: 'ORD-882102',
                    name: 'Sunita Mehra',
                    phone: '+91 9833445566',
                    item: 'Misal Pav',
                    qty: 2,
                    price: 70.0,
                    total: 140.0,
                    status: 'In Progress',
                    payment: 'COD',
                    desc: 'Order accepted (item available)',
                    notes: 'Spicy rassa required'
                },
                {
                    code: 'ORD-882103',
                    name: 'Vikram Singh',
                    phone: '+91 9845012345',
                    item: 'Butter Pav Bhaji',
                    qty: 2,
                    price: 120.0,
                    total: 240.0,
                    status: 'Accepted',
                    payment: 'Payment Received',
                    desc: 'Order accepted (item available)',
                    notes: 'Less spicy, extra butter'
                },
                {
                    code: 'ORD-882104',
                    name: 'Amit Joshi',
                    phone: '+91 9867098765',
                    item: 'Cutting Chai',
                    qty: 4,
                    price: 15.0,
                    total: 60.0,
                    status: 'Confirmed',
                    payment: 'Pending',
                    desc: 'Order accepted (item available)',
                    notes: 'Office delivery 2nd floor'
                }
            ];

            for (const o of sampleOrders) {
                db.run(`
                    INSERT INTO orders (
                        order_code, customer_name, customer_phone, item_name, quantity,
                        unit_price, total_amount, status, payment_status, description, source, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WHATSAPP', ?)
                `, [o.code, o.name, o.phone, o.item, o.qty, o.price, o.total, o.status, o.payment, o.desc, o.notes]);
            }
        }

        // 9. Seed Audit Log Entry
        db.run(`
            INSERT INTO audit_log (component, severity, event_name, details_json)
            VALUES ('SYSTEM', 'INFO', 'DB_SEEDED_JDROID_X', ?)
        `, [JSON.stringify({ brand: 'jDroid-X- CafeMenu', forceReset, timestamp: new Date().toISOString() })]);

        console.log(`[DatabaseSeeder] jDroid-X- CafeMenu Seed complete. ForceReset=${forceReset}`);
        return { success: true, message: 'Database seeded for jDroid-X- CafeMenu' };
    }
}

module.exports = DatabaseSeeder;
