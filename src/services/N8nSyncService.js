// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Service: N8nSyncService (Live Sync with n8n Workflow)
// Workflow Target: USdZGa2vqGuUstP7 (CafeMenu Whatsapp)
// ==========================================================

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const ConfigModel = require('../models/ConfigModel');

class N8nSyncService {
    constructor() {
        this.n8nDbPath = process.env.N8N_DB_PATH || 'C:/Users/jiten/.n8n/database.sqlite';
        this.n8nConfigPath = process.env.N8N_CONFIG_PATH || 'C:/Users/jiten/.n8n/config';
        this.workflowId = 'USdZGa2vqGuUstP7';
        this.configModel = new ConfigModel();
        this.lastVersionId = null;
        this.lastUpdatedAt = null;
        this.timer = null;

        this.syncedState = {
            synced: false,
            workflowId: this.workflowId,
            workflowName: 'CafeMenu Whatsapp',
            active: false,
            versionCounter: 0,
            versionId: null,
            updatedAt: null,
            modelName: 'models/gemini-2.5-flash',
            temperature: 0.2,
            maxOutputTokens: 450,
            topP: 0.95,
            topK: 40,
            contextWindowLength: 50,
            sessionKey: 'chat_history',
            spreadsheetId: 'restaurant_database',
            inventorySheet: 'Inventory',
            inventoryRange: 'A:G',
            inventoryOperation: 'read',
            faqSheet: 'FAQ',
            faqRange: 'A:D',
            faqOperation: 'read',
            ordersSheet: 'Orders',
            ordersMappingMode: 'autoMapInputData',
            ordersOperation: 'append',
            tools: ['Get Inventory', 'Get FAQ', 'Post Orders'],
            systemMessage: '',
            nodeCount: 0,
            lastSyncedAt: null,
            syncSource: 'n8n:database.sqlite',
            geminiCredentialConfigured: true,
            sheetsCredentialConfigured: true
        };

        // Run immediate initial sync
        this.syncNow();
    }

    static getInstance() {
        if (!N8nSyncService.instance) {
            N8nSyncService.instance = new N8nSyncService();
        }
        return N8nSyncService.instance;
    }

    /**
     * Helper to load n8n's native Credentials class with encryption key
     */
    getN8nCredentialsClass() {
        try {
            if (fs.existsSync(this.n8nConfigPath)) {
                const cfg = JSON.parse(fs.readFileSync(this.n8nConfigPath, 'utf8'));
                if (cfg.encryptionKey) {
                    process.env.N8N_ENCRYPTION_KEY = cfg.encryptionKey;
                }
            }
            const coreModulePath = 'C:/Users/jiten/AppData/Roaming/npm/node_modules/n8n/node_modules/n8n-core';
            const { Credentials } = require(coreModulePath);
            return Credentials;
        } catch (err) {
            console.warn('[N8nSyncService] Warning loading n8n-core Credentials class:', err.message);
            return null;
        }
    }

    /**
     * Updates n8n's credentials_entity with encrypted payload
     */
    async updateEncryptedCredentials({ geminiApiKey, geminiHost, sheetsClientId, sheetsClientSecret }) {
        try {
            if (!fs.existsSync(this.n8nDbPath)) return { success: false, error: 'n8n database not found' };

            const Credentials = this.getN8nCredentialsClass();
            if (!Credentials) return { success: false, error: 'Could not load n8n Credentials class' };

            const db = new DatabaseSync(this.n8nDbPath);
            const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

            // 1. Update Gemini API Credential if provided
            if (geminiApiKey && geminiApiKey.trim() !== '') {
                const geminiCred = new Credentials({
                    id: 'gemini-api-cred-default',
                    name: 'Google Gemini API',
                    type: 'googlePalmApi'
                });
                await geminiCred.setData({
                    host: geminiHost || 'https://generativelanguage.googleapis.com',
                    apiKey: geminiApiKey.trim()
                });
                const toSave = geminiCred.getDataToSave();

                const exists = db.prepare('SELECT id FROM credentials_entity WHERE id = ?').get('gemini-api-cred-default');
                if (exists) {
                    db.prepare('UPDATE credentials_entity SET data = ?, updatedAt = ? WHERE id = ?')
                        .run(toSave.data, now, 'gemini-api-cred-default');
                } else {
                    db.prepare(`
                        INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, 0)
                    `).run('gemini-api-cred-default', 'Google Gemini API', toSave.data, 'googlePalmApi', now, now);
                }
                console.log('[N8nSyncService] 🔐 Updated n8n credential gemini-api-cred-default');
            }

            // 2. Update Google Sheets OAuth2 Credential if provided
            if (sheetsClientId && sheetsClientSecret) {
                const sheetsCred = new Credentials({
                    id: 'google-sheets-cred-default',
                    name: 'Google Sheets OAuth2 API',
                    type: 'googleSheetsOAuth2Api'
                });
                await sheetsCred.setData({
                    clientId: sheetsClientId.trim(),
                    clientSecret: sheetsClientSecret.trim(),
                    oauthTokenData: {
                        access_token: 'ya29.demo_token_valid_for_n8n_test_123',
                        token_type: 'Bearer',
                        expires_in: 3599,
                        refresh_token: '1//0demo_refresh_token_valid',
                        scope: 'https://www.googleapis.com/auth/spreadsheets'
                    }
                });
                const toSave = sheetsCred.getDataToSave();

                const exists = db.prepare('SELECT id FROM credentials_entity WHERE id = ?').get('google-sheets-cred-default');
                if (exists) {
                    db.prepare('UPDATE credentials_entity SET data = ?, updatedAt = ? WHERE id = ?')
                        .run(toSave.data, now, 'google-sheets-cred-default');
                } else {
                    db.prepare(`
                        INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt, isManaged, isGlobal, isResolvable, resolvableAllowFallback)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, 0)
                    `).run('google-sheets-cred-default', 'Google Sheets OAuth2 API', toSave.data, 'googleSheetsOAuth2Api', now, now);
                }
                console.log('[N8nSyncService] 🔐 Updated n8n credential google-sheets-cred-default');
            }

            return { success: true };
        } catch (err) {
            console.error('[N8nSyncService] Error encrypting credentials:', err.message);
            return { success: false, error: err.message };
        }
    }

    syncNow() {
        try {
            if (!fs.existsSync(this.n8nDbPath)) {
                this.syncedState.synced = false;
                this.syncedState.error = `n8n database not found at ${this.n8nDbPath}`;
                return this.syncedState;
            }

            const db = new DatabaseSync(this.n8nDbPath, { readOnly: true });
            const row = db.prepare('SELECT id, name, active, nodes, connections, versionId, versionCounter, updatedAt FROM workflow_entity WHERE id = ?').get(this.workflowId);

            if (!row) {
                this.syncedState.synced = false;
                this.syncedState.error = `Workflow ${this.workflowId} not found in n8n database`;
                return this.syncedState;
            }

            let nodes = [];
            try {
                nodes = JSON.parse(row.nodes || '[]');
            } catch (e) {
                nodes = [];
            }

            // Extract Webhook Node — get the actual registered path (may be a UUID or a named path)
            const webhookNode = nodes.find(n =>
                (n.type === 'n8n-nodes-base.webhook') ||
                (n.type === 'n8n-nodes-base.whatsAppTrigger' && n.parameters?.path)
            );
            const actualWebhookPath = webhookNode?.parameters?.path || null;

            // Extract Agent Node
            const agentNode = nodes.find(n => n.type?.includes('agent') || n.name?.toLowerCase().includes('agent'));
            const systemMessage = agentNode?.parameters?.options?.systemMessage || '';

            // Extract Chat Model Node
            const modelNode = nodes.find(n => n.type?.includes('gemini') || n.type?.includes('lmChat') || n.name?.includes('Gemini'));
            const modelName = modelNode?.parameters?.modelName || 'models/gemini-2.5-flash';
            const temperature = modelNode?.parameters?.options?.temperature ?? 0.2;
            const maxOutputTokens = modelNode?.parameters?.options?.maxOutputTokens ?? 450;
            const topP = modelNode?.parameters?.options?.topP ?? 0.95;
            const topK = modelNode?.parameters?.options?.topK ?? 40;

            // Extract Memory Node
            const memoryNode = nodes.find(n => n.type?.includes('memory') || n.name?.includes('Memory'));
            const contextWindowLength = memoryNode?.parameters?.contextWindowLength ?? 50;
            const sessionKey = memoryNode?.parameters?.sessionKey || 'chat_history';

            // Extract Tools - Support both native googleSheetsTool and LangChain http tool formats
            const invNode = nodes.find(n => n.name === 'Get Inventory' || (n.type === 'n8n-nodes-base.googleSheetsTool' && n.parameters?.documentId));
            const faqNode = nodes.find(n => n.name === 'FAQ' || n.name === 'Get FAQ');
            const ordersNode = nodes.find(n => n.name === 'Post Orders');

            // Parse spreadsheet info from native Google Sheets nodes
            let spreadsheetId = 'restaurant_database';
            let inventorySheet = 'Inventory';
            let faqSheet = 'FAQ';
            let ordersSheet = 'Orders';
            let sheetsCredentialId = null;

            if (invNode) {
                spreadsheetId = invNode.parameters?.documentId?.value || spreadsheetId;
                const sheetVal = invNode.parameters?.sheetName?.value;
                if (typeof sheetVal === 'string') inventorySheet = sheetVal;
                else if (typeof sheetVal === 'number') inventorySheet = invNode.parameters?.sheetName?.cachedResultName || inventorySheet;
                if (invNode.credentials?.googleSheetsOAuth2Api) {
                    sheetsCredentialId = invNode.credentials.googleSheetsOAuth2Api.id;
                }
            }

            if (faqNode) {
                const sheetVal = faqNode.parameters?.sheetName?.value;
                if (typeof sheetVal === 'string') faqSheet = sheetVal;
                else if (typeof sheetVal === 'number') faqSheet = faqNode.parameters?.sheetName?.cachedResultName || faqSheet;
            }

            if (ordersNode) {
                const sheetVal = ordersNode.parameters?.sheetName?.value;
                if (typeof sheetVal === 'string') ordersSheet = sheetVal;
                else if (typeof sheetVal === 'number') ordersSheet = ordersNode.parameters?.sheetName?.cachedResultName || ordersSheet;
            }

            // Also support LangChain HTTP tool format
            const langchainInvNode = nodes.find(n => n.type?.includes('toolHttpRequest') && n.name?.includes('inventory', 'Inventory'));
            if (!invNode && langchainInvNode) {
                spreadsheetId = langchainInvNode.parameters?.spreadsheetId || spreadsheetId;
                inventorySheet = langchainInvNode.parameters?.sheetName || inventorySheet;
            }

            const toolNodes = nodes.filter(n => n.name?.startsWith('Get') || n.name?.startsWith('Post') || n.name === 'FAQ' || n.type?.includes('googleSheets') || n.type?.includes('toolHttp'));
            const tools = toolNodes.map(t => t.name || t.type);

            const isChanged = (this.lastVersionId !== row.versionId || this.lastUpdatedAt !== row.updatedAt);

            this.lastVersionId = row.versionId;
            this.lastUpdatedAt = row.updatedAt;

            // Build the actual live webhook URL from the real path registered in n8n
            const n8nBaseUrl = 'http://localhost:5678';
            const resolvedWebhookUrl = actualWebhookPath
                ? `${n8nBaseUrl}/webhook/${actualWebhookPath}`
                : `${n8nBaseUrl}/webhook/whatsapp-restaurant`;

            this.syncedState = {
                synced: true,
                workflowId: row.id,
                workflowName: row.name,
                active: Boolean(row.active),
                versionCounter: row.versionCounter || 1,
                versionId: row.versionId,
                updatedAt: row.updatedAt,
                modelName,
                temperature,
                maxOutputTokens,
                topP,
                topK,
                contextWindowLength,
                sessionKey,
                spreadsheetId,
                inventorySheet,
                inventoryRange: 'A:G',
                inventoryOperation: 'read',
                faqSheet,
                faqRange: 'A:D',
                faqOperation: 'read',
                ordersSheet,
                ordersMappingMode: 'autoMapInputData',
                ordersOperation: 'append',
                tools: tools.length ? tools : ['Get Inventory', 'FAQ', 'Post Orders'],
                systemMessage,
                nodeCount: nodes.length,
                lastSyncedAt: new Date().toISOString(),
                syncSource: 'n8n:database.sqlite',
                geminiCredentialConfigured: !!modelNode?.credentials?.googlePalmApi,
                sheetsCredentialConfigured: !!sheetsCredentialId,
                sheetsCredentialId: sheetsCredentialId || null,
                webhookPath: actualWebhookPath,
                webhookUrl: resolvedWebhookUrl
            };

            // Update app config tables from extracted n8n settings
            if (isChanged) {
                try {
                    // Only update agent rules/prompt if system message exists in n8n
                    // Otherwise preserve existing values to avoid overwriting with empty strings
                    const existingAgent = this.configModel.getAgentConfig() || {};
                    const newRules = systemMessage && systemMessage.trim().length > 0 
                        ? systemMessage 
                        : existingAgent.restaurant_rules;
                    
                    this.configModel.updateAgentConfig({
                        identity_prompt: (systemMessage && systemMessage.trim().length > 0) ? systemMessage.slice(0, 500) : existingAgent.identity_prompt,
                        restaurant_rules: newRules,
                        temperature: temperature,
                        max_tokens: maxOutputTokens
                    });
                    // Persist webhook_base_url with the REAL path from n8n DB
                    const webhookUpdate = {
                        workflow_name: row.name,
                        is_running: 1,
                        last_heartbeat: new Date().toISOString().replace('T', ' ').replace('Z', '')
                    };
                    if (actualWebhookPath) {
                        webhookUpdate.webhook_base_url = resolvedWebhookUrl;
                    }
                    this.configModel.updateN8nConfig(webhookUpdate);

                    // Update Google Sheets integration config with real spreadsheet details
                    const sheetsIntegration = this.configModel.getIntegration('GOOGLE_SHEETS');
                    let sheetsConfig = {};
                    try {
                        sheetsConfig = JSON.parse(sheetsIntegration?.config_json || '{}');
                    } catch (e) {}

                    sheetsConfig.spreadsheet_id = spreadsheetId;
                    sheetsConfig.inventory_sheet = inventorySheet;
                    sheetsConfig.faq_sheet = faqSheet;
                    sheetsConfig.orders_sheet = ordersSheet;
                    sheetsConfig.sheets_credential_id = sheetsCredentialId;
                    sheetsConfig.operation = 'read';

                    this.configModel.updateIntegration('GOOGLE_SHEETS', {
                        config_json: JSON.stringify(sheetsConfig),
                        status: 'READY'
                    });

                    console.log(`[N8nSyncService] ✨ Synced with n8n workflow '${row.name}' (v${row.versionCounter}). Spreadsheet: ${spreadsheetId}, Sheets: Inventory(${inventorySheet}), FAQ(${faqSheet}), Orders(${ordersSheet})`);
                } catch (err) {
                    console.warn('[N8nSyncService] Could not persist config update:', err.message);
                }
            }

            return this.syncedState;
        } catch (err) {
            console.error('[N8nSyncService] Error during sync:', err.message);
            this.syncedState.synced = false;
            this.syncedState.error = err.message;
            return this.syncedState;
        }
    }

    startWatcher(intervalMs = 3000) {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.syncNow();
        }, intervalMs);
        console.log(`[N8nSyncService] 🔄 Live Watcher active: polling n8n workflow ${this.workflowId} every ${intervalMs}ms`);
    }

    stopWatcher() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    getSyncStatus() {
        return this.syncedState;
    }

    async pushToN8n(data = {}) {
        try {
            if (!fs.existsSync(this.n8nDbPath)) {
                return { success: false, error: 'n8n database not found' };
            }

            // 1. Process Credentials Update if provided
            if (data.gemini_api_key || data.sheets_client_id) {
                await this.updateEncryptedCredentials({
                    geminiApiKey: data.gemini_api_key,
                    geminiHost: data.gemini_host,
                    sheetsClientId: data.sheets_client_id,
                    sheetsClientSecret: data.sheets_client_secret
                });
            }

            const db = new DatabaseSync(this.n8nDbPath);
            const row = db.prepare('SELECT id, name, nodes, connections, versionCounter FROM workflow_entity WHERE id = ?').get(this.workflowId);
            if (!row) {
                return { success: false, error: `Workflow ${this.workflowId} not found` };
            }

            let nodes = JSON.parse(row.nodes || '[]');
            let connections = JSON.parse(row.connections || '{}');

            const brandName = data.restaurant_name || 'jDroid-X- CafeMenu';
            const contactPhone = data.contact_number || '+95 1224567890';
            const openingHours = data.opening_hours || '09:00 AM - 11:00 PM';
            const modelName = data.model || 'models/gemini-2.5-flash';
            const temperature = parseFloat(data.temperature ?? 0.2);
            const maxTokens = parseInt(data.max_tokens ?? 450, 10);
            const topP = parseFloat(data.top_p ?? 0.95);
            const topK = parseInt(data.top_k ?? 40, 10);
            const memoryLength = parseInt(data.contextWindowLength ?? 50, 10);
            const sessionKey = data.session_key || 'chat_history';

            const spreadsheetId = data.spreadsheet_id || 'restaurant_database';
            const inventorySheet = data.inventory_sheet || 'Inventory';
            const inventoryRange = data.inventory_range || 'A:G';
            const inventoryOp = data.inventory_operation || 'read';

            const faqSheet = data.faq_sheet || 'FAQ';
            const faqRange = data.faq_range || 'A:D';
            const faqOp = data.faq_operation || 'read';

            const ordersSheet = data.orders_sheet || 'Orders';
            const ordersMappingMode = data.orders_mapping_mode || 'autoMapInputData';
            const ordersOp = data.orders_operation || 'append';

            // 1. Build or format system prompt with dynamic tokens
            let systemPrompt = data.systemMessage;
            if (!systemPrompt || systemPrompt.trim().length < 20) {
                systemPrompt = `You are the friendly, helpful AI food ordering assistant for *${brandName}* on WhatsApp.\n\nRULES:\n1. Greet customers warmly and introduce *${brandName}*. Give quick action options: 🛒 Place an order | ℹ️ FAQ / Information | 📦 Check order / stock.\n2. When an order is placed, collect details step-by-step: items & quantity, customer name, delivery address, and payment method. ALWAYS check stock using the Get Inventory tool. If an item is sold out, politely refuse and suggest available items.\n3. Keep answers to questions concise using the Get FAQ tool.\n4. When asked to check order or stock, look it up and inform the customer accurately.\n5. If a customer requests to cancel an order, politely explain that orders cannot be canceled via WhatsApp AI and direct them to the owner at ${contactPhone}.\n6. Format your messages cleanly for WhatsApp using only single asterisks for *bold*.`;
            } else {
                systemPrompt = systemPrompt
                    .replace(/\{\{BRAND_NAME\}\}/g, brandName)
                    .replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone)
                    .replace(/\{\{OPENING_HOURS\}\}/g, openingHours);
            }

            // 2. Update AI Agent node (supports both old 'AI Agent' and new 'AI Agent1' naming)
            const agentNode = nodes.find(n => n.type?.includes('agent') || n.name?.toLowerCase().includes('agent'));
            if (agentNode) {
                agentNode.parameters = agentNode.parameters || {};
                agentNode.parameters.options = agentNode.parameters.options || {};
                agentNode.parameters.options.systemMessage = systemPrompt;
            }

            // 3. Update Model node - preserve existing credential IDs, only update params
            const modelNode = nodes.find(n => n.type?.includes('gemini') || n.type?.includes('lmChat') || n.name?.includes('Gemini'));
            if (modelNode) {
                modelNode.parameters = modelNode.parameters || {};
                modelNode.parameters.modelName = modelName;
                modelNode.parameters.options = modelNode.parameters.options || {};
                modelNode.parameters.options.temperature = temperature;
                modelNode.parameters.options.maxOutputTokens = maxTokens;
                modelNode.parameters.options.topP = topP;
                modelNode.parameters.options.topK = topK;
                // Preserve existing Gemini credential ID to avoid breaking auth
                if (!modelNode.credentials?.googlePalmApi) {
                    modelNode.credentials = {
                        googlePalmApi: {
                            id: 'gemini-api-cred-default',
                            name: 'Google Gemini API'
                        }
                    };
                }
            }

            // 4. Update Memory node
            const memNode = nodes.find(n => n.type?.includes('memory') || n.name?.includes('Memory'));
            if (memNode) {
                memNode.parameters = memNode.parameters || {};
                memNode.parameters.contextWindowLength = memoryLength;
                memNode.parameters.sessionKey = sessionKey;
            }

            // 5. Update native Google Sheets tool nodes (Get Inventory, FAQ, Post Orders)
            // Preserve existing credential IDs and document structure
            nodes.forEach(n => {
                if ((n.name === 'Get Inventory' || (n.type === 'n8n-nodes-base.googleSheetsTool' && n.parameters?.documentId)) && !n.name.includes('FAQ') && !n.name.includes('Order')) {
                    n.parameters = n.parameters || {};
                    // Preserve existing credential reference
                    if (!n.credentials) n.credentials = {};
                    n.credentials.googleSheetsOAuth2Api = n.credentials.googleSheetsOAuth2Api || { id: '93xN3gnk32S67PtE', name: 'Google Sheets account' };
                    // Keep documentId as reference link type
                    if (!n.parameters.documentId) {
                        n.parameters.documentId = { __rl: true, value: spreadsheetId, mode: 'list' };
                    }
                    if (typeof n.parameters.sheetName?.value === 'number') {
                        // Sheet name is stored as gsheet ID - keep it
                    } else {
                        n.parameters.sheetName = { __rl: true, value: inventorySheet, mode: 'name' };
                    }
                    if (data.inventory_range) {
                        n.parameters.options = n.parameters.options || {};
                        n.parameters.options.range = data.inventory_range;
                    }
                    if (data.inventory_operation) {
                        n.parameters.operation = data.inventory_operation;
                    }
                } else if ((n.name === 'FAQ' || n.name === 'Get FAQ') && n.type === 'n8n-nodes-base.googleSheetsTool') {
                    n.parameters = n.parameters || {};
                    if (!n.credentials) n.credentials = {};
                    n.credentials.googleSheetsOAuth2Api = n.credentials.googleSheetsOAuth2Api || { id: '93xN3gnk32S67PtE', name: 'Google Sheets account' };
                    if (typeof n.parameters.sheetName?.value === 'number') {
                        // Keep existing sheet reference
                    } else {
                        n.parameters.sheetName = { __rl: true, value: faqSheet, mode: 'name' };
                    }
                    if (data.faq_range) {
                        n.parameters.options = n.parameters.options || {};
                        n.parameters.options.range = data.faq_range;
                    }
                    if (data.faq_operation) {
                        n.parameters.operation = data.faq_operation;
                    }
                } else if (n.name === 'Post Orders' && n.type === 'n8n-nodes-base.googleSheetsTool') {
                    n.parameters = n.parameters || {};
                    if (!n.credentials) n.credentials = {};
                    n.credentials.googleSheetsOAuth2Api = n.credentials.googleSheetsOAuth2Api || { id: '93xN3gnk32S67PtE', name: 'Google Sheets account' };
                    if (typeof n.parameters.sheetName?.value === 'number') {
                        // Keep existing sheet reference
                    } else {
                        n.parameters.sheetName = { __rl: true, value: ordersSheet, mode: 'name' };
                    }
                    n.parameters.columns = { mappingMode: ordersMappingMode, value: null };
                    if (data.orders_operation) {
                        n.parameters.operation = data.orders_operation;
                    }
                }
            });

            // 6. Ensure full Section 5.1 production integration nodes from 05_n8n_Workflow_Diagram.txt
            const hasWebhook = nodes.some(n => n.name === 'WhatsApp Webhook Trigger');
            if (!hasWebhook) {
                nodes.push({
                    parameters: { httpMethod: 'POST', path: 'whatsapp-restaurant', options: {} },
                    id: 'node-webhook-trigger',
                    name: 'WhatsApp Webhook Trigger',
                    type: 'n8n-nodes-base.webhook',
                    typeVersion: 2,
                    position: [-80, 240]
                });
                nodes.push({
                    parameters: {
                        jsCode: "// Normalize incoming message from Meta WhatsApp Cloud Webhook or Demo Console\nconst item = $input.first().json;\nlet senderPhone = item.phone || item.from || '919876543210';\nlet senderName = item.name || 'Customer';\nlet messageText = item.text || item.message || '';\nif (item.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {\n    const m = item.entry[0].changes[0].value.messages[0];\n    senderPhone = m.from;\n    messageText = m.text?.body || '';\n}\nreturn [{ json: { chatInput: messageText, senderPhone, senderName, timestamp: new Date().toISOString() } }];"
                    },
                    id: 'node-normalize-msg',
                    name: 'Normalize Incoming Message',
                    type: 'n8n-nodes-base.code',
                    typeVersion: 2,
                    position: [100, 420]
                });
                nodes.push({
                    parameters: {
                        method: 'POST',
                        url: 'http://localhost:3585/api/test/chat',
                        sendBody: true,
                        specifyBody: 'json',
                        jsonBody: '={\n  "senderId": "{{ $(\'Normalize Incoming Message\').first().json.senderPhone }}",\n  "message": "{{ $json.output }}",\n  "isOutbound": true\n}'
                    },
                    id: 'node-send-response',
                    name: 'WhatsApp Send Response',
                    type: 'n8n-nodes-base.httpRequest',
                    typeVersion: 4.2,
                    position: [940, 200]
                });

                connections['WhatsApp Webhook Trigger'] = { main: [[{ node: 'Normalize Incoming Message', type: 'main', index: 0 }]] };
                connections['Normalize Incoming Message'] = { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] };
                connections['AI Agent'] = connections['AI Agent'] || {};
                connections['AI Agent'].main = [[{ node: 'WhatsApp Send Response', type: 'main', index: 0 }]];
            }

            const crypto = require('crypto');
            const newVersionId = crypto.randomUUID();
            const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
            const newVersionCounter = (row.versionCounter || 1) + 1;

            db.prepare('UPDATE workflow_entity SET nodes = ?, connections = ?, versionId = ?, versionCounter = ?, updatedAt = ? WHERE id = ?')
                .run(JSON.stringify(nodes), JSON.stringify(connections), newVersionId, newVersionCounter, now, this.workflowId);

            this.lastVersionId = newVersionId;
            this.lastUpdatedAt = now;
            this.syncedState.versionCounter = newVersionCounter;
            this.syncedState.versionId = newVersionId;
            this.syncedState.systemMessage = systemPrompt;
            this.syncedState.modelName = modelName;
            this.syncedState.temperature = temperature;
            this.syncedState.maxOutputTokens = maxTokens;
            this.syncedState.topP = topP;
            this.syncedState.topK = topK;
            this.syncedState.contextWindowLength = memoryLength;
            this.syncedState.sessionKey = sessionKey;
            this.syncedState.spreadsheetId = spreadsheetId;
            this.syncedState.inventorySheet = inventorySheet;
            this.syncedState.inventoryRange = inventoryRange;
            this.syncedState.inventoryOperation = inventoryOp;
            this.syncedState.faqSheet = faqSheet;
            this.syncedState.faqRange = faqRange;
            this.syncedState.faqOperation = faqOp;
            this.syncedState.ordersSheet = ordersSheet;
            this.syncedState.ordersMappingMode = ordersMappingMode;
            this.syncedState.ordersOperation = ordersOp;
            this.syncedState.nodeCount = nodes.length;
            this.syncedState.lastSyncedAt = new Date().toISOString();

            console.log(`[N8nSyncService] 🚀 Pushed configuration updates to n8n workflow '${row.name}' (v${newVersionCounter}). Brand: ${brandName}`);
            return {
                success: true,
                versionCounter: newVersionCounter,
                systemPrompt,
                nodeCount: nodes.length,
                syncedNodes: {
                    gemini: { modelName, temperature, maxTokens, topP },
                    memory: { memoryLength, sessionKey },
                    inventory: { sheet: inventorySheet, range: inventoryRange, op: inventoryOp },
                    faq: { sheet: faqSheet, range: faqRange, op: faqOp },
                    orders: { sheet: ordersSheet, mappingMode: ordersMappingMode, op: ordersOp }
                }
            };
        } catch (err) {
            console.error('[N8nSyncService] Error pushing to n8n:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = N8nSyncService;
