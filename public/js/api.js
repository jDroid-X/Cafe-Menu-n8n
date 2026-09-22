// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Frontend REST API Client
// Static Mode: when no backend is present (GitHub Pages),
// all calls fall back to smart DEMO responses.
// ==========================================================

// Detect if we are running as a pure static deployment (GitHub Pages)
// vs. a live Node.js server (localhost / custom domain).
const IS_STATIC = (() => {
    const h = window.location.hostname;
    // github.io, any .github.io subdomain, or explicitly offline
    return h.endsWith('.github.io') || h === '';
})();

// ============================================================
// DEMO AI: built-in rule-based reply engine for static mode
// ============================================================
const DemoAI = {
    session: [], // simple in-memory history

    // Sample menu data for offline responses
    _menu: [
        { name: 'Vada Pav', price: 30, category: 'Snacks', status: 'AVAILABLE' },
        { name: 'Misal Pav', price: 70, category: 'Snacks', status: 'AVAILABLE' },
        { name: 'Butter Pav Bhaji', price: 120, category: 'Main Course', status: 'AVAILABLE' },
        { name: 'Cutting Chai', price: 15, category: 'Beverages', status: 'AVAILABLE' },
        { name: 'Mango Lassi', price: 50, category: 'Beverages', status: 'OUT_OF_STOCK' },
        { name: 'Paneer Tikka Pav', price: 90, category: 'Snacks', status: 'AVAILABLE' }
    ],

    reply(text) {
        const t = text.toLowerCase();
        this.session.push({ role: 'user', content: text });
        let reply = '';

        if (/\bhello\b|\bhi\b|\bnamaste\b|\bhey\b/.test(t)) {
            reply = '🙏 Namaste! Welcome to *jDroid-X- CafeMenu* — your WhatsApp ordering assistant! 🍽️\nHow can I help you today?\n\n👉 Try: "Show menu", "Order Vada Pav", or "What\'s available?"';
        } else if (/\bmenu\b|\bitems\b|\bwhat.*have\b|\blist\b/.test(t)) {
            const available = this._menu.filter(i => i.status === 'AVAILABLE');
            reply = '*🍽️ Our Menu Today:*\n\n' + available.map(i =>
                `• *${i.name}* — ₹${i.price} (${i.category})`
            ).join('\n');
            reply += '\n\n📌 To order, just say *"Order [item name]"*';
        } else if (/\border\b/.test(t)) {
            const found = this._menu.find(i =>
                t.includes(i.name.toLowerCase()) && i.status === 'AVAILABLE'
            );
            if (found) {
                reply = `✅ Great choice! *${found.name}* at ₹${found.price} has been noted!\n\n📦 Your order is being processed.\n\nWould you like anything else? 😊`;
            } else {
                reply = '✅ Order received! Our team will confirm shortly.\n\nPlease share the *exact item name* from the menu for a faster response.';
            }
        } else if (/\bprice\b|\bcost\b|\bhow much\b/.test(t)) {
            reply = '*💰 Price List:*\n' + this._menu.map(i =>
                `• ${i.name}: ₹${i.price}`
            ).join('\n');
        } else if (/\bstock\b|\bavailable\b|\btoday\b/.test(t)) {
            const out = this._menu.filter(i => i.status === 'OUT_OF_STOCK');
            if (out.length) {
                reply = `⚠️ Currently *out of stock*:\n${out.map(i => `• ${i.name}`).join('\n')}\n\nAll other items are available! 🟢`;
            } else {
                reply = '✅ All items are currently in stock! Choose anything from the menu.';
            }
        } else if (/\bhours\b|\bopen\b|\btiming\b/.test(t)) {
            reply = '🕐 *Opening Hours:* 09:00 AM – 11:00 PM, 7 days a week!';
        } else if (/\bfaq\b|\bhelp\b|\bquestion\b/.test(t)) {
            reply = '❓ *Common Questions:*\n• Delivery available within 3 km\n• Min order: ₹0\n• Payment: Cash / UPI\n• Contact: +91 (see header)';
        } else if (/\bthank\b|\bthanks\b|\bshukriya\b/.test(t)) {
            reply = '🙏 You\'re most welcome! Enjoy your meal! 🍽️';
        } else {
            reply = '🤖 *[DEMO MODE – GitHub Pages]*\nI can help you with:\n• 📋 Menu & prices\n• 🛒 Placing orders\n• ⏰ Opening hours\n• 📦 Stock availability\n\nType any of these to get started!';
        }

        this.session.push({ role: 'assistant', content: reply });
        return reply;
    },

    reset() { this.session = []; }
};

// ============================================================
// STATIC MOCK: returns plausible data for every API endpoint
// used when IS_STATIC === true
// ============================================================
const StaticMock = {
    health: () => ({
        status: 'ok',
        integrations: [
            { provider: 'WHATSAPP', mode: 'MOCK', status: 'READY' },
            { provider: 'LLM', mode: 'MOCK', status: 'READY' },
            { provider: 'GOOGLE_SHEETS', mode: 'LOCAL', status: 'READY' }
        ]
    }),
    restaurant: () => ({ data: {
        restaurant_name: 'jDroid-X- CafeMenu', welcome_message: 'Welcome!',
        currency: 'INR', currency_symbol: '₹',
        opening_hours: '09:00 AM - 11:00 PM',
        contact_number: '+91 9876543210', delivery_enabled: true
    }}),
    menu: () => ({ data: DemoAI._menu.map((i, idx) => ({
        id: idx + 1, item_code: `VP0${idx + 1}`, item_name: i.name,
        category: i.category, price: i.price, quantity: 50 - idx * 5,
        status: i.status, description: ''
    }))}),
    faq: () => ({ data: [
        { id: 1, category: 'General', question: 'What are your hours?', answer: '9 AM – 11 PM' },
        { id: 2, category: 'Orders', question: 'How to order?', answer: 'Just type what you want!' }
    ]}),
    orders: () => ({ data: [] }),
    analytics: () => ({ data: {
        totalRevenue: 14500, totalOrders: 152, dayRevenue: 2100,
        dayOrders: 22, weekRevenue: 9800, weekOrders: 101,
        monthRevenue: 14500, monthOrders: 152, aov: 95,
        fulfillmentRate: 98, pendingPaymentAmount: 450,
        pendingPaymentOrders: 5, dayQuantity: 30,
        weekQuantity: 145, monthQuantity: 220
    }}),
    agentConfig: () => ({ data: {
        identity_prompt: 'You are CafeMenu AI assistant.',
        restaurant_rules: '', order_rules: '',
        inventory_rules: '', faq_rules: '', response_style: ''
    }}),
    promptPreview: () => ({ data: { systemPrompt: '[DEMO] Prompt preview not available in static mode.' } }),
    memoryConfig: () => ({ data: { enabled: true, memory_type: 'WINDOW_BUFFER', max_messages: 10, expiry_minutes: 60 } }),
    integrations: () => ({ data: [
        { provider: 'WHATSAPP', mode: 'MOCK', endpoint: '', status: 'READY', config_json: '{}' },
        { provider: 'GOOGLE_SHEETS', mode: 'LOCAL', endpoint: '', config_json: '{}' }
    ]}),
    n8nSync: () => ({ data: { synced: false, workflowName: 'CafeMenu Whatsapp', versionCounter: 1, nodeCount: 7, modelName: 'gemini-1.5-flash', temperature: 0.2, tools: [], active: false } }),
    n8nConfig: () => ({ data: {
        restaurant: { restaurant_name: 'jDroid-X- CafeMenu', contact_number: '+91 9876543210', opening_hours: '09:00 AM - 11:00 PM', currency_symbol: '₹', currency: 'INR', min_order_amount: 0, delivery_enabled: true },
        agent: { model: 'models/gemini-1.5-flash', temperature: 0.2, max_tokens: 450, top_p: 0.95, top_k: 40, gemini_host: 'https://generativelanguage.googleapis.com', gemini_api_key_configured: false },
        memory: { contextWindowLength: 10, session_key: 'chat_history', expiry_minutes: 60 },
        sheets: { spreadsheet_id: '', inventory_sheet: 'Inventory', inventory_range: 'A:G', faq_sheet: 'FAQ', orders_sheet: 'Orders', oauth_configured: false },
        n8n: { webhook_url: 'http://localhost:5678/webhook/whatsapp-restaurant' }
    }}),
    simulationFlags: () => ({ data: { simulateLLMFailure: false, simulateInventoryFailure: false, simulateWhatsAppFailure: false } }),
    auditLogs: () => ({ data: [] }),
    chat: (text) => ({
        data: {
            reply: DemoAI.reply(text),
            agentDecision: 'DEMO_STATIC',
            normalizedInput: text,
            toolsCalled: ['DemoAI'],
            toolResults: [],
            historyCount: DemoAI.session.length,
            executionTimeMs: Math.floor(Math.random() * 30) + 10
        }
    })
};

const API = {
    async request(url, options = {}) {
        try {
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                ...options
            });
            // Detect HTML error pages (happens when backend is unreachable)
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Backend unavailable (received ${contentType || 'non-JSON'} from ${url})`);
            }
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP error ${res.status}`);
            }
            return data;
        } catch (err) {
            console.warn(`[API] ${options.method || 'GET'} ${url}: ${err.message}`);
            throw err;
        }
    },

    // 1. Health
    getHealth: () => IS_STATIC ? Promise.resolve(StaticMock.health()) : API.request('/api/health'),

    // 2. Restaurant Profile
    getRestaurant: () => IS_STATIC ? Promise.resolve(StaticMock.restaurant()) : API.request('/api/config/restaurant'),
    updateRestaurant: (data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/config/restaurant', { method: 'PUT', body: JSON.stringify(data) }),

    // 3. Menu
    getMenu: (params = '') => IS_STATIC ? Promise.resolve(StaticMock.menu()) : API.request(`/api/menu${params}`),
    createMenu: (data) => IS_STATIC ? Promise.resolve({ success: true, message: '[DEMO] Cannot save in static mode' }) : API.request('/api/menu', { method: 'POST', body: JSON.stringify(data) }),
    bulkUploadMenu: (items) => IS_STATIC ? Promise.resolve({ success: true, message: '[DEMO] Bulk upload not available in static mode' }) : API.request('/api/menu/bulk', { method: 'POST', body: JSON.stringify({ items }) }),
    updateMenu: (id, data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMenu: (id) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/menu/${id}`, { method: 'DELETE' }),
    toggleMenuStatus: (id) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/menu/${id}/toggle-status`, { method: 'PATCH' }),

    // 4. FAQ
    getFAQ: (params = '') => IS_STATIC ? Promise.resolve(StaticMock.faq()) : API.request(`/api/faq${params}`),
    createFAQ: (data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/faq', { method: 'POST', body: JSON.stringify(data) }),
    updateFAQ: (id, data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFAQ: (id) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/faq/${id}`, { method: 'DELETE' }),

    // 5. Orders & CFO Analytics
    getOrders: (params = '') => IS_STATIC ? Promise.resolve(StaticMock.orders()) : API.request(`/api/orders${params}`),
    getOrdersAnalytics: () => IS_STATIC ? Promise.resolve(StaticMock.analytics()) : API.request('/api/orders/analytics'),
    updateOrderStatus: (id, status, description = null) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, description }) }),
    updateOrderPayment: (id, payment_status) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify({ payment_status }) }),

    // 6. Configs & Prompt
    getAgentConfig: () => IS_STATIC ? Promise.resolve(StaticMock.agentConfig()) : API.request('/api/config/agent'),
    updateAgentConfig: (data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/config/agent', { method: 'PUT', body: JSON.stringify(data) }),
    getPromptPreview: () => IS_STATIC ? Promise.resolve(StaticMock.promptPreview()) : API.request('/api/config/prompt-preview'),

    getMemoryConfig: () => IS_STATIC ? Promise.resolve(StaticMock.memoryConfig()) : API.request('/api/config/memory'),
    updateMemoryConfig: (data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/config/memory', { method: 'PUT', body: JSON.stringify(data) }),

    getIntegrations: () => IS_STATIC ? Promise.resolve(StaticMock.integrations()) : API.request('/api/config/integrations'),
    updateIntegration: (provider, data) => IS_STATIC ? Promise.resolve({ success: true }) : API.request(`/api/config/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(data) }),

    // 7. Test Console & Simulation
    sendChat: (message, senderPhone = '919876543210', senderName = 'Demo Customer') => {
        if (IS_STATIC) return Promise.resolve(StaticMock.chat(message));
        return API.request('/api/test/chat', {
            method: 'POST',
            body: JSON.stringify({
                text: message,
                phone: senderPhone,
                name: senderName
            })
        });
    },
    getSimulationFlags: () => IS_STATIC ? Promise.resolve(StaticMock.simulationFlags()) : API.request('/api/test/simulation-flags'),
    setSimulationFlags: (flags) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/test/simulation-flags', { method: 'POST', body: JSON.stringify(flags) }),
    resetSession: (sessionKey) => {
        if (IS_STATIC) { DemoAI.reset(); return Promise.resolve({ success: true }); }
        return API.request('/api/test/reset-session', { method: 'POST', body: JSON.stringify({ sessionKey }) });
    },

    // 8. Runtime & Audit
    getN8nStatus: () => IS_STATIC ? Promise.resolve({ status: 'STATIC_DEMO' }) : API.request('/api/runtime/n8n/status'),
    startN8n: () => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/runtime/n8n/start', { method: 'POST' }),
    stopN8n: () => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/runtime/n8n/stop', { method: 'POST' }),
    resetDemoData: () => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/demo/reset', { method: 'POST' }),
    getAuditLogs: (params = '') => IS_STATIC ? Promise.resolve(StaticMock.auditLogs()) : API.request(`/api/audit/logs${params}`),
    clearAuditLogs: () => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/audit/logs', { method: 'DELETE' }),

    // 9. n8n Two-Way Synchronization & Multi-Restaurant Mapping
    getN8nSync: () => IS_STATIC ? Promise.resolve(StaticMock.n8nSync()) : API.request('/api/n8n/sync'),
    triggerN8nSync: () => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/n8n/sync', { method: 'POST' }),
    getN8nWorkflowConfig: () => IS_STATIC ? Promise.resolve(StaticMock.n8nConfig()) : API.request('/api/config/n8n-workflow'),
    saveN8nWorkflowConfig: (data) => IS_STATIC ? Promise.resolve({ success: true, data: { n8nPush: { success: true, versionCounter: 1 } } }) : API.request('/api/config/n8n-workflow', { method: 'POST', body: JSON.stringify(data) }),

    // 10. n8n Workflow Activation
    activateN8nWorkflow: (workflowId) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/runtime/n8n/activate', { method: 'POST', body: JSON.stringify({ workflowId: workflowId || 'USdZGa2vqGuUstP7' }) }),
    deactivateN8nWorkflow: (workflowId) => IS_STATIC ? Promise.resolve({ success: true }) : API.request('/api/runtime/n8n/deactivate', { method: 'POST', body: JSON.stringify({ workflowId: workflowId || 'USdZGa2vqGuUstP7' }) })
};

window.API = API;
