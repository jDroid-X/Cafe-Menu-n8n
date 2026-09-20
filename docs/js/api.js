// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Frontend REST API Client
// ==========================================================

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
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP error ${res.status}`);
            }
            return data;
        } catch (err) {
            console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err.message);
            throw err;
        }
    },

    // 1. Health
    getHealth: () => API.request('/api/health'),

    // 2. Restaurant Profile
    getRestaurant: () => API.request('/api/config/restaurant'),
    updateRestaurant: (data) => API.request('/api/config/restaurant', { method: 'PUT', body: JSON.stringify(data) }),

    // 3. Menu
    getMenu: (params = '') => API.request(`/api/menu${params}`),
    createMenu: (data) => API.request('/api/menu', { method: 'POST', body: JSON.stringify(data) }),
    bulkUploadMenu: (items) => API.request('/api/menu/bulk', { method: 'POST', body: JSON.stringify({ items }) }),
    updateMenu: (id, data) => API.request(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMenu: (id) => API.request(`/api/menu/${id}`, { method: 'DELETE' }),
    toggleMenuStatus: (id) => API.request(`/api/menu/${id}/toggle-status`, { method: 'PATCH' }),

    // 4. FAQ
    getFAQ: (params = '') => API.request(`/api/faq${params}`),
    createFAQ: (data) => API.request('/api/faq', { method: 'POST', body: JSON.stringify(data) }),
    updateFAQ: (id, data) => API.request(`/api/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFAQ: (id) => API.request(`/api/faq/${id}`, { method: 'DELETE' }),

    // 5. Orders & CFO Analytics
    getOrders: (params = '') => API.request(`/api/orders${params}`),
    getOrdersAnalytics: () => API.request('/api/orders/analytics'),
    updateOrderStatus: (id, status, description = null) => API.request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, description }) }),
    updateOrderPayment: (id, payment_status) => API.request(`/api/orders/${id}/payment`, { method: 'PATCH', body: JSON.stringify({ payment_status }) }),

    // 6. Configs & Prompt
    getAgentConfig: () => API.request('/api/config/agent'),
    updateAgentConfig: (data) => API.request('/api/config/agent', { method: 'PUT', body: JSON.stringify(data) }),
    getPromptPreview: () => API.request('/api/config/prompt-preview'),

    getMemoryConfig: () => API.request('/api/config/memory'),
    updateMemoryConfig: (data) => API.request('/api/config/memory', { method: 'PUT', body: JSON.stringify(data) }),

    getIntegrations: () => API.request('/api/config/integrations'),
    updateIntegration: (provider, data) => API.request(`/api/config/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(data) }),

    // 7. Test Console & Simulation
    sendChat: (message, senderPhone = '919876543210', senderName = 'Demo Customer') => {
        return API.request('/api/test/chat', {
            method: 'POST',
            body: JSON.stringify({
                text: message,
                phone: senderPhone,
                name: senderName
            })
        });
    },
    getSimulationFlags: () => API.request('/api/test/simulation-flags'),
    setSimulationFlags: (flags) => API.request('/api/test/simulation-flags', { method: 'POST', body: JSON.stringify(flags) }),
    resetSession: (sessionKey) => API.request('/api/test/reset-session', { method: 'POST', body: JSON.stringify({ sessionKey }) }),

    // 8. Runtime & Audit
    getN8nStatus: () => API.request('/api/runtime/n8n/status'),
    startN8n: () => API.request('/api/runtime/n8n/start', { method: 'POST' }),
    stopN8n: () => API.request('/api/runtime/n8n/stop', { method: 'POST' }),
    resetDemoData: () => API.request('/api/demo/reset', { method: 'POST' }),
    getAuditLogs: (params = '') => API.request(`/api/audit/logs${params}`),
    clearAuditLogs: () => API.request('/api/audit/logs', { method: 'DELETE' }),

    // 9. n8n Two-Way Synchronization & Multi-Restaurant Mapping
    getN8nSync: () => API.request('/api/n8n/sync'),
    triggerN8nSync: () => API.request('/api/n8n/sync', { method: 'POST' }),
    getN8nWorkflowConfig: () => API.request('/api/config/n8n-workflow'),
    saveN8nWorkflowConfig: (data) => API.request('/api/config/n8n-workflow', { method: 'POST', body: JSON.stringify(data) })
};

window.API = API;
