// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: ConfigController (Agent, Memory, Integrations, Prompt Preview)
// ==========================================================

const ConfigModel = require('../models/ConfigModel');
const PromptService = require('../services/PromptService');

class ConfigController {
    constructor() {
        this.model = new ConfigModel();
        this.promptService = new PromptService();
    }

    // Mask sensitive secrets in JSON or text
    maskSecrets(obj) {
        if (!obj) return obj;
        const copy = JSON.parse(JSON.stringify(obj));

        if (copy.credential_reference && copy.credential_reference.includes('ENV:')) {
            // Keep environment variable references intact
        }

        if (copy.config_json) {
            try {
                const parsed = JSON.parse(copy.config_json);
                if (parsed.access_token) parsed.access_token = '••••••••' + parsed.access_token.slice(-4);
                if (parsed.api_key) parsed.api_key = '••••••••' + parsed.api_key.slice(-4);
                if (parsed.app_secret) parsed.app_secret = '••••••••' + parsed.app_secret.slice(-4);
                copy.config_json = JSON.stringify(parsed);
            } catch (e) {}
        }
        return copy;
    }

    getAgentConfig(req, res) {
        try {
            const config = this.model.getAgentConfig();
            res.json({ success: true, data: config });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    updateAgentConfig(req, res) {
        try {
            const updated = this.model.updateAgentConfig(req.body);
            res.json({ success: true, data: updated, message: 'Agent configuration updated' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    getMemoryConfig(req, res) {
        try {
            const config = this.model.getMemoryConfig();
            res.json({ success: true, data: config });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    updateMemoryConfig(req, res) {
        try {
            const updated = this.model.updateMemoryConfig(req.body);
            res.json({ success: true, data: updated, message: 'Memory configuration updated' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    getIntegrations(req, res) {
        try {
            const items = this.model.getIntegrations().map(item => this.maskSecrets(item));
            res.json({ success: true, data: items });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    updateIntegration(req, res) {
        try {
            const { provider } = req.params;
            const updated = this.model.updateIntegration(provider, req.body);
            res.json({ success: true, data: this.maskSecrets(updated), message: `${provider} integration updated` });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    getPromptPreview(req, res) {
        try {
            // Prefer live n8n-synced system prompt if available and non-empty
            try {
                const N8nSyncService = require('../services/N8nSyncService');
                const n8nSync = N8nSyncService.getInstance().getSyncStatus();
                if (n8nSync && n8nSync.synced && n8nSync.systemMessage && n8nSync.systemMessage.trim().length > 20) {
                    return res.json({ success: true, data: { systemPrompt: n8nSync.systemMessage } });
                }
            } catch (_) {}
            const assembled = this.promptService.assembleSystemPrompt();
            res.json({ success: true, data: { systemPrompt: assembled } });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getN8nSync(req, res) {
        try {
            const N8nSyncService = require('../services/N8nSyncService');
            const sync = N8nSyncService.getInstance().getSyncStatus();
            res.json({ success: true, data: sync });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    triggerN8nSync(req, res) {
        try {
            const N8nSyncService = require('../services/N8nSyncService');
            const sync = N8nSyncService.getInstance().syncNow();
            res.json({ success: true, data: sync, message: 'Successfully synced with n8n workflow USdZGa2vqGuUstP7' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getFullN8nWorkflowConfig(req, res) {
        try {
            const RestaurantModel = require('../models/RestaurantModel');
            const N8nSyncService = require('../services/N8nSyncService');
            const restModel = new RestaurantModel();

            const rest = restModel.getConfig() || {};
            const agent = this.model.getAgentConfig() || {};
            const memory = this.model.getMemoryConfig() || {};
            const n8n = this.model.getN8nConfig() || {};
            const sheetsIntegration = this.model.getIntegration('GOOGLE_SHEETS') || {};
            const llmIntegration = this.model.getIntegration('LLM') || {};
            const sync = N8nSyncService.getInstance().getSyncStatus();

            let sheetsConfig = {};
            try {
                sheetsConfig = JSON.parse(sheetsIntegration.config_json || '{}');
            } catch (e) {}

            let llmConfig = {};
            try {
                llmConfig = JSON.parse(llmIntegration.config_json || '{}');
            } catch (e) {}

            res.json({
                success: true,
                data: {
                    restaurant: {
                        restaurant_name: rest.restaurant_name || 'jDroid-X- CafeMenu',
                        contact_number: rest.contact_number || '+95 1224567890',
                        opening_hours: rest.opening_hours || '09:00 AM - 11:00 PM',
                        currency: rest.currency || 'INR',
                        currency_symbol: rest.currency_symbol || '₹',
                        delivery_enabled: Boolean(rest.delivery_enabled),
                        min_order_amount: rest.min_order_amount || 0
                    },
                    agent: {
                        model: sync.modelName || llmConfig.model || 'models/gemini-1.5-flash',
                        temperature: sync.temperature ?? agent.temperature ?? 0.2,
                        max_tokens: sync.maxOutputTokens ?? agent.max_tokens ?? 450,
                        top_p: sync.topP ?? 0.95,
                        top_k: sync.topK ?? 40,
                        gemini_host: 'https://generativelanguage.googleapis.com',
                        gemini_api_key_configured: sync.geminiCredentialConfigured ?? true,
                        gemini_api_key_masked: '••••••••••••AIzaSyDemoKey',
                        systemMessage: sync.systemMessage || agent.restaurant_rules || ''
                    },
                    memory: {
                        contextWindowLength: sync.contextWindowLength ?? memory.max_messages ?? 10,
                        session_key: sync.sessionKey || memory.session_key_expression || 'chat_history',
                        memory_type: memory.memory_type || 'WINDOW_BUFFER'
                    },
                    sheets: {
                        spreadsheet_id: sync.spreadsheetId || sheetsConfig.spreadsheet_id || 'restaurant_database',
                        inventory_sheet: sync.inventorySheet || sheetsConfig.inventory_sheet || 'Inventory',
                        inventory_range: sync.inventoryRange || sheetsConfig.inventory_range || 'A:G',
                        inventory_operation: sync.inventoryOperation || 'read',
                        inventory_header_row: sheetsConfig.inventory_header_row || 1,

                        faq_sheet: sync.faqSheet || sheetsConfig.faq_sheet || 'FAQ',
                        faq_range: sync.faqRange || sheetsConfig.faq_range || 'A:D',
                        faq_operation: sync.faqOperation || 'read',
                        faq_header_row: sheetsConfig.faq_header_row || 1,

                        orders_sheet: sync.ordersSheet || sheetsConfig.orders_sheet || 'Orders',
                        orders_mapping_mode: sync.ordersMappingMode || sheetsConfig.orders_mapping_mode || 'autoMapInputData',
                        orders_operation: sync.ordersOperation || 'append',

                        oauth_client_id: sheetsConfig.client_id || 'demo-client-id.apps.googleusercontent.com',
                        oauth_configured: sync.sheetsCredentialConfigured ?? true,
                        sheets_credential_id: sync.sheetsCredentialId || null
                    },
                    n8n: {
                        workflow_name: sync.workflowName || n8n.workflow_name || 'CafeMenu Whatsapp',
                        workflow_id: sync.workflowId || 'USdZGa2vqGuUstP7',
                        webhook_url: n8n.webhook_base_url || 'http://localhost:5678/webhook/whatsapp-restaurant',
                        version_counter: sync.versionCounter,
                        last_synced_at: sync.lastSyncedAt,
                        node_count: sync.nodeCount || 7,
                        synced: sync.synced
                    }
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async saveFullN8nWorkflowConfig(req, res) {
        try {
            const RestaurantModel = require('../models/RestaurantModel');
            const N8nSyncService = require('../services/N8nSyncService');
            const restModel = new RestaurantModel();
            const body = req.body || {};

            // 1. Update Restaurant Brand & Profile (Single Source of Truth)
            const updatedRest = restModel.updateConfig({
                restaurant_name: body.restaurant_name,
                contact_number: body.contact_number,
                opening_hours: body.opening_hours,
                currency: body.currency,
                currency_symbol: body.currency_symbol,
                delivery_enabled: body.delivery_enabled !== undefined ? Boolean(body.delivery_enabled) : undefined,
                min_order_amount: body.min_order_amount !== undefined ? parseFloat(body.min_order_amount) : undefined
            });

            // 2. Update Agent Configuration
            this.model.updateAgentConfig({
                restaurant_rules: body.systemMessage,
                identity_prompt: (body.systemMessage || '').slice(0, 500),
                temperature: body.temperature !== undefined ? parseFloat(body.temperature) : undefined,
                max_tokens: body.max_tokens !== undefined ? parseInt(body.max_tokens, 10) : undefined
            });

            // 3. Update Memory Configuration
            if (body.contextWindowLength !== undefined || body.session_key !== undefined) {
                this.model.updateMemoryConfig({
                    max_messages: body.contextWindowLength !== undefined ? parseInt(body.contextWindowLength, 10) : undefined,
                    session_key_expression: body.session_key
                });
            }

            // 4. Update n8n Configuration
            if (body.webhook_url) {
                this.model.updateN8nConfig({
                    webhook_base_url: body.webhook_url
                });
            }

            // 5. Update Sheets & LLM Integration Configs
            const sheetsConfig = {
                inventory_sheet: body.inventory_sheet || 'Inventory',
                inventory_range: body.inventory_range || 'A:G',
                inventory_operation: body.inventory_operation || 'read',
                inventory_header_row: parseInt(body.inventory_header_row || 1, 10),
                faq_sheet: body.faq_sheet || 'FAQ',
                faq_range: body.faq_range || 'A:D',
                faq_operation: body.faq_operation || 'read',
                faq_header_row: parseInt(body.faq_header_row || 1, 10),
                orders_sheet: body.orders_sheet || 'Orders',
                orders_mapping_mode: body.orders_mapping_mode || 'autoMapInputData',
                orders_operation: body.orders_operation || 'append',
                spreadsheet_id: body.spreadsheet_id || 'restaurant_database',
                client_id: body.sheets_client_id || 'demo-client-id.apps.googleusercontent.com'
            };
            this.model.updateIntegration('GOOGLE_SHEETS', {
                config_json: JSON.stringify(sheetsConfig)
            });

            const llmConfig = {
                model: body.model || 'models/gemini-1.5-flash',
                temperature: body.temperature !== undefined ? parseFloat(body.temperature) : 0.2,
                max_tokens: body.max_tokens !== undefined ? parseInt(body.max_tokens, 10) : 450,
                top_p: body.top_p !== undefined ? parseFloat(body.top_p) : 0.95,
                top_k: body.top_k !== undefined ? parseInt(body.top_k, 10) : 40
            };
            this.model.updateIntegration('LLM', {
                config_json: JSON.stringify(llmConfig)
            });

            // 6. Push directly to active n8n workflow canvas with credentials
            const pushResult = await N8nSyncService.getInstance().pushToN8n({
                restaurant_name: updatedRest.restaurant_name,
                contact_number: updatedRest.contact_number,
                opening_hours: updatedRest.opening_hours,
                model: body.model || 'models/gemini-1.5-flash',
                gemini_api_key: body.gemini_api_key,
                gemini_host: body.gemini_host,
                temperature: body.temperature ?? 0.2,
                max_tokens: body.max_tokens ?? 450,
                top_p: body.top_p ?? 0.95,
                top_k: body.top_k ?? 40,
                contextWindowLength: body.contextWindowLength ?? 10,
                session_key: body.session_key ?? 'chat_history',
                spreadsheet_id: sheetsConfig.spreadsheet_id,
                inventory_sheet: sheetsConfig.inventory_sheet,
                inventory_range: sheetsConfig.inventory_range,
                inventory_operation: sheetsConfig.inventory_operation,
                faq_sheet: sheetsConfig.faq_sheet,
                faq_range: sheetsConfig.faq_range,
                faq_operation: sheetsConfig.faq_operation,
                orders_sheet: sheetsConfig.orders_sheet,
                orders_mapping_mode: sheetsConfig.orders_mapping_mode,
                orders_operation: sheetsConfig.orders_operation,
                sheets_client_id: body.sheets_client_id,
                sheets_client_secret: body.sheets_client_secret,
                systemMessage: body.systemMessage
            });

            res.json({
                success: true,
                message: `Configuration saved and synchronized with n8n workflow! Brand updated to '${updatedRest.restaurant_name}'.`,
                data: {
                    restaurant: updatedRest,
                    n8nPush: pushResult
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = ConfigController;
