// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Router: api.js (Master Chronological REST API Endpoint Mapping)
// Group-by-Hierarchy OOPS MVC Architecture
// ==========================================================

const express = require('express');
const router = express.Router();

// Controllers (OOPS MVC)
const AuthController = require('../controllers/AuthController');
const RestaurantController = require('../controllers/RestaurantController');
const MenuController = require('../controllers/MenuController');
const FAQController = require('../controllers/FAQController');
const OrderController = require('../controllers/OrderController');
const ConfigController = require('../controllers/ConfigController');
const ConfigAppController = require('../controllers/ConfigAppController');
const ToolsController = require('../controllers/ToolsController');
const SimulatorController = require('../controllers/SimulatorController');
const RuntimeController = require('../controllers/RuntimeController');

// Services & Middleware
const { verifySession, requireRole } = require('../middleware/auth');
const ConfigService = require('../services/ConfigService');

// Singleton Controller Instances (Avoid duplicate memory allocation)
const auth = new AuthController();
const restaurant = new RestaurantController();
const menu = new MenuController();
const faq = new FAQController();
const order = new OrderController();
const config = new ConfigController();
const configApp = new ConfigAppController();
const tools = new ToolsController();
const simulator = new SimulatorController();
const runtime = new RuntimeController();

// ----------------------------------------------------------
// 1. AUTHENTICATION & IDENTITY (Public Access)
// ----------------------------------------------------------
router.post('/auth/login', (req, res) => auth.login(req, res));
router.post('/auth/register', (req, res) => auth.register(req, res));

// ----------------------------------------------------------
// 2. JWT & SESSION GUARD MIDDLEWARE
// Applied to protected endpoints (with developer fallback for local/public tasks)
// ----------------------------------------------------------
router.use(verifySession);

// ----------------------------------------------------------
// 3. HEALTH & SYSTEM DIAGNOSTICS
// ----------------------------------------------------------
router.get('/health', (req, res) => runtime.getHealth(req, res));

// ----------------------------------------------------------
// 4. RESTAURANT BRAND & PROFILE MANAGEMENT
// ----------------------------------------------------------
router.get('/config/restaurant', (req, res) => restaurant.getConfig(req, res));
router.put('/config/restaurant', (req, res) => restaurant.updateConfig(req, res));

// ----------------------------------------------------------
// 5. MENU CATALOG & INVENTORY MANAGEMENT
// ----------------------------------------------------------
router.get('/menu', (req, res) => menu.getAll(req, res));
router.get('/menu/:id', (req, res) => menu.getById(req, res));
router.post('/menu', (req, res) => menu.create(req, res));
router.post('/menu/bulk', (req, res) => menu.bulkImport(req, res));
router.put('/menu/:id', (req, res) => menu.update(req, res));
router.delete('/menu/:id', (req, res) => menu.delete(req, res));
router.patch('/menu/:id/toggle-status', (req, res) => menu.toggleStatus(req, res));
router.post('/menu/refresh', (req, res) => menu.refreshFromSheet(req, res));

// ----------------------------------------------------------
// 6. KNOWLEDGE BASE & FAQS
// ----------------------------------------------------------
router.get('/faq', (req, res) => faq.getAll(req, res));
router.get('/faq/:id', (req, res) => faq.getById(req, res));
router.post('/faq', (req, res) => faq.create(req, res));
router.put('/faq/:id', (req, res) => faq.update(req, res));
router.delete('/faq/:id', (req, res) => faq.delete(req, res));

// ----------------------------------------------------------
// 7. ORDERS & FINANCIAL TELEMETRY (CFO Level)
// ----------------------------------------------------------
router.get('/orders', (req, res) => order.getAll(req, res));
router.get('/orders/analytics', (req, res) => order.getAnalytics(req, res));
router.get('/orders/:id', (req, res) => order.getById(req, res));
router.post('/orders', (req, res) => order.create(req, res));
router.patch('/orders/:id/status', (req, res) => order.updateStatus(req, res));
router.patch('/orders/:id/payment', (req, res) => order.updatePayment(req, res));

// ----------------------------------------------------------
// 8. AI ENGINE, PROMPT RULES (1-6) & MEMORY CONFIGURATION
// ----------------------------------------------------------
router.get('/config/agent', (req, res) => config.getAgentConfig(req, res));
router.put('/config/agent', requireRole('admin'), (req, res) => config.updateAgentConfig(req, res));
router.get('/config/memory', (req, res) => config.getMemoryConfig(req, res));
router.put('/config/memory', requireRole('admin'), (req, res) => config.updateMemoryConfig(req, res));
router.get('/config/integrations', (req, res) => config.getIntegrations(req, res));
router.put('/config/integrations/:provider', requireRole('admin'), (req, res) => config.updateIntegration(req, res));
router.get('/config/prompt-preview', (req, res) => config.getPromptPreview(req, res));
router.get('/config/app', (req, res) => configApp.getAppConfig(req, res));
router.patch('/config/app', requireRole('admin'), (req, res) => configApp.updateAppConfig(req, res));

// ----------------------------------------------------------
// 9. N8N TWO-WAY WORKFLOW SYNCHRONIZATION & ACTIVATION
// ----------------------------------------------------------
router.get('/n8n/sync', (req, res) => config.getN8nSync(req, res));
router.post('/n8n/sync', (req, res) => config.triggerN8nSync(req, res));
router.post('/n8n/sync/manual', requireRole('admin'), (req, res) => config.triggerN8nSync(req, res));
router.get('/config/n8n-workflow', (req, res) => config.getFullN8nWorkflowConfig(req, res));
router.post('/config/n8n-workflow', requireRole('admin'), (req, res) => config.saveFullN8nWorkflowConfig(req, res));
router.post('/runtime/n8n/activate', (req, res) => runtime.activateWorkflow(req, res));
router.post('/runtime/n8n/deactivate', (req, res) => runtime.deactivateWorkflow(req, res));

// ----------------------------------------------------------
// 10. TOOLS FOR N8N AI AGENT / EXTERNAL WEBHOOKS
// ----------------------------------------------------------
router.get('/tools/inventory', (req, res) => tools.getInventory(req, res));
router.get('/tools/faq', (req, res) => tools.getFAQ(req, res));
router.post('/tools/order', (req, res) => tools.postOrder(req, res));

// ----------------------------------------------------------
// 11. WHATSAPP BUSINESS CLOUD WEBHOOK (Verification & Inbound)
// ----------------------------------------------------------
router.get('/webhook/whatsapp-verify', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = ConfigService.getInstance().getWhatsAppVerifyToken();
  if (mode === 'subscribe' && token && token === expectedToken) {
    console.log('[Webhook] Verification successful');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed');
    res.sendStatus(403);
  }
});

// ----------------------------------------------------------
// 12. TEST CONSOLE & SIMULATION CONTROL
// ----------------------------------------------------------
router.post('/test/chat', (req, res) => simulator.chat(req, res));
router.get('/test/simulation-flags', (req, res) => simulator.getSimulationFlags(req, res));
router.post('/test/simulation-flags', (req, res) => simulator.setSimulationFlags(req, res));
router.post('/test/reset-session', (req, res) => simulator.resetSession(req, res));

// ----------------------------------------------------------
// 13. RUNTIME PROCESS, RESET & AUDIT TELEMETRY
// ----------------------------------------------------------
router.get('/runtime/n8n/status', (req, res) => runtime.getN8nStatus(req, res));
router.post('/runtime/n8n/start', (req, res) => runtime.startN8n(req, res));
router.post('/runtime/n8n/stop', (req, res) => runtime.stopN8n(req, res));
router.post('/demo/reset', (req, res) => runtime.resetDemoData(req, res));
router.get('/audit/logs', (req, res) => runtime.getAuditLogs(req, res));
router.delete('/audit/logs', (req, res) => runtime.clearAuditLogs(req, res));

module.exports = router;
