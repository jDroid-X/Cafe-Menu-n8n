/**
 * GitHub Pages API Mock
 * Intercepts fetch() calls and serves from LocalStorage
 * This file must be loaded BEFORE api.js
 */
(function() {
    'use strict';

    const PREFIX = 'cafe_menu_';

    // Default seed data
    function getDefaults() {
        return {
            restaurant_config: {
                id: 1, restaurant_name: 'jDroid-X- CafeMenu', currency: 'INR',
                currency_symbol: '₹', timezone: 'Asia/Kolkata', opening_hours: '09:00 AM - 11:00 PM',
                delivery_enabled: 1, contact_number: '+95 1224567890', min_order_amount: 50, active: 1
            },
            agent_config: {
                id: 1, identity_prompt: 'You are the friendly AI food ordering assistant.',
                restaurant_rules: 'You are the friendly, helpful AI food ordering assistant for *jDroid-X- CafeMenu* on WhatsApp.\n\nRULES:\n1. Greet customers warmly and introduce *jDroid-X- CafeMenu*. Give quick action options: 🛒 Place an order | i️ FAQ / Information | 📦 Check order / stock.\n2. When an order is placed, collect details step-by-step: items & quantity, customer name, delivery address, and payment method. ALWAYS check stock using the Get Inventory tool. If an item is sold out, politely refuse and suggest available items.\n3. Keep answers to questions concise using the Get FAQ tool.\n4. When asked to check order or stock, look it up and inform the customer accurately.\n5. If a customer requests to cancel an order, politely explain that orders cannot be canceled via WhatsApp AI and direct them to the owner at +95 1224567890.\n6. Format your messages cleanly for WhatsApp using only single asterisks for *bold*.',
                temperature: 0.2, max_tokens: 450
            },
            menu_items: [
                { id: 1, item_code: 'VP01', item_name: 'Vada Pav', category: 'Snacks', price: 30, quantity: 43, status: 'AVAILABLE' },
                { id: 2, item_code: 'MP02', item_name: 'Misal Pav', category: 'Main Course', price: 70, quantity: 28, status: 'AVAILABLE' },
                { id: 3, item_code: 'PT03', item_name: 'Paneer Tikka Pav', category: 'Main Course', price: 90, quantity: 0, status: 'OUT_OF_STOCK' },
                { id: 4, item_code: 'CB04', item_name: 'Cutting Chai', category: 'Beverages', price: 15, quantity: 100, status: 'AVAILABLE' },
                { id: 5, item_code: 'MS05', item_name: 'Mango Lassi', category: 'Beverages', price: 50, quantity: 0, status: 'OUT_OF_STOCK' },
                { id: 6, item_code: 'BP06', item_name: 'Butter Pav Bhaji', category: 'Main Course', price: 120, quantity: 25, status: 'AVAILABLE' }
            ],
            faq_items: [
                { id: 1, category: 'General', question: 'What are your opening hours?', answer: 'We are open daily from 9:00 AM to 11:00 PM.' },
                { id: 2, category: 'Delivery', question: 'Do you offer home delivery?', answer: 'Yes, we deliver within 5 km radius in 30-45 minutes.' },
                { id: 3, category: 'Payment', question: 'What payment methods do you accept?', answer: 'We accept COD, UPI, and cards on delivery.' }
            ],
            orders: [],
            integrations: [
                { id: 1, provider: 'WHATSAPP', mode: 'MOCK', status: 'READY' },
                { id: 2, provider: 'GOOGLE_SHEETS', mode: 'LOCAL', status: 'READY' },
                { id: 3, provider: 'LLM', mode: 'MOCK', status: 'READY' }
            ],
            n8n_config: { id: 1, workflow_name: 'CafeMenu Whatsapp', is_running: 1 }
        };
    }

    function load(key) {
        const stored = localStorage.getItem(PREFIX + key);
        if (stored) return JSON.parse(stored);
        const defaults = getDefaults();
        return defaults[key] || null;
    }

    function save(key, data) {
        localStorage.setItem(PREFIX + key, JSON.stringify(data));
    }

    function initDefaults() {
        if (!localStorage.getItem(PREFIX + 'initialized')) {
            const defaults = getDefaults();
            Object.keys(defaults).forEach(key => save(key, defaults[key]));
            localStorage.setItem(PREFIX + 'initialized', 'true');
        }
    }

    initDefaults();

    // Mock fetch interceptor
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        const urlStr = typeof url === 'string' ? url : url.toString();
        const method = options.method || 'GET';

        if (urlStr.startsWith('/api/')) {
            await new Promise(r => setTimeout(r, 30));

            let result = { success: true, data: null };

            try {
                if (urlStr === '/api/health') {
                    result.data = {
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        integrations: load('integrations')
                    };
                }
                else if (urlStr === '/api/config/restaurant') {
                    if (method === 'GET') result.data = load('restaurant_config');
                    else if (method === 'PUT') {
                        const config = load('restaurant_config') || {};
                        Object.assign(config, JSON.parse(options.body));
                        save('restaurant_config', config);
                        result.data = config;
                    }
                }
                else if (urlStr.startsWith('/api/menu')) {
                    let items = load('menu_items') || [];
                    if (method === 'GET') result.data = items;
                    else if (method === 'POST') {
                        const newItem = { ...JSON.parse(options.body), id: items.length + 1 };
                        items.push(newItem);
                        save('menu_items', items);
                        result.data = newItem;
                    }
                }
                else if (urlStr.startsWith('/api/faq')) {
                    let items = load('faq_items') || [];
                    if (method === 'GET') result.data = items;
                    else if (method === 'POST') {
                        const newItem = { ...JSON.parse(options.body), id: items.length + 1 };
                        items.push(newItem);
                        save('faq_items', items);
                        result.data = newItem;
                    }
                }
                else if (urlStr.startsWith('/api/orders')) {
                    let orders = load('orders') || [];
                    if (urlStr.includes('/analytics')) {
                        const today = new Date().toDateString();
                        const todayOrders = orders.filter(o => new Date(o.order_date)?.toDateString() === today);
                        result.data = {
                            total_orders: orders.length,
                            today_orders: todayOrders.length,
                            total_revenue: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
                            today_revenue: todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
                            pending_orders: orders.filter(o => o.status === 'Confirmed').length
                        };
                    } else if (method === 'GET') {
                        result.data = orders;
                    } else if (method === 'POST') {
                        const body = JSON.parse(options.body);
                        const newOrder = {
                            ...body,
                            id: orders.length + 1,
                            order_code: 'ORD-' + Date.now().toString().slice(-6),
                            order_date: new Date().toISOString(),
                            status: body.status || 'Confirmed'
                        };
                        orders.push(newOrder);
                        save('orders', orders);
                        result.data = newOrder;
                    }
                }
                else if (urlStr === '/api/config/agent') {
                    if (method === 'GET') result.data = load('agent_config');
                    else if (method === 'PUT') {
                        const config = load('agent_config') || {};
                        Object.assign(config, JSON.parse(options.body));
                        save('agent_config', config);
                        result.data = config;
                    }
                }
                else if (urlStr.includes('/n8n/') || urlStr.includes('/runtime/')) {
                    result.data = {
                        synced: true,
                        workflowId: 'USdZGa2vqGuUstP7',
                        workflowName: 'CafeMenu Whatsapp',
                        versionCounter: 83,
                        modelName: 'models/gemini-1.5-flash',
                        temperature: 0.2,
                        contextWindowLength: 10,
                        spreadsheetId: '1zipJC7y1Oa43PWMZHrotGd-lO8v54Xfq70bOLQUATcE',
                        sheetsCredentialId: '93xN3gnk32S67PtE',
                        lastSyncedAt: new Date().toISOString()
                    };
                }
                else if (urlStr === '/api/test/chat') {
                    const body = JSON.parse(options.body || '{}');
                    const msg = body.message?.toLowerCase() || '';
                    let response = 'Thank you for your message!';
                    if (msg.includes('order')) response = 'I can help you place an order! Please provide your name, food item, and quantity.';
                    else if (msg.includes('stock') || msg.includes('available')) {
                        const items = load('menu_items') || [];
                        const available = items.filter(i => i.status === 'AVAILABLE');
                        response = `Available: ${available.map(i => i.item_name).join(', ')}`;
                    } else if (msg.includes('faq') || msg.includes('hour')) {
                        response = 'We are open 9:00 AM - 11:00 PM daily.';
                    }
                    result.data = { output: response };
                }
                else if (urlStr.includes('/integrations')) {
                    result.data = load('integrations');
                }
                else if (urlStr.startsWith('/api/tools/')) {
                    if (urlStr.includes('inventory')) {
                        const items = load('menu_items') || [];
                        result.data = { success: true, count: items.length, items };
                    } else if (urlStr.includes('faq')) {
                        const faqs = load('faq_items') || [];
                        result.data = { success: true, count: faqs.length, items: faqs };
                    }
                }
                else {
                    result.data = { message: 'OK' };
                }
            } catch (err) {
                result = { success: false, error: err.message };
            }

            return {
                ok: result.success,
                status: result.success ? 200 : 400,
                json: async () => result
            };
        }

        return originalFetch.apply(this, arguments);
    };

    console.log('[GitHub Pages API Mock] Initialized');
})();
