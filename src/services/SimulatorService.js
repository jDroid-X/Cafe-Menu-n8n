// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Service: SimulatorService (Full Agent Execution & Trace Pipeline)
// ==========================================================

const PromptService = require('./PromptService');
const MemoryService = require('./MemoryService');
const AdapterFactory = require('../adapters/AdapterFactory');
const MenuModel = require('../models/MenuModel');
const FAQModel = require('../models/FAQModel');
const OrderModel = require('../models/OrderModel');
const AuditModel = require('../models/AuditModel');
const RestaurantModel = require('../models/RestaurantModel');

class SimulatorService {
    constructor() {
        this.promptService = new PromptService();
        this.memoryService = new MemoryService();
        this.menuModel = new MenuModel();
        this.faqModel = new FAQModel();
        this.orderModel = new OrderModel();
        this.auditModel = new AuditModel();
        this.restaurantModel = new RestaurantModel();

        // Simulation switches
        this.simulateLLMFailure = false;
        this.simulateInventoryFailure = false;
        this.simulateWhatsAppFailure = false;
    }

    setSimulationFlags({ llmFailure, inventoryFailure, whatsappFailure }) {
        if (llmFailure !== undefined) this.simulateLLMFailure = Boolean(llmFailure);
        if (inventoryFailure !== undefined) this.simulateInventoryFailure = Boolean(inventoryFailure);
        if (whatsappFailure !== undefined) this.simulateWhatsAppFailure = Boolean(whatsappFailure);
    }

    getSimulationFlags() {
        return {
            simulateLLMFailure: this.simulateLLMFailure,
            simulateInventoryFailure: this.simulateInventoryFailure,
            simulateWhatsAppFailure: this.simulateWhatsAppFailure
        };
    }

    async processMessage(rawInput) {
        const startTime = Date.now();
        const whatsappAdapter = AdapterFactory.getWhatsAppAdapter();
        const llmAdapter = AdapterFactory.getLLMAdapter();

        // 0. Check if n8n is running — route through webhook instead of local LLM
        const N8nManager = require('../runtime/N8nManager');
        const n8nStatus = N8nManager.getInstance().getStatus();
        const n8nIsActive = n8nStatus.isRunning && n8nStatus.configuredPort;

        // 1. Normalize message
        const normalized = whatsappAdapter.normalizeIncoming(rawInput);
        const sessionKey = normalized.senderPhone || normalized.senderId || 'demo_session_1';

        // Extract customer name if introduced in conversational message
        const nameIntroMatch = normalized.messageText.match(/(?:my name is|i am|name is|this is)\s*([A-Za-z\s]+?)(?:,|\.|\bwant\b|\band\b|$)/i);
        if (nameIntroMatch && nameIntroMatch[1]) {
            const detectedName = nameIntroMatch[1].trim();
            if (detectedName && detectedName.length > 1 && !/^(here|ready|ordering|asking)/i.test(detectedName)) {
                normalized.senderName = detectedName;
            }
        }

        // 2. Manage session & memory
        const session = this.memoryService.getSession(sessionKey, normalized.senderName, normalized.senderPhone);
        this.memoryService.recordMessage(session.id, 'INBOUND', normalized.messageText, normalized.raw);

        const history = this.memoryService.getContextHistory(session.id);
        const historyText = this.memoryService.formatHistoryForPrompt(history);

        // 3. Assemble dynamic system prompt
        const systemPrompt = this.promptService.assembleSystemPrompt();

        // 4. LLM Failure simulation (T10)
        const rest = this.restaurantModel.getConfig() || {};
        const brand = rest.restaurant_name || 'jDroid-X- CafeMenu';
        const phone = rest.contact_number || '+95 1224567890';

        if (this.simulateLLMFailure) {
            const fallback = `I apologize, but our AI service is currently unavailable. Please contact ${brand} at ${phone}.`;
            this.memoryService.recordMessage(session.id, 'OUTBOUND', fallback);
            this.auditModel.log('SIMULATOR', 'ERROR', 'SIMULATED_LLM_FAILURE', { userMessage: normalized.messageText });
            return {
                normalizedInput: normalized,
                agentDecision: 'SIMULATED_LLM_FAILURE',
                toolsCalled: [],
                toolResults: [{ error: 'Simulated LLM service crash' }],
                reply: fallback,
                executionTimeMs: Date.now() - startTime
            };
        }

        // 5. Route through n8n webhook if active (Demo mode with n8n)
        if (n8nIsActive) {
            try {
                const webhookUrl = n8nStatus.webhookUrl || `http://localhost:${n8nStatus.configuredPort}/webhook/whatsapp-restaurant`;
                const resp = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: normalized.senderPhone,
                        name: normalized.senderName || 'Customer',
                        text: normalized.messageText
                    })
                });
                if (!resp.ok) throw new Error(`n8n webhook HTTP ${resp.status}`);
                const n8nData = await resp.json();
                const n8nReply = n8nData.output || n8nData.text || JSON.stringify(n8nData);
                this.memoryService.recordMessage(session.id, 'OUTBOUND', n8nReply);
                this.auditModel.log('SIMULATOR', 'INFO', 'N8N_WEBHOOK_ROUTES', { sender: sessionKey, webhookUrl });
                return {
                    normalizedInput: normalized,
                    sessionKey,
                    historyCount: history.length,
                    agentDecision: 'N8N_WEBHOOK',
                    toolsCalled: [],
                    toolResults: [],
                    reply: n8nReply,
                    executionTimeMs: Date.now() - startTime,
                    _n8nRaw: n8nData
                };
            } catch (n8nErr) {
                console.warn('[SimulatorService] n8n webhook failed, falling back to local LLM:', n8nErr.message);
                // Fall through to local LLM below
            }
        }

        // 6. Define Tools with Inventory Failure simulation hook (T09)
        const tools = {
            getAvailableItems: () => {
                if (this.simulateInventoryFailure) {
                    throw new Error('Inventory database connection timeout');
                }
                return this.menuModel.getAvailableItems();
            },
            checkAvailability: (name) => {
                if (this.simulateInventoryFailure) {
                    return { exists: false, available: false, reason: 'Inventory service unavailable' };
                }
                return this.menuModel.checkAvailability(name);
            },
            getFAQ: (q) => this.faqModel.findMatching(q),
            postOrder: (orderData) => this.orderModel.create(orderData),
            lookupOrder: (q) => this.orderModel.findMatching(q)
        };

        // 7. Execute AI Reasoning
        let agentResult;
        try {
            agentResult = await llmAdapter.generateResponse({
                systemPrompt,
                historyText,
                userMessage: normalized.messageText,
                tools,
                session
            });
        } catch (err) {
            this.auditModel.log('SIMULATOR', 'ERROR', 'AGENT_REASONING_ERROR', { error: err.message });
            agentResult = {
                reply: `Sorry, I encountered an issue checking our restaurant menu. Please try again or call us at ${phone}.`,
                decision: 'REASONING_ERROR',
                toolsCalled: [],
                toolResults: [{ error: err.message }]
            };
        }

        // 8. Check WhatsApp dispatch failure simulation (T11)
        if (this.simulateWhatsAppFailure) {
            this.auditModel.log('SIMULATOR', 'WARNING', 'SIMULATED_WHATSAPP_FAILURE', { reply: agentResult.reply });
        } else {
            await whatsappAdapter.sendMessage(sessionKey, agentResult.reply);
        }

        // 8. Record Outbound Message in Memory
        this.memoryService.recordMessage(session.id, 'OUTBOUND', agentResult.reply);

        // 9. Audit Log
        this.auditModel.log('SIMULATOR', 'INFO', 'MESSAGE_PROCESSED', {
            sender: sessionKey,
            decision: agentResult.decision,
            toolsCalled: agentResult.toolsCalled,
            executionTimeMs: Date.now() - startTime
        });

        return {
            normalizedInput: normalized,
            sessionKey,
            historyCount: history.length,
            agentDecision: agentResult.decision,
            toolsCalled: agentResult.toolsCalled,
            toolResults: agentResult.toolResults,
            reply: agentResult.reply,
            executionTimeMs: Date.now() - startTime
        };
    }
}

module.exports = SimulatorService;
