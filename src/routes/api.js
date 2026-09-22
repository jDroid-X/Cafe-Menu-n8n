// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Router: api.js (Master REST API Endpoint Mapping)
// ==========================================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { verifyJwt, requireRole } = require('../middleware/auth');
const ConfigService = require('../services/ConfigService');
// Login route (unprotected)
router.post('/auth/login', (req, res) => {
  const auth = new AuthController();
  return auth.login(req, res);
});
// Apply JWT verification to all subsequent routes
router.use(verifyJwt);

const RestaurantController = require('../controllers/RestaurantController');
const MenuController = require('../controllers/MenuController');
const FAQController = require('../controllers/FAQController');
const OrderController = require('../controllers/OrderController');
const ConfigController = require('../controllers/ConfigController');




const ConfigAppController = require('../controllers/ConfigAppController');
const ToolsController = require('../controllers/ToolsController');
const SimulatorController = require('../controllers/SimulatorController');
const RuntimeController = require('../controllers/RuntimeController');
const restaurant = new RestaurantController();
const menu = new MenuController();
const faq = new FAQController();
const order = new OrderController();
const config = new ConfigController();
const tools = new ToolsController();
const simulator = new SimulatorController();
const runtime = new RuntimeController();
const configApp = new ConfigAppController();

// 1. Health & Status
router.get('/health', (req, res) => runtime.getHealth(req, res));

// 2. Restaurant Profile
router.get('/config/restaurant', (req, res) => restaurant.getConfig(req, res));
router.put('/config/restaurant', (req, res) => restaurant.updateConfig(req, res));

// 3. Menu Items
router.get('/menu', (req, res) => menu.getAll(req, res));
router.get('/menu/:id', (req, res) => menu.getById(req, res));
router.post('/menu', (req, res) => menu.create(req, res));
router.post('/menu/bulk', (req, res) => menu.bulkImport(req, res));
router.put('/menu/:id', (req, res) => menu.update(req, res));
router.delete('/menu/:id', (req, res) => menu.delete(req, res));
router.patch('/menu/:id/toggle-status', (req, res) => menu.toggleStatus(req, res));

// 4. FAQ Items
router.post('/menu/refresh', (req, res) => menu.refreshFromSheet(req, res));
router.get('/faq', (req, res) => faq.getAll(req, res));
router.get('/faq/:id', (req, res) => faq.getById(req, res));
router.post('/faq', (req, res) => faq.create(req, res));
router.put('/faq/:id', (req, res) => faq.update(req, res));
router.delete('/faq/:id', (req, res) => faq.delete(req, res));

// 5. Orders
router.get('/orders', (req, res) => order.getAll(req, res));
router.get('/orders/analytics', (req, res) => order.getAnalytics(req, res));
router.get('/orders/:id', (req, res) => order.getById(req, res));
router.post('/orders', (req, res) => order.create(req, res));
router.patch('/orders/:id/status', (req, res) => order.updateStatus(req, res));
router.patch('/orders/:id/payment', (req, res) => order.updatePayment(req, res));

// 6. Configurations & System Prompts
router.get('/config/agent', (req, res) => config.getAgentConfig(req, res));
router.put('/config/agent', (req, res) => config.updateAgentConfig(req, res));
router.get('/config/memory', (req, res) => config.getMemoryConfig(req, res));
router.put('/config/memory', (req, res) => config.updateMemoryConfig(req, res));
router.get('/config/integrations', (req, res) => config.getIntegrations(req, res));
router.put('/config/integrations/:provider', (req, res) => config.updateIntegration(req, res));
router.get('/config/prompt-preview', (req, res) => config.getPromptPreview(req, res));

router.get('/config/app', (req, res) => configApp.getAppConfig(req, res));
router.patch('/config/app', requireRole('admin'), (req, res) => configApp.updateAppConfig(req, res));
// 7. Tools for n8n AI Agent / External Webhooks
router.get('/tools/inventory', (req, res) => tools.getInventory(req, res));
router.get('/tools/faq', (req, res) => tools.getFAQ(req, res));
router.post('/tools/order', (req, res) => tools.postOrder(req, res));

// 8. Test Console & Simulation Control
router.post('/test/chat', (req, res) => simulator.chat(req, res));
router.get('/test/simulation-flags', (req, res) => simulator.getSimulationFlags(req, res));
router.post('/test/simulation-flags', (req, res) => simulator.setSimulationFlags(req, res));
router.post('/test/reset-session', (req, res) => simulator.resetSession(req, res));

// 9. Runtime, Seed, & Audit
router.get('/runtime/n8n/status', (req, res) => runtime.getN8nStatus(req, res));
router.post('/runtime/n8n/start', (req, res) => runtime.startN8n(req, res));
router.post('/runtime/n8n/stop', (req, res) => runtime.stopN8n(req, res));
router.post('/demo/reset', (req, res) => runtime.resetDemoData(req, res));
router.get('/audit/logs', (req, res) => runtime.getAuditLogs(req, res));
router.delete('/audit/logs', (req, res) => runtime.clearAuditLogs(req, res));

// 10. n8n Two-Way Live Workflow Synchronization
router.get('/n8n/sync', (req, res) => config.getN8nSync(req, res));
router.post('/n8n/sync/manual', requireRole('admin'), async (req, res) => {
  try {
    const n8nService = require('../services/N8nWorkflowService').getInstance();
    await n8nService.pushToGitHub();
    // Emit a simple notification via console (could be SSE later)
    console.log('[Notification] Manual n8n sync completed');
    res.json({ success: true, message: 'Manual n8n sync completed' });
  } catch (err) {
    console.error('[ManualSync] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/n8n/sync', (req, res) => config.triggerN8nSync(req, res));
router.get('/config/n8n-workflow', (req, res) => config.getFullN8nWorkflowConfig(req, res));
router.post('/config/n8n-workflow', (req, res) => config.saveFullN8nWorkflowConfig(req, res));

// 11. n8n Workflow Activation (toggle active state via n8n REST API)
router.post('/runtime/n8n/activate', (req, res) => runtime.activateWorkflow(req, res));
router.post('/runtime/n8n/deactivate', (req, res) => runtime.deactivateWorkflow(req, res));

module.exports = router;

// 12. WhatsApp Webhook Verification (for real WhatsApp Business Cloud API)
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
