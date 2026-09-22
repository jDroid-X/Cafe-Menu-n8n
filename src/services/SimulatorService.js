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
        const n8nStatus = await N8nManager.getInstance().getStatus();
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

        // 5. Route through n8n webhook — PRIORITY ORDER:
        //    [1] Real n8n on port 5678 (user's live instance with Google Sheets)
        //    [2] Demo n8n on configured port (isolated instance)
        //    [3] Local Mock AI fallback
        const ConfigModel = require('../models/ConfigModel');
        const configModel = new ConfigModel();
        const n8nCfg = configModel.getN8nConfig() || {};

        // Extract the actual webhook path — AUTHORITATIVE SOURCE: real n8n DB
        // This reads the UUID path that n8n actually registered (e.g. '3c72ad54-206b-...')
        let webhookPath = 'whatsapp-restaurant'; // final fallback
        try {
            const fs = require('node:fs');
            const n8nDbPath = 'C:/Users/jiten/.n8n/database.sqlite';
            if (fs.existsSync(n8nDbPath)) {
                const { DatabaseSync } = require('node:sqlite');
                const n8nDb = new DatabaseSync(n8nDbPath, { readOnly: true });
                const wfRow = n8nDb.prepare('SELECT nodes FROM workflow_entity WHERE id = ?').get('USdZGa2vqGuUstP7');
                n8nDb.close();
                if (wfRow) {
                    const wfNodes = JSON.parse(wfRow.nodes || '[]');
                    const wbNode = wfNodes.find(n => n.type === 'n8n-nodes-base.webhook');
                    if (wbNode?.parameters?.path) {
                        webhookPath = wbNode.parameters.path;
                        console.log(`[SimulatorService] 📍 Webhook path from n8n DB: ${webhookPath}`);
                    }
                }
            }
        } catch (_) {
            // Fall back to n8n_config stored value
            try {
                const storedUrl = n8nCfg.webhook_base_url || '';
                const pathMatch = storedUrl.match(/\/webhook\/(.+)$/);
                if (pathMatch && pathMatch[1]) webhookPath = pathMatch[1];
            } catch (_2) {}
        }

        // Helper: try a webhook endpoint (both production + test URLs), return reply string or null
        const tryWebhookOnPort = async (baseUrl) => {
            const payload = {
                phone: normalized.senderPhone,
                name: normalized.senderName || 'Customer',
                text: normalized.messageText,
                sessionId: sessionKey
            };
            const bodyStr = JSON.stringify(payload);

            // URL candidates to try in order:
            // 1. Production URL (requires workflow ACTIVE/published)
            // 2. Test URL (works even when workflow is inactive — for development)
            const candidates = [
                { url: `${baseUrl}/webhook/${webhookPath}`,      method: 'POST' },
                { url: `${baseUrl}/webhook-test/${webhookPath}`, method: 'POST' },
                { url: `${baseUrl}/webhook/${webhookPath}`,      method: 'GET'  },
                { url: `${baseUrl}/webhook-test/${webhookPath}`, method: 'GET'  },
            ];

            for (const { url, method } of candidates) {
                try {
                    const opts = {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(8000)
                    };
                    if (method === 'POST') opts.body = bodyStr;
                    else {
                        // For GET: append query params
                        const qs = new URLSearchParams(payload).toString();
                        opts.url = `${url}?${qs}`;
                    }

                    const finalUrl = method === 'GET' ? `${url}?${new URLSearchParams(payload).toString()}` : url;
                    console.log(`[SimulatorService] → Trying ${method} ${finalUrl}`);

                    const resp = await fetch(finalUrl, opts);

                    if (!resp.ok) {
                        console.log(`[SimulatorService]   ✗ ${resp.status} ${resp.statusText}`);
                        continue;
                    }

                    let data;
                    try { data = await resp.json(); } catch (_) { continue; }

                    // Extract reply from various n8n response shapes
                    const reply = data.output || data.text || data.message || data.reply
                        || (Array.isArray(data) && (data[0]?.output || data[0]?.text || data[0]?.message))
                        || null;

                    if (reply) {
                        console.log(`[SimulatorService]   ✅ Got reply via ${method} ${finalUrl}`);
                        return { reply: String(reply), urlUsed: finalUrl };
                    }
                    console.log(`[SimulatorService]   ✗ Response had no reply field:`, JSON.stringify(data).substring(0, 100));
                } catch (err) {
                    console.log(`[SimulatorService]   ✗ ${err.message}`);
                }
            }
            return null;
        };

        // Helper: check if a port is listening (fast TCP check)
        const isPortListening = (port) => new Promise((resolve) => {
            const net = require('node:net');
            const s = net.createConnection({ port, host: 'localhost' });
            s.once('connect', () => { s.destroy(); resolve(true); });
            s.once('error', () => { s.destroy(); resolve(false); });
            setTimeout(() => { s.destroy(); resolve(false); }, 1000);
        });

        // [1] Try REAL n8n on port 5678 first (has Google Sheets + Gemini credentials)
        let n8nReply = null;
        let n8nPortUsed = null;

        const realN8nAlive = await isPortListening(5678);
        if (realN8nAlive) {
            console.log(`[SimulatorService] → Trying real n8n on port 5678 (path: /webhook/${webhookPath} + test variant)`);
            const result = await tryWebhookOnPort('http://localhost:5678');
            if (result) { n8nReply = result.reply; n8nPortUsed = 5678; }
        }

        // [2] If real n8n didn't respond, try demo instance port
        if (!n8nReply && n8nIsActive && n8nStatus.configuredPort && n8nStatus.configuredPort !== 5678) {
            const demoPort = n8nStatus.configuredPort;
            console.log(`[SimulatorService] → Trying demo n8n on port ${demoPort}`);
            const result = await tryWebhookOnPort(`http://localhost:${demoPort}`);
            if (result) { n8nReply = result.reply; n8nPortUsed = demoPort; }
        }

        if (n8nReply) {
            this.memoryService.recordMessage(session.id, 'OUTBOUND', n8nReply);
            this.auditModel.log('SIMULATOR', 'INFO', 'N8N_WEBHOOK_ROUTED', {
                sender: sessionKey,
                port: n8nPortUsed,
                webhookPath: `/webhook/${webhookPath}`
            });
            return {
                normalizedInput: normalized,
                sessionKey,
                historyCount: history.length,
                agentDecision: 'N8N_API',
                toolsCalled: [],
                toolResults: [],
                reply: n8nReply,
                executionTimeMs: Date.now() - startTime,
                _n8nPort: n8nPortUsed
            };
        }

        // [3] Both n8n instances unreachable — fall through to local Mock AI
        if (realN8nAlive || n8nIsActive) {
            console.warn(`[SimulatorService] n8n reachable but webhook /webhook/${webhookPath} returned no reply. Falling back to Local Mock AI.`);
        } else {
            console.log('[SimulatorService] n8n not running — using Local Mock AI');
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

        // Ensure a reply is always present – fallback if LLM returned nothing
        if (!agentResult.reply) {
            agentResult.reply = 'Sorry, I could not process your request at this time. Please try again later.';
            agentResult.decision = agentResult.decision || 'NO_REPLY';
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
