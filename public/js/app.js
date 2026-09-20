// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Brand: jDroid-X- CafeMenu
// Frontend SPA Controller & Reactive Event Engine
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    activeScreen: 'dashboard',
    currentSessionKey: '919876543210',
    parsedBulkItems: [],
    environmentMode: 'DEMO',         // 'DEMO' or 'LIVE'
    dataToolsMode: 'ONLINE',         // 'ONLINE' or 'OFFLINE'
    dashboardMetricMode: 'revenue',  // 'revenue' or 'orders'
    dashboardTimeRange: 'day',       // 'day', 'week', or 'month'
    cachedAnalytics: null,           // Cached CFO analytics data

    init() {
        this.initTheme();
        this.checkAuth();
        this.bindNavigation();
        this.initEnvironmentMode();
        this.initDataToolsMode();
        this.loadHealthAndStatus();
        this.loadDashboardData();
        this.loadN8nWorkflowPage();
        this.loadAgentSettings();
        this.bindChatConsole();
        this.bindModals();
        this.bindForms();

        // Check if a specific screen hash is requested
        if (window.location.hash) {
            this.navigateTo(window.location.hash.replace('#', ''));
        }

        // Refresh telemetry and n8n sync periodically
        setInterval(() => this.loadHealthAndStatus(), 20000);
        setInterval(() => this.loadN8nSyncStatus(), 4000);
    },

    // 1. THEME TOGGLE (SYSTEM DEFAULT LIGHT / DARK)
    initTheme() {
        const savedTheme = localStorage.getItem('jdroid_theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Respect system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }

        const themeBtn = document.getElementById('btn-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('jdroid_theme', theme);

        const icon = document.getElementById('theme-toggle-icon');
        const label = document.getElementById('theme-toggle-label');
        if (icon && label) {
            if (theme === 'dark') {
                icon.innerText = '☀️';
                label.innerText = 'Light Mode';
            } else {
                icon.innerText = '🌙';
                label.innerText = 'Dark Mode';
            }
        }
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    },

    // 2. AUTHENTICATION & BOTTOM-LEFT LOGOUT
    checkAuth() {
        let auth = JSON.parse(localStorage.getItem('jdroid_auth') || 'null');
        const overlay = document.getElementById('auth-overlay');

        if (!auth) {
            // Provide default admin session so human operators and demo runs are never blocked
            auth = { email: 'admin@jdroidx.ai', role: 'System Administrator', loggedInAt: new Date().toISOString() };
            localStorage.setItem('jdroid_auth', JSON.stringify(auth));
            overlay.classList.remove('active');
            this.updateUserBadge(auth.email, auth.role);
        } else {
            overlay.classList.remove('active');
            this.updateUserBadge(auth.email, auth.role);
        }

        // Login form
        const loginForm = document.getElementById('form-login');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const role = document.getElementById('login-role').value;
                this.login(email, role);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },

    login(email, role) {
        const auth = { email, role, loggedInAt: new Date().toISOString() };
        localStorage.setItem('jdroid_auth', JSON.stringify(auth));
        document.getElementById('auth-overlay').classList.remove('active');
        this.updateUserBadge(email, role);
    },

    logout() {
        localStorage.removeItem('jdroid_auth');
        document.getElementById('auth-overlay').classList.add('active');
    },

    setLoginDemo(email, pass, role) {
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = pass;
        document.getElementById('login-role').value = role;
    },

    updateUserBadge(email, role) {
        const avatar = document.getElementById('sidebar-avatar');
        const username = document.getElementById('sidebar-username');
        const userRole = document.getElementById('sidebar-role');

        if (avatar) avatar.innerText = (email || 'A')[0].toUpperCase();
        if (username) username.innerText = email || 'admin@jdroidx.ai';
        if (userRole) userRole.innerText = role || 'System Administrator';
    },

    navigateTo(screenId) {
        if (!screenId) return;
        const navItem = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
        if (navItem) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            navItem.classList.add('active');
        }
        document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
        const targetScreen = document.getElementById(`screen-${screenId}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.activeScreen = screenId;
            this.loadScreenData(screenId);
            window.location.hash = screenId;
        }
    },

    // 3. NAVIGATION
    bindNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = item.dataset.screen;
                this.navigateTo(screenId);
            });
        });

        // Hash change support
        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (h) this.navigateTo(h);
        });
    },

    loadScreenData(screenId) {
        switch (screenId) {
            case 'dashboard': this.loadDashboardData(); break;
            case 'restaurant': this.loadRestaurantProfile(); break;
            case 'menu': this.loadMenuItems(); break;
            case 'faq': this.loadFAQItems(); break;
            case 'agent':
            case 'memory':
            case 'whatsapp':
            case 'sheets':
                // Redirect legacy standalone screens to the consolidated n8n page
                this.navigateTo('n8n');
                break;
            case 'n8n':
                this.loadN8nWorkflowPage();
                this.loadAgentSettings();
                this.loadWhatsAppSettings();
                break;
            case 'demo-control': this.loadDemoControlSettings(); break;
            case 'audit': this.loadAuditLogs(); break;
        }
    },

    // 4. TOP STATUS & HEALTH
    async loadHealthAndStatus() {
        try {
            const health = await API.getHealth();
            const integrations = health.integrations || [];

            const wa = integrations.find(i => i.provider === 'WHATSAPP');
            const llm = integrations.find(i => i.provider === 'LLM');
            const data = integrations.find(i => i.provider === 'GOOGLE_SHEETS');

            document.getElementById('status-wa-text').innerText = `WA: ${wa?.mode || 'MOCK'}`;
            document.getElementById('status-llm-text').innerText = `AI: ${llm?.mode || 'MOCK'}`;
            document.getElementById('status-data-text').innerText = `Data: ${data?.mode || 'LOCAL'}`;
        } catch (err) {
            console.warn('[App] Health check warning:', err.message);
        }
    },

    // 4b. LIVE N8N TWO-WAY SYNCHRONIZATION
    async loadN8nSyncStatus() {
        try {
            const res = await API.getN8nSync();
            const data = res.data || {};

            // Header status update
            const headerDot = document.getElementById('n8n-live-dot');
            const headerText = document.getElementById('status-runtime-text');
            if (headerDot && headerText) {
                if (data.synced) {
                    headerDot.className = 'status-dot green pulse';
                    headerText.innerText = `n8n: USdZGa2vqGuUstP7 (v${data.versionCounter || 1} Synced 🔄)`;
                } else {
                    headerDot.className = 'status-dot red';
                    headerText.innerText = `n8n: Sync Issue`;
                }
            }

            // Screen n8n update if elements exist
            const badge = document.getElementById('n8n-sync-status-badge');
            const wfName = document.getElementById('n8n-workflow-name');
            const vCounter = document.getElementById('n8n-version-counter');
            const nodeCount = document.getElementById('n8n-node-count');
            const model = document.getElementById('n8n-synced-model');
            const memory = document.getElementById('n8n-synced-memory');
            const tools = document.getElementById('n8n-synced-tools');
            const lastTime = document.getElementById('n8n-last-synced-time');
            const promptPreview = document.getElementById('n8n-synced-prompt-preview');

            if (badge) badge.innerText = data.synced ? 'SYNCED 🟢' : 'CONNECTING 🟡';
            if (wfName) wfName.innerText = data.workflowName || 'CafeMenu Whatsapp';
            if (vCounter) vCounter.innerText = `v${data.versionCounter || 1} (${(data.versionId || '').slice(0, 8)})`;
            if (nodeCount) nodeCount.innerText = `${data.nodeCount || 7} Nodes`;
            if (model) model.innerText = `${data.modelName || 'gemini-1.5-flash'} (temp: ${data.temperature ?? 0.2})`;
            if (memory) memory.innerText = `${data.contextWindowLength || 10} turns`;
            if (tools) tools.innerText = (data.tools || []).join(', ');
            if (lastTime) lastTime.innerText = data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleTimeString() : 'Active';
            if (promptPreview && data.systemMessage) {
                promptPreview.value = data.systemMessage;
            }
        } catch (err) {
            console.warn('[App] n8n sync fetch warning:', err.message);
        }
    },

    async syncN8nWorkflow() {
        const btn = document.getElementById('btn-force-n8n-sync');
        if (btn) btn.innerText = 'Syncing & Pushing to n8n... ⏳';
        try {
            const form = document.getElementById('form-n8n-workflow-all');
            if (form) {
                await this.saveN8nWorkflowConfig();
            } else {
                await API.triggerN8nSync();
                await this.loadN8nSyncStatus();
                alert('✨ Successfully synchronized with n8n workflow USdZGa2vqGuUstP7!');
            }
        } catch (err) {
            alert(`Sync error: ${err.message}`);
        } finally {
            if (btn) btn.innerText = '🔄 Force Sync & Push to n8n';
        }
    },

    togglePasswordVisibility(inputId) {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.type = el.type === 'password' ? 'text' : 'password';
    },

    // 4c. DYNAMIC BRAND SINGLE SOURCE OF TRUTH APPLIER
    applyBrandName(brandName, contactPhone) {
        if (!brandName) return;
        const brandTitle = document.getElementById('app-brand-title');
        if (brandTitle) brandTitle.innerText = brandName;
        document.title = `${brandName} — WhatsApp AI Ordering Desk & Executive Suite`;
        const simContact = document.getElementById('chat-contact-name');
        if (simContact) simContact.innerText = brandName;
        document.querySelectorAll('.dynamic-brand-name').forEach(el => {
            el.innerText = brandName;
        });
    },

    // 4d. N8N WORKFLOW & MULTI-RESTAURANT CONFIGURATION PAGE
    async loadN8nWorkflowPage() {
        try {
            const res = await API.getN8nWorkflowConfig();
            const data = res.data || {};
            const rest = data.restaurant || {};
            const agent = data.agent || {};
            const memory = data.memory || {};
            const sheets = data.sheets || {};
            const n8n = data.n8n || {};

            // 1. Populate Brand & Restaurant fields
            const nameEl = document.getElementById('n8n-cfg-restaurant-name');
            const phoneEl = document.getElementById('n8n-cfg-contact-phone');
            const hoursEl = document.getElementById('n8n-cfg-hours');
            const symEl = document.getElementById('n8n-cfg-curr-symbol');
            const codeEl = document.getElementById('n8n-cfg-curr-code');
            const minOrderEl = document.getElementById('n8n-cfg-min-order');
            const deliveryEl = document.getElementById('n8n-cfg-delivery-enabled');

            if (nameEl) nameEl.value = rest.restaurant_name || 'jDroid-X- CafeMenu';
            if (phoneEl) phoneEl.value = rest.contact_number || '+95 1224567890';
            if (hoursEl) hoursEl.value = rest.opening_hours || '09:00 AM - 11:00 PM';
            if (symEl) symEl.value = rest.currency_symbol || '₹';
            if (codeEl) codeEl.value = rest.currency || 'INR';
            if (minOrderEl) minOrderEl.value = rest.min_order_amount || 0;
            if (deliveryEl) deliveryEl.checked = !!rest.delivery_enabled;

            // 2. Populate Node 1: AI Model & Hyperparameters
            const modelEl = document.getElementById('n8n-cfg-model-name');
            const tempEl = document.getElementById('n8n-cfg-temperature');
            const tokensEl = document.getElementById('n8n-cfg-max-tokens');
            const topPEl = document.getElementById('n8n-cfg-top-p');
            const topKEl = document.getElementById('n8n-cfg-top-k');
            const hostEl = document.getElementById('n8n-cfg-gemini-host');
            const keyStatusEl = document.getElementById('gemini-key-status');

            if (modelEl) modelEl.value = agent.model || 'models/gemini-1.5-flash';
            if (tempEl) tempEl.value = agent.temperature ?? 0.2;
            if (tokensEl) tokensEl.value = agent.max_tokens || 450;
            if (topPEl) topPEl.value = agent.top_p ?? 0.95;
            if (topKEl) topKEl.value = agent.top_k ?? 40;
            if (hostEl) hostEl.value = agent.gemini_host || 'https://generativelanguage.googleapis.com';
            if (keyStatusEl && agent.gemini_api_key_configured) {
                keyStatusEl.innerText = `Status: Active Key Configured in n8n credentials (${agent.gemini_api_key_masked || 'Active'})`;
            }

            // 3. Populate Node 2: Simple Memory
            const memEl = document.getElementById('n8n-cfg-memory-window');
            const sessionKeyEl = document.getElementById('n8n-cfg-session-key');
            const expiryEl = document.getElementById('n8n-cfg-memory-expiry');

            if (memEl) memEl.value = memory.contextWindowLength ?? 10;
            if (sessionKeyEl) sessionKeyEl.value = memory.session_key || 'chat_history';
            if (expiryEl) expiryEl.value = memory.expiry_minutes || 60;

            // 4. Populate Nodes 3, 4, 5: Sheets & Tool mappings
            const dbEl = document.getElementById('n8n-cfg-spreadsheet');
            if (dbEl) {
                const spreadId = sheets.spreadsheet_id || 'restaurant_database';
                dbEl.value = spreadId;
                if (spreadId !== 'restaurant_database') {
                    dbEl.style.fontWeight = '700';
                    dbEl.style.color = 'var(--brand-primary)';
                }
                // Show link to open spreadsheet in Google Sheets
                const sheetsLink = document.getElementById('n8n-sheets-open-link');
                if (sheetsLink && spreadId && spreadId !== 'restaurant_database') {
                    sheetsLink.href = `https://docs.google.com/spreadsheets/d/${spreadId}/edit`;
                    sheetsLink.style.display = 'inline-block';
                }
            }

            // Node 3: Inventory
            const invEl = document.getElementById('n8n-cfg-sheet-inv');
            const invRangeEl = document.getElementById('n8n-cfg-inv-range');
            const invOpEl = document.getElementById('n8n-cfg-inv-op');
            const invHeaderEl = document.getElementById('n8n-cfg-inv-header');

            if (invEl) invEl.value = sheets.inventory_sheet || 'Inventory';
            if (invRangeEl) invRangeEl.value = sheets.inventory_range || 'A:G';
            if (invOpEl) invOpEl.value = sheets.inventory_operation || 'read';
            if (invHeaderEl) invHeaderEl.value = sheets.inventory_header_row || 1;

            // Node 4: FAQ
            const faqEl = document.getElementById('n8n-cfg-sheet-faq');
            const faqRangeEl = document.getElementById('n8n-cfg-faq-range');
            const faqOpEl = document.getElementById('n8n-cfg-faq-op');
            const faqHeaderEl = document.getElementById('n8n-cfg-faq-header');

            if (faqEl) faqEl.value = sheets.faq_sheet || 'FAQ';
            if (faqRangeEl) faqRangeEl.value = sheets.faq_range || 'A:D';
            if (faqOpEl) faqOpEl.value = sheets.faq_operation || 'read';
            if (faqHeaderEl) faqHeaderEl.value = sheets.faq_header_row || 1;

            // Node 5: Orders
            const ordersEl = document.getElementById('n8n-cfg-sheet-orders');
            const ordersMappingEl = document.getElementById('n8n-cfg-orders-mapping');
            const ordersOpEl = document.getElementById('n8n-cfg-orders-op');

            if (ordersEl) ordersEl.value = sheets.orders_sheet || 'Orders';
            if (ordersMappingEl) ordersMappingEl.value = sheets.orders_mapping_mode || 'autoMapInputData';
            if (ordersOpEl) ordersOpEl.value = sheets.orders_operation || 'append';

            // OAuth credentials
            const clientIdEl = document.getElementById('n8n-cfg-sheets-client-id');
            if (clientIdEl) clientIdEl.value = sheets.oauth_client_id || 'demo-client-id.apps.googleusercontent.com';

            // Credential ID from n8n (read-only, auto-detected)
            const credIdEl = document.getElementById('n8n-cfg-sheets-cred-id');
            if (credIdEl && sheets.sheets_credential_id) {
                credIdEl.value = sheets.sheets_credential_id;
                credIdEl.title = `Auto-detected from n8n workflow credentials`;
            }

            // Badges
            const geminiBadge = document.getElementById('n8n-badge-gemini-cred');
            if (geminiBadge) {
                geminiBadge.className = agent.gemini_api_key_configured ? 'badge badge-available' : 'badge badge-out-of-stock';
                geminiBadge.innerText = agent.gemini_api_key_configured ? 'CONFIGURED 🔑' : 'MISSING ⚠️';
            }

            const sheetsBadge = document.getElementById('n8n-badge-sheets-cred');
            if (sheetsBadge) {
                sheetsBadge.className = sheets.oauth_configured ? 'badge badge-available' : 'badge badge-out-of-stock';
                sheetsBadge.innerText = sheets.oauth_configured ? 'CONFIGURED 📊' : 'MISSING ⚠️';
            }

            // 5. Populate System Prompt Template
            const promptEl = document.getElementById('n8n-cfg-system-prompt');
            if (promptEl) promptEl.value = agent.systemMessage || '';

            // 6. Update Telemetry
            this.loadN8nSyncStatus();

            // Apply brand name dynamically across UI
            this.applyBrandName(rest.restaurant_name, rest.contact_number);
        } catch (err) {
            console.warn('[App] Could not load n8n workflow config:', err.message);
        }
    },

    async saveN8nWorkflowConfig(e) {
        if (e) e.preventDefault();
        const btn = document.getElementById('btn-save-n8n-workflow');
        const forceBtn = document.getElementById('btn-force-n8n-sync');
        const statusMsg = document.getElementById('n8n-save-status-msg');
        if (btn) btn.innerText = 'Saving & Pushing to n8n... ⏳';
        if (forceBtn) forceBtn.innerText = 'Pushing... ⏳';

        try {
            const geminiKeyInput = document.getElementById('n8n-cfg-gemini-key');
            const sheetsSecretInput = document.getElementById('n8n-cfg-sheets-client-secret');

            const payload = {
                restaurant_name: document.getElementById('n8n-cfg-restaurant-name').value.trim(),
                contact_number: document.getElementById('n8n-cfg-contact-phone').value.trim(),
                opening_hours: document.getElementById('n8n-cfg-hours').value.trim(),
                currency_symbol: document.getElementById('n8n-cfg-curr-symbol').value.trim(),
                currency: document.getElementById('n8n-cfg-curr-code').value.trim(),
                min_order_amount: document.getElementById('n8n-cfg-min-order').value,
                delivery_enabled: document.getElementById('n8n-cfg-delivery-enabled').checked,

                // Node 1: Gemini
                model: document.getElementById('n8n-cfg-model-name').value,
                temperature: document.getElementById('n8n-cfg-temperature').value,
                max_tokens: document.getElementById('n8n-cfg-max-tokens').value,
                top_p: document.getElementById('n8n-cfg-top-p')?.value || 0.95,
                top_k: document.getElementById('n8n-cfg-top-k')?.value || 40,
                gemini_host: document.getElementById('n8n-cfg-gemini-host')?.value || 'https://generativelanguage.googleapis.com',
                gemini_api_key: geminiKeyInput && geminiKeyInput.value.trim() ? geminiKeyInput.value.trim() : undefined,

                // Node 2: Memory
                contextWindowLength: document.getElementById('n8n-cfg-memory-window').value,
                session_key: document.getElementById('n8n-cfg-session-key')?.value || 'chat_history',
                memory_expiry: document.getElementById('n8n-cfg-memory-expiry')?.value || 60,

                // Nodes 3, 4, 5: Sheets Tools
                spreadsheet_id: document.getElementById('n8n-cfg-spreadsheet').value.trim(),
                inventory_sheet: document.getElementById('n8n-cfg-sheet-inv').value.trim(),
                inventory_range: document.getElementById('n8n-cfg-inv-range')?.value || 'A:G',
                inventory_operation: document.getElementById('n8n-cfg-inv-op')?.value || 'read',
                inventory_header_row: document.getElementById('n8n-cfg-inv-header')?.value || 1,

                faq_sheet: document.getElementById('n8n-cfg-sheet-faq').value.trim(),
                faq_range: document.getElementById('n8n-cfg-faq-range')?.value || 'A:D',
                faq_operation: document.getElementById('n8n-cfg-faq-op')?.value || 'read',
                faq_header_row: document.getElementById('n8n-cfg-faq-header')?.value || 1,

                orders_sheet: document.getElementById('n8n-cfg-sheet-orders').value.trim(),
                orders_mapping_mode: document.getElementById('n8n-cfg-orders-mapping')?.value || 'autoMapInputData',
                orders_operation: document.getElementById('n8n-cfg-orders-op')?.value || 'append',

                // OAuth Client Credentials
                sheets_client_id: document.getElementById('n8n-cfg-sheets-client-id')?.value.trim() || undefined,
                sheets_client_secret: sheetsSecretInput && sheetsSecretInput.value.trim() ? sheetsSecretInput.value.trim() : undefined,

                systemMessage: document.getElementById('n8n-cfg-system-prompt').value.trim()
            };

            const res = await API.saveN8nWorkflowConfig(payload);
            // Handle push result — backend nests it under data.n8nPush
            const pushResult = res.data?.n8nPush;
            const versionInfo = pushResult && pushResult.success !== false
                ? `v${pushResult.versionCounter || 'latest'}`
                : (pushResult && pushResult.error ? `(push warning: ${pushResult.error})` : '');

            this.applyBrandName(payload.restaurant_name, payload.contact_number);
            await this.loadN8nSyncStatus();

            // Clear sensitive secret inputs after save
            if (geminiKeyInput) geminiKeyInput.value = '';
            if (sheetsSecretInput) sheetsSecretInput.value = '';

            if (statusMsg) {
                statusMsg.innerText = pushResult && pushResult.success !== false
                    ? `✅ Successfully saved and synced with n8n canvas ${versionInfo}!`
                    : `⚠️ Config saved to database but n8n push encountered an issue: ${pushResult?.error || 'unknown'}`;
                setTimeout(() => { statusMsg.innerText = ''; }, 6000);
            }
            alert(pushResult && pushResult.success !== false
                ? `🎉 Success! All 5 nodes and Brand '${payload.restaurant_name}' have been saved to database AND pushed to n8n canvas!`
                : `⚠️ Configuration saved to database, but syncing with n8n canvas had an issue: ${pushResult?.error || 'Check console for details'}`
            );
        } catch (err) {
            alert(`Save Error: ${err.message}`);
        } finally {
            if (btn) btn.innerText = '💾 Save Configuration & Sync Everywhere (App + n8n Canvas)';
            if (forceBtn) forceBtn.innerText = '🔄 Force Sync & Push to n8n';
        }
    },

    // 5. CFO EXECUTIVE DASHBOARD & EXPANDABLE ORDERS
    async loadDashboardData() {
        try {
            const [analyticsRes, ordersRes] = await Promise.all([
                API.getOrdersAnalytics(),
                API.getOrders()
            ]);

            const a = analyticsRes.data || {};
            // Cache analytics for metric/temporal toggles
            this.cachedAnalytics = a;
            this.renderDashboardCards();

            // Render Orders Table with Expandable Details
            const tbody = document.getElementById('dash-orders-table-body');
            const orders = ordersRes.data || [];

            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-dim);">No orders recorded yet</td></tr>';
                return;
            }

            let html = '';
            orders.forEach(o => {
                const statusBadge = this.getStatusBadge(o.status);
                const paymentBadge = this.getPaymentBadge(o.payment_status);

                html += `
                    <tr id="order-row-${o.id}">
                        <td style="cursor:pointer;" onclick="App.toggleOrderDetails(${o.id})">
                            <span id="expand-icon-${o.id}" style="font-size:11px; color:var(--text-muted);">▶</span>
                        </td>
                        <td><strong>#${o.order_code}</strong></td>
                        <td>${o.customer_name}</td>
                        <td>${o.quantity} x ${o.item_name}</td>
                        <td><strong>₹${o.total_amount}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${paymentBadge}</td>
                        <td>${new Date(o.order_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                        <td>
                            <button class="btn btn-secondary" style="padding:3px 8px; font-size:11px;" onclick="App.toggleOrderDetails(${o.id})">
                                Details
                            </button>
                        </td>
                    </tr>
                    <tr id="order-detail-${o.id}" class="order-detail-row">
                        <td colspan="9" style="padding:0;">
                            <div class="order-detail-box">
                                <div class="detail-item">
                                    <strong>Customer Contact:</strong>
                                    <span>${o.customer_phone || 'WhatsApp Direct'}</span>
                                    <div style="margin-top:6px;"><strong>Order Description:</strong> ${o.description || 'Order accepted (item available)'}</div>
                                </div>
                                <div class="detail-item">
                                    <strong>Unit Price:</strong> ₹${o.unit_price} x ${o.quantity} portions
                                    <div style="margin-top:6px;"><strong>Source Channel:</strong> ${o.source}</div>
                                    <div style="margin-top:4px;"><strong>Kitchen Notes:</strong> ${o.notes || 'None'}</div>
                                </div>
                                <div class="detail-item">
                                    <strong>Update Order Status:</strong>
                                    <div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">
                                        <button class="btn btn-secondary" style="padding:2px 6px; font-size:10.5px;" onclick="App.changeOrderStatus(${o.id}, 'Accepted')">Accept</button>
                                        <button class="btn btn-secondary" style="padding:2px 6px; font-size:10.5px;" onclick="App.changeOrderStatus(${o.id}, 'In Progress')">Cooking</button>
                                        <button class="btn btn-primary" style="padding:2px 6px; font-size:10.5px;" onclick="App.changeOrderStatus(${o.id}, 'Delivered')">Deliver</button>
                                        <button class="btn btn-danger" style="padding:2px 6px; font-size:10.5px;" onclick="App.changeOrderStatus(${o.id}, 'Rejected')">Reject</button>
                                    </div>
                                    <div style="margin-top:8px;">
                                        <strong>Payment:</strong>
                                        <button class="btn btn-secondary" style="padding:2px 6px; font-size:10.5px; margin-top:2px;" onclick="App.changePaymentStatus(${o.id}, 'Payment Received')">
                                            Mark Paid ✅
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (err) {
            console.error('[Dashboard Error]:', err);
        }
    },

    toggleOrderDetails(orderId) {
        const detailRow = document.getElementById(`order-detail-${orderId}`);
        const icon = document.getElementById(`expand-icon-${orderId}`);
        if (!detailRow) return;

        const isExpanded = detailRow.classList.contains('expanded');
        if (isExpanded) {
            detailRow.classList.remove('expanded');
            if (icon) icon.innerText = '▶';
        } else {
            detailRow.classList.add('expanded');
            if (icon) icon.innerText = '▼';
        }
    },

    async changeOrderStatus(id, status) {
        try {
            await API.updateOrderStatus(id, status);
            this.loadDashboardData();
        } catch (err) {
            alert('Could not update status: ' + err.message);
        }
    },

    async changePaymentStatus(id, payment_status) {
        try {
            await API.updateOrderPayment(id, payment_status);
            this.loadDashboardData();
        } catch (err) {
            alert('Could not update payment: ' + err.message);
        }
    },

    getStatusBadge(status) {
        switch (status) {
            case 'Accepted':
            case 'Confirmed':
            case 'Delivered':
                return `<span class="badge badge-available">${status}</span>`;
            case 'In Progress':
                return `<span class="badge badge-progress">${status}</span>`;
            case 'Rejected':
            case 'Cancelled':
                return `<span class="badge badge-out-of-stock">${status}</span>`;
            default:
                return `<span class="badge badge-pending">${status}</span>`;
        }
    },

    getPaymentBadge(payment) {
        if (payment === 'Payment Received' || payment === 'UPI Confirmed') {
            return `<span class="badge badge-available">${payment}</span>`;
        }
        return `<span class="badge badge-pending">${payment || 'Pending'}</span>`;
    },

    // 6. CAFE PROFILE
    async loadRestaurantProfile() {
        try {
            const res = await API.getRestaurant();
            const data = res.data || {};

            document.getElementById('rest-name').value = data.restaurant_name || 'jDroid-X- CafeMenu';
            document.getElementById('rest-welcome').value = data.welcome_message || '';
            document.getElementById('rest-currency').value = data.currency || 'INR';
            document.getElementById('rest-symbol').value = data.currency_symbol || '₹';
            document.getElementById('rest-hours').value = data.opening_hours || '09:00 AM - 11:00 PM';
            document.getElementById('rest-contact').value = data.contact_number || '+95 1224567890';
            document.getElementById('rest-delivery').checked = !!data.delivery_enabled;
        } catch (err) {
            alert('Failed to load profile: ' + err.message);
        }
    },

    async saveRestaurantProfile(e) {
        e.preventDefault();
        try {
            const body = {
                restaurant_name: document.getElementById('rest-name').value,
                welcome_message: document.getElementById('rest-welcome').value,
                currency: document.getElementById('rest-currency').value,
                currency_symbol: document.getElementById('rest-symbol').value,
                opening_hours: document.getElementById('rest-hours').value,
                contact_number: document.getElementById('rest-contact').value,
                delivery_enabled: document.getElementById('rest-delivery').checked
            };
            await API.updateRestaurant(body);
            this.applyBrandName(body.restaurant_name, body.contact_number);
            alert('Cafe profile saved successfully! Brand updated across system.');
            this.loadHealthAndStatus();
            this.loadN8nWorkflowPage();
        } catch (err) {
            alert('Failed to save profile: ' + err.message);
        }
    },

    // 7. MENU & INVENTORY
    async loadMenuItems() {
        try {
            const search = document.getElementById('menu-search')?.value || '';
            const res = await API.getMenu(search ? `?search=${encodeURIComponent(search)}` : '');
            const tbody = document.getElementById('menu-table-body');

            tbody.innerHTML = (res.data || []).map(item => `
                <tr>
                    <td><code>${item.item_code}</code></td>
                    <td><strong>${item.item_name}</strong></td>
                    <td><span class="badge badge-category">${item.category}</span></td>
                    <td>₹${item.price}</td>
                    <td>${item.quantity}</td>
                    <td>
                        <span class="badge ${item.status === 'AVAILABLE' ? 'badge-available' : 'badge-out-of-stock'}">
                            ${item.status}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-secondary" style="padding:2px 7px; font-size:11px;" onclick="App.toggleMenuAvailability(${item.id})">
                                ${item.status === 'AVAILABLE' ? 'Out of Stock' : 'In Stock'}
                            </button>
                            <button class="btn btn-danger" style="padding:2px 7px; font-size:11px;" onclick="App.deleteMenuItem(${item.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;">No menu items found</td></tr>';
        } catch (err) {
            console.error('Menu load error:', err);
        }
    },

    async toggleMenuAvailability(id) {
        try {
            await API.toggleMenuStatus(id);
            this.loadMenuItems();
        } catch (err) {
            alert('Error toggling status: ' + err.message);
        }
    },

    async deleteMenuItem(id) {
        if (!confirm('Delete this menu item?')) return;
        try {
            await API.deleteMenu(id);
            this.loadMenuItems();
        } catch (err) {
            alert('Error deleting item: ' + err.message);
        }
    },

    // 8. BULK MENU CSV UPLOAD & TEMPLATE DOWNLOAD
    downloadMenuTemplate() {
        const csvContent = "item_code,item_name,category,description,price,quantity,status\n" +
            "VP01,Vada Pav,Snacks,Mumbai spicy potato fritter with sweet and garlic chutney,30,50,AVAILABLE\n" +
            "MP02,Misal Pav,Snacks,Spicy sprouted lentil curry topped with farsan and lemon,70,40,AVAILABLE\n" +
            "BP06,Butter Pav Bhaji,Main Course,Mashed spiced vegetable curry with toasted butter pav,120,30,AVAILABLE\n" +
            "CB04,Cutting Chai,Beverages,Hot aromatic ginger and cardamom brewed tea,15,100,AVAILABLE\n" +
            "MS05,Mango Lassi,Beverages,Alphonso mango pulp sweetened yogurt shake,50,0,OUT_OF_STOCK\n" +
            "PT03,Paneer Tikka Pav,Snacks,Char-grilled cottage cheese cubes in buttered pav,90,0,OUT_OF_STOCK";

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'menu_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    openBulkModal() {
        document.getElementById('modal-bulk-menu').classList.add('active');
        document.getElementById('bulk-csv-input').value = '';
        document.getElementById('bulk-preview-container').style.display = 'none';
        document.getElementById('btn-submit-bulk').disabled = true;
        this.parsedBulkItems = [];
    },

    closeBulkModal() {
        document.getElementById('modal-bulk-menu').classList.remove('active');
    },

    handleCSVFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
            if (lines.length <= 1) {
                alert('CSV file must have headers and at least 1 item row.');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const items = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length >= 2) {
                    const obj = {};
                    headers.forEach((h, idx) => {
                        obj[h] = values[idx] || '';
                    });
                    if (obj.item_name && obj.price) {
                        items.push(obj);
                    }
                }
            }

            this.parsedBulkItems = items;
            document.getElementById('bulk-count').innerText = items.length;
            document.getElementById('bulk-csv-preview').innerText = JSON.stringify(items.slice(0, 5), null, 2);
            document.getElementById('bulk-preview-container').style.display = 'block';
            document.getElementById('btn-submit-bulk').disabled = items.length === 0;
        };
        reader.readAsText(file);
    },

    async submitBulkUpload() {
        if (!this.parsedBulkItems || this.parsedBulkItems.length === 0) return;
        try {
            const res = await API.bulkUploadMenu(this.parsedBulkItems);
            alert(res.message);
            this.closeBulkModal();
            this.loadMenuItems();
        } catch (err) {
            alert('Bulk upload failed: ' + err.message);
        }
    },

    // 9. FAQ KNOWLEDGE BASE
    async loadFAQItems() {
        try {
            const search = document.getElementById('faq-search')?.value || '';
            const res = await API.getFAQ(search ? `?search=${encodeURIComponent(search)}` : '');
            const tbody = document.getElementById('faq-table-body');

            tbody.innerHTML = (res.data || []).map(f => `
                <tr>
                    <td><span class="badge badge-category">${f.category}</span></td>
                    <td><strong>${f.question}</strong></td>
                    <td style="max-width:350px;">${f.answer}</td>
                    <td>
                        <button class="btn btn-danger" style="padding:2px 7px; font-size:11px;" onclick="App.deleteFAQItem(${f.id})">Delete</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;">No FAQs found</td></tr>';
        } catch (err) {
            console.error('FAQ load error:', err);
        }
    },

    async deleteFAQItem(id) {
        if (!confirm('Delete this FAQ?')) return;
        try {
            await API.deleteFAQ(id);
            this.loadFAQItems();
        } catch (err) {
            alert('Error deleting FAQ: ' + err.message);
        }
    },

    // 10. AI AGENT SETTINGS & PROMPT PREVIEW
    async loadAgentSettings() {
        try {
            const [agentRes, previewRes] = await Promise.all([
                API.getAgentConfig(),
                API.getPromptPreview()
            ]);
            const conf = agentRes.data || {};

            document.getElementById('agent-identity').value = conf.identity_prompt || '';
            document.getElementById('agent-rules-rest').value = conf.restaurant_rules || '';
            document.getElementById('agent-rules-order').value = conf.order_rules || '';
            document.getElementById('agent-rules-inv').value = conf.inventory_rules || '';
            document.getElementById('agent-rules-faq').value = conf.faq_rules || '';
            document.getElementById('agent-style').value = conf.response_style || '';

            document.getElementById('agent-prompt-preview').innerText = previewRes.data?.systemPrompt || '';
        } catch (err) {
            console.error('Agent config load error:', err);
        }
    },

    async saveAgentSettings(e) {
        e.preventDefault();
        try {
            const body = {
                identity_prompt: document.getElementById('agent-identity').value,
                restaurant_rules: document.getElementById('agent-rules-rest').value,
                order_rules: document.getElementById('agent-rules-order').value,
                inventory_rules: document.getElementById('agent-rules-inv').value,
                faq_rules: document.getElementById('agent-rules-faq').value,
                response_style: document.getElementById('agent-style').value
            };
            await API.updateAgentConfig(body);
            alert('AI Agent Rules saved!');
            this.loadAgentSettings();
        } catch (err) {
            alert('Failed to save agent rules: ' + err.message);
        }
    },

    // 11. MEMORY SETTINGS
    async loadMemorySettings() {
        try {
            const res = await API.getMemoryConfig();
            const conf = res.data || {};
            document.getElementById('mem-enabled').checked = !!conf.enabled;
            document.getElementById('mem-type').value = conf.memory_type || 'WINDOW_BUFFER';
            document.getElementById('mem-max-messages').value = conf.max_messages || 10;
            document.getElementById('mem-expiry').value = conf.expiry_minutes || 60;
        } catch (err) {
            console.error(err);
        }
    },

    async saveMemorySettings(e) {
        e.preventDefault();
        try {
            const body = {
                enabled: document.getElementById('mem-enabled').checked,
                memory_type: document.getElementById('mem-type').value,
                max_messages: parseInt(document.getElementById('mem-max-messages').value, 10),
                expiry_minutes: parseInt(document.getElementById('mem-expiry').value, 10)
            };
            await API.updateMemoryConfig(body);
            alert('Memory settings saved!');
        } catch (err) {
            alert('Failed to save memory: ' + err.message);
        }
    },

    // 12. WHATSAPP & GOOGLE SHEETS
    async loadWhatsAppSettings() {
        try {
            const res = await API.getIntegrations();
            const wa = res.data?.find(i => i.provider === 'WHATSAPP') || {};
            document.getElementById('wa-mode').value = wa.mode || 'MOCK';
            document.getElementById('wa-endpoint').value = wa.endpoint || '';
            document.getElementById('wa-status-badge').innerText = wa.status || 'READY';
            document.getElementById('wa-config-json').value = wa.config_json || '{}';
        } catch (err) {
            console.error(err);
        }
    },

    async saveWhatsAppSettings(e) {
        e.preventDefault();
        try {
            const mode = document.getElementById('wa-mode').value;
            const endpoint = document.getElementById('wa-endpoint').value;
            const configJson = document.getElementById('wa-config-json').value;

            await API.updateIntegration('WHATSAPP', { mode, endpoint, config_json: configJson });
            alert('WhatsApp configuration saved!');
            this.loadHealthAndStatus();
        } catch (err) {
            alert('Failed to save WhatsApp config: ' + err.message);
        }
    },

    async loadSheetsSettings() {
        try {
            const res = await API.getIntegrations();
            const sheets = res.data?.find(i => i.provider === 'GOOGLE_SHEETS') || {};
            document.getElementById('sheets-mode').value = sheets.mode || 'LOCAL';
            document.getElementById('sheets-endpoint').value = sheets.endpoint || '';
            document.getElementById('sheets-config-json').value = sheets.config_json || '{}';
        } catch (err) {
            console.error(err);
        }
    },

    async saveSheetsSettings(e) {
        e.preventDefault();
        try {
            const mode = document.getElementById('sheets-mode').value;
            const endpoint = document.getElementById('sheets-endpoint').value;
            const configJson = document.getElementById('sheets-config-json').value;

            await API.updateIntegration('GOOGLE_SHEETS', { mode, endpoint, config_json: configJson });
            alert('Google Sheets configuration saved!');
            this.loadHealthAndStatus();
        } catch (err) {
            alert('Failed to save Sheets config: ' + err.message);
        }
    },

    // 13. DEMO CONTROL
    async loadDemoControlSettings() {
        try {
            const res = await API.getSimulationFlags();
            const flags = res.data || {};
            document.getElementById('sim-llm-fail').checked = !!flags.simulateLLMFailure;
            document.getElementById('sim-inv-fail').checked = !!flags.simulateInventoryFailure;
            document.getElementById('sim-wa-fail').checked = !!flags.simulateWhatsAppFailure;
        } catch (err) {
            console.error(err);
        }
    },

    async updateSimulationFlags() {
        try {
            const flags = {
                llmFailure: document.getElementById('sim-llm-fail').checked,
                inventoryFailure: document.getElementById('sim-inv-fail').checked,
                whatsappFailure: document.getElementById('sim-wa-fail').checked
            };
            await API.setSimulationFlags(flags);
        } catch (err) {
            console.error(err);
        }
    },

    async resetDemoData() {
        if (!confirm('This will restore sample jDroid-X- CafeMenu profile, menu items, and FAQs. Continue?')) return;
        try {
            await API.resetDemoData();
            alert('Demo data restored to pristine reference state!');
            this.loadDashboardData();
        } catch (err) {
            alert('Error resetting demo: ' + err.message);
        }
    },

    // 14. TEST CONSOLE (RULES 1 - 6)
    bindChatConsole() {
        const input = document.getElementById('chat-user-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const traceOutput = document.getElementById('trace-output');

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;

            this.appendChatBubble(text, 'inbound');
            input.value = '';

            try {
                // Check if n8n is running — route through webhook
                let n8nPort = null;
                try {
                    const healthRes = await API.getHealth();
                    n8nPort = healthRes.n8nRuntime?.configuredPort || null;
                } catch (_) {}

                if (n8nPort) {
                    // Route through n8n webhook
                    const n8nUrl = `http://localhost:${n8nPort}/webhook/whatsapp-restaurant`;
                    const resp = await fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: this.currentSessionKey,
                            name: 'Demo User',
                            text: text
                        })
                    });
                    const n8nData = await resp.json();
                    const reply = n8nData.output || n8nData.text || JSON.stringify(n8nData);
                    this.appendChatBubble(reply, 'outbound');
                    if (traceOutput) {
                        traceOutput.innerText = `→ n8n Webhook Response\n${JSON.stringify(n8nData, null, 2)}`;
                    }
                } else {
                    // Local simulator path (Mock AI)
                    const response = await API.sendChat(text, this.currentSessionKey);
                    const data = response.data;
                    this.appendChatBubble(data.reply, 'outbound');
                    if (traceOutput) {
                        traceOutput.innerText = JSON.stringify({
                            timestamp: new Date().toISOString(),
                            input: data.normalizedInput,
                            agentDecision: data.agentDecision,
                            toolsCalled: data.toolsCalled,
                            toolResults: data.toolResults,
                            historyTurnsInSession: data.historyCount,
                            executionLatencyMs: data.executionTimeMs
                        }, null, 2);
                    }
                }
            } catch (err) {
                this.appendChatBubble(`⚠️ Error: ${err.message}`, 'outbound');
                if (traceOutput) traceOutput.innerText = `Error: ${err.message}`;
            }
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });

        // Quick query chips for Rules 1-6
        document.querySelectorAll('.quick-query-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.query;
                handleSend();
            });
        });

        document.getElementById('btn-reset-chat-session').addEventListener('click', async () => {
            await API.resetSession(this.currentSessionKey);
            document.getElementById('whatsapp-messages').innerHTML = `
                <div class="chat-bubble outbound">
                    Session reset. Context memory cleared. Welcome to *jDroid-X- CafeMenu* 🍽️
                    <div class="chat-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            `;
            document.getElementById('trace-output').innerText = '// Session reset. Next message will be turn 1.';
        });
    },

    appendChatBubble(text, direction) {
        const container = document.getElementById('whatsapp-messages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${direction}`;
        bubble.innerHTML = `
            ${text.replace(/\n/g, '<br/>')}
            <div class="chat-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    },

    // 15. AUDIT LOGS
    async loadAuditLogs() {
        try {
            const res = await API.getAuditLogs('?limit=50');
            const tbody = document.getElementById('audit-table-body');
            tbody.innerHTML = (res.data || []).map(l => `
                <tr>
                    <td><code>${new Date(l.timestamp).toLocaleTimeString()}</code></td>
                    <td><span class="badge ${l.severity === 'ERROR' ? 'badge-out-of-stock' : 'badge-available'}">${l.severity}</span></td>
                    <td><strong>${l.component}</strong></td>
                    <td>${l.event_name}</td>
                    <td><code style="font-size:10.5px;">${l.details_json}</code></td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">No audit events</td></tr>';
        } catch (err) {
            console.error('Audit log error:', err);
        }
    },

    // 16. MODALS & FORMS
    bindModals() {
        // Menu item modal
        const menuModal = document.getElementById('modal-add-menu');
        document.getElementById('btn-open-add-menu').addEventListener('click', () => {
            menuModal.classList.add('active');
        });
        document.getElementById('btn-close-add-menu').addEventListener('click', () => {
            menuModal.classList.remove('active');
        });

        // FAQ modal
        const faqModal = document.getElementById('modal-add-faq');
        document.getElementById('btn-open-add-faq').addEventListener('click', () => {
            faqModal.classList.add('active');
        });
        document.getElementById('btn-close-add-faq').addEventListener('click', () => {
            faqModal.classList.remove('active');
        });

        // Bulk CSV modal input listener
        const csvInput = document.getElementById('bulk-csv-input');
        if (csvInput) {
            csvInput.addEventListener('change', (e) => this.handleCSVFileSelect(e));
        }
    },

    bindForms() {
        document.getElementById('form-restaurant').addEventListener('submit', (e) => this.saveRestaurantProfile(e));
        document.getElementById('form-agent').addEventListener('submit', (e) => this.saveAgentSettings(e));
        document.getElementById('form-memory').addEventListener('submit', (e) => this.saveMemorySettings(e));
        document.getElementById('form-whatsapp').addEventListener('submit', (e) => this.saveWhatsAppSettings(e));
        document.getElementById('form-sheets').addEventListener('submit', (e) => this.saveSheetsSettings(e));

        // Add Menu Form
        document.getElementById('form-add-menu').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const body = {
                    item_code: document.getElementById('new-menu-code').value,
                    item_name: document.getElementById('new-menu-name').value,
                    category: document.getElementById('new-menu-category').value,
                    price: parseFloat(document.getElementById('new-menu-price').value),
                    quantity: parseInt(document.getElementById('new-menu-qty').value, 10),
                    description: document.getElementById('new-menu-desc').value,
                    status: document.getElementById('new-menu-status').value
                };
                await API.createMenu(body);
                document.getElementById('modal-add-menu').classList.remove('active');
                e.target.reset();
                this.loadMenuItems();
            } catch (err) {
                alert('Error creating menu item: ' + err.message);
            }
        });

        // Add FAQ Form
        document.getElementById('form-add-faq').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const body = {
                    category: document.getElementById('new-faq-category').value,
                    question: document.getElementById('new-faq-question').value,
                    answer: document.getElementById('new-faq-answer').value
                };
                await API.createFAQ(body);
                document.getElementById('modal-add-faq').classList.remove('active');
                e.target.reset();
                this.loadFAQItems();
            } catch (err) {
                alert('Error creating FAQ: ' + err.message);
            }
        });

        // Simulation flag toggles
        ['sim-llm-fail', 'sim-inv-fail', 'sim-wa-fail'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateSimulationFlags());
        });

        // Search inputs
        document.getElementById('menu-search')?.addEventListener('input', () => this.loadMenuItems());
        document.getElementById('faq-search')?.addEventListener('input', () => this.loadFAQItems());
    },

    // ============================================================
    // 17. ENVIRONMENT MODE TOGGLE (DEMO / LIVE)
    // ============================================================
    setEnvironmentMode(mode) {
        this.environmentMode = mode;
        localStorage.setItem('jdroid_env_mode', mode);

        const demoBtn = document.getElementById('env-btn-demo');
        const liveBtn = document.getElementById('env-btn-live');

        if (mode === 'DEMO') {
            if (demoBtn) { demoBtn.className = 'env-toggle-option active-demo'; }
            if (liveBtn) { liveBtn.className = 'env-toggle-option'; }
            document.getElementById('status-wa-text').innerText = 'WA: MOCK';
        } else {
            if (demoBtn) { demoBtn.className = 'env-toggle-option'; }
            if (liveBtn) { liveBtn.className = 'env-toggle-option active-live'; }
            document.getElementById('status-wa-text').innerText = 'WA: LIVE';
        }

        // Update WhatsApp mode dropdown in Stage 1 if it exists
        const waMode = document.getElementById('wa-mode');
        if (waMode) {
            waMode.value = mode === 'DEMO' ? 'MOCK' : 'REAL';
        }

        // Push mode to backend
        API.updateIntegration('WHATSAPP', { mode: mode === 'DEMO' ? 'MOCK' : 'REAL' }).catch(e => console.warn('[Env] mode push:', e.message));
    },

    initEnvironmentMode() {
        const saved = localStorage.getItem('jdroid_env_mode') || 'DEMO';
        this.setEnvironmentMode(saved);
    },

    // ============================================================
    // 18. DATA TOOLS MODE TOGGLE (ONLINE / OFFLINE)
    // ============================================================
    setDataToolsMode(mode) {
        this.dataToolsMode = mode;
        localStorage.setItem('jdroid_data_mode', mode);

        const onlineBtn = document.getElementById('data-btn-online');
        const offlineBtn = document.getElementById('data-btn-offline');
        const onlinePanel = document.getElementById('data-panel-online');
        const offlinePanel = document.getElementById('data-panel-offline');

        if (mode === 'ONLINE') {
            if (onlineBtn) { onlineBtn.className = 'data-toggle-btn active-online'; }
            if (offlineBtn) { offlineBtn.className = 'data-toggle-btn'; }
            if (onlinePanel) { onlinePanel.className = 'data-content-panel active'; }
            if (offlinePanel) { offlinePanel.className = 'data-content-panel'; }
            document.getElementById('status-data-text').innerText = 'Data: SHEETS';
        } else {
            if (onlineBtn) { onlineBtn.className = 'data-toggle-btn'; }
            if (offlineBtn) { offlineBtn.className = 'data-toggle-btn active-offline'; }
            if (onlinePanel) { onlinePanel.className = 'data-content-panel'; }
            if (offlinePanel) { offlinePanel.className = 'data-content-panel active'; }
            document.getElementById('status-data-text').innerText = 'Data: LOCAL';
        }
    },

    initDataToolsMode() {
        const saved = localStorage.getItem('jdroid_data_mode') || 'ONLINE';
        this.setDataToolsMode(saved);
    },

    // ============================================================
    // 19. CFO DASHBOARD METRIC MODE (REVENUE / ORDERS)
    // ============================================================
    setDashboardMetricMode(mode) {
        this.dashboardMetricMode = mode;

        const revBtn = document.getElementById('cfo-btn-revenue');
        const ordBtn = document.getElementById('cfo-btn-orders');

        if (revBtn) revBtn.className = mode === 'revenue' ? 'metric-toggle-btn active' : 'metric-toggle-btn';
        if (ordBtn) ordBtn.className = mode === 'orders' ? 'metric-toggle-btn active' : 'metric-toggle-btn';

        this.renderDashboardCards();
    },

    // ============================================================
    // 20. CFO DASHBOARD TIME RANGE (DAY / WEEK / MONTH)
    // ============================================================
    setDashboardTimeRange(range) {
        this.dashboardTimeRange = range;

        ['day', 'week', 'month'].forEach(r => {
            const btn = document.getElementById(`cfo-time-${r}`);
            if (btn) btn.className = r === range ? 'temporal-btn active' : 'temporal-btn';
        });

        this.renderDashboardCards();
    },

    renderDashboardCards() {
        const a = this.cachedAnalytics;
        if (!a) return;

        const mode = this.dashboardMetricMode;
        const range = this.dashboardTimeRange;
        const isRevenue = mode === 'revenue';
        const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: isRevenue ? 2 : 0 });

        // Resolve time-filtered values
        let primary, primaryLabel, secondary, secondaryLabel;
        if (range === 'day') {
            primary = isRevenue ? a.dayRevenue : a.dayOrders;
            primaryLabel = isRevenue ? "Today's Revenue" : "Today's Orders";
            secondary = isRevenue ? a.dayOrders : a.dayQuantity;
            secondaryLabel = isRevenue ? `${a.dayOrders} Orders Today` : `${a.dayQuantity} Items Today`;
        } else if (range === 'week') {
            primary = isRevenue ? a.weekRevenue : a.weekOrders;
            primaryLabel = isRevenue ? "This Week's Revenue" : "This Week's Orders";
            secondary = isRevenue ? a.weekOrders : a.weekQuantity;
            secondaryLabel = isRevenue ? `${a.weekOrders} Orders This Week` : `${a.weekQuantity} Items This Week`;
        } else {
            primary = isRevenue ? a.monthRevenue : a.monthOrders;
            primaryLabel = isRevenue ? "This Month's Revenue" : "This Month's Orders";
            secondary = isRevenue ? a.monthOrders : a.monthQuantity;
            secondaryLabel = isRevenue ? `${a.monthOrders} Orders This Month` : `${a.monthQuantity} Items This Month`;
        }

        // Card 1: Total
        const totalVal = isRevenue ? a.totalRevenue : a.totalOrders;
        document.getElementById('cfo-total-revenue').innerText = (isRevenue ? '₹' : '') + fmt(totalVal);
        document.getElementById('cfo-order-count').innerText = isRevenue ? `${a.totalOrders} Total Orders` : `${a.totalQuantity} Total Items`;

        // Card 2: Time-filtered primary
        document.getElementById('cfo-today-revenue').innerText = (isRevenue ? '₹' : '') + fmt(primary);
        document.getElementById('cfo-today-orders').innerText = secondaryLabel;

        // Card 3: AOV / Avg Units
        if (isRevenue) {
            document.getElementById('cfo-aov').innerText = '₹' + fmt(a.aov);
        } else {
            document.getElementById('cfo-aov').innerText = a.avgUnitsPerOrder || '0';
        }
        document.getElementById('cfo-fulfillment').innerText = `${a.fulfillmentRate || 100}%`;

        // Card 4: Pending
        if (isRevenue) {
            document.getElementById('cfo-pending-amount').innerText = '₹' + fmt(a.pendingPaymentAmount);
        } else {
            document.getElementById('cfo-pending-amount').innerText = fmt(a.pendingPaymentOrders);
        }
        document.getElementById('cfo-pending-orders').innerText = `${a.pendingPaymentOrders} Awaiting`;

        // Update card titles
        const cards = document.querySelectorAll('#screen-dashboard .card-grid .card');
        if (cards.length >= 4) {
            cards[0].querySelector('.card-title').innerHTML = isRevenue ? 'Total Gross Revenue <span>💰</span>' : 'Total Orders Volume <span>📦</span>';
            cards[1].querySelector('.card-title').innerHTML = `${primaryLabel} <span>${isRevenue ? '📈' : '📊'}</span>`;
            cards[2].querySelector('.card-title').innerHTML = isRevenue ? 'Average Order Value (AOV) <span>🎯</span>' : 'Avg Units Per Order <span>🎯</span>';
            cards[3].querySelector('.card-title').innerHTML = isRevenue ? 'Pending Receivables <span>⏳</span>' : 'Pending Orders <span>⏳</span>';
        }
    },

    // ============================================================
    // 21. PIPELINE STAGE ACCORDION TOGGLE
    // ============================================================
    togglePipelineStage(stageId) {
        const stage = document.getElementById(stageId);
        if (!stage) return;
        stage.classList.toggle('expanded');
    },

    // ============================================================
    // 22. NAVIGATE TO SPECIFIC STAGE WITHIN N8N
    // ============================================================
    navigateToStage(screenId, stageId) {
        this.navigateTo(screenId);
        setTimeout(() => {
            const stageEl = document.getElementById(stageId);
            if (stageEl) {
                // Expand the stage if collapsed
                if (!stageEl.classList.contains('expanded')) {
                    stageEl.classList.add('expanded');
                }
                stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 150);
    }
};

window.App = App;
