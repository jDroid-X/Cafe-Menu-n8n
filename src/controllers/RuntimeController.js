// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: RuntimeController (Isolated n8n lifecycle & health)
// ==========================================================

const N8nManager = require('../runtime/N8nManager');
const DatabaseSeeder = require('../database/seed');
const DatabaseService = require('../database/db');
const AuditModel = require('../models/AuditModel');
const ConfigModel = require('../models/ConfigModel');

class RuntimeController {
    constructor() {
        this.n8nManager = N8nManager.getInstance();
        this.auditModel = new AuditModel();
        this.configModel = new ConfigModel();
        this.db = DatabaseService.getInstance();
    }

    async getHealth(req, res) {
        try {
            const dbCheck = this.db.queryOne('SELECT 1 as alive');
            const n8nStatus = await this.n8nManager.getStatus();
            const integrations = this.configModel.getIntegrations();

            res.json({
                success: true,
                status: 'HEALTHY',
                timestamp: new Date().toISOString(),
                database: {
                    driver: 'node:sqlite (Node 24 native)',
                    connected: !!dbCheck
                },
                n8nRuntime: n8nStatus,
                integrations: integrations.map(i => ({ provider: i.provider, mode: i.mode, status: i.status }))
            });
        } catch (err) {
            res.status(500).json({ success: false, status: 'UNHEALTHY', error: err.message });
        }
    }

    async getN8nStatus(req, res) {
        try {
            const status = await this.n8nManager.getStatus();
            res.json({ success: true, data: status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async ensureN8n(req, res) {
        try {
            const result = await this.n8nManager.ensureN8nRunning();
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async startN8n(req, res) {
        try {
            const result = await this.n8nManager.startDemoInstance();
            // Return quickly since n8n starts in background
            // The workflow import will happen asynchronously after n8n is ready
            res.json({
                success: true,
                message: `n8n demo instance starting on port ${result.port}...`,
                port: result.port,
                pid: result.pid,
                note: 'Workflow will auto-import once n8n is fully ready (may take 30-60 seconds)'
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    stopN8n(req, res) {
        try {
            const result = this.n8nManager.stopDemoInstance();
            res.json(result);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    resetDemoData(req, res) {
        try {
            const result = DatabaseSeeder.seedAll(true);
            res.json(result);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getAuditLogs(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 50;
            const logs = this.auditModel.getRecent(limit, {
                severity: req.query.severity,
                component: req.query.component,
                search: req.query.search
            });
            res.json({ success: true, data: logs, count: logs.length });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    clearAuditLogs(req, res) {
        try {
            const result = this.auditModel.clear();
            res.json(result);
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Get the n8n API key from the n8n database (uses the most privileged key available)
     */
    _getN8nApiKey() {
        try {
            const fs = require('node:fs');
            const n8nDbPath = 'C:/Users/jiten/.n8n/database.sqlite';
            if (!fs.existsSync(n8nDbPath)) return null;
            const { DatabaseSync } = require('node:sqlite');
            const db = new DatabaseSync(n8nDbPath, { readOnly: true });
            // Prefer key with workflow:activate scope; fall back to any key
            const keys = db.prepare('SELECT apiKey, scopes FROM user_api_keys ORDER BY createdAt DESC').all();
            db.close();
            if (!keys.length) return null;
            // Prefer JWT-style keys (longer) with activate scope
            const withActivate = keys.filter(k => (k.scopes || '').includes('workflow:activate'));
            const best = withActivate.length ? withActivate[0] : keys[0];
            return best.apiKey;
        } catch (_) {
            return null;
        }
    }

    /**
     * Activate n8n workflow via n8n REST API (live, no restart needed)
     */
    async activateWorkflow(req, res) {
        try {
            const workflowId = req.body.workflowId || 'USdZGa2vqGuUstP7';
            const apiKey = this._getN8nApiKey();

            if (!apiKey) {
                return res.status(400).json({ success: false, error: 'No n8n API key found. Create one at http://localhost:5678/settings/api' });
            }

            // Use n8n REST API to activate (updates in-memory webhook registry immediately)
            const http = require('node:http');
            const activateResp = await new Promise((resolve, reject) => {
                const body = JSON.stringify({ active: true });
                const opts = {
                    hostname: 'localhost', port: 5678,
                    path: `/api/v1/workflows/${workflowId}`,
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                        'X-N8N-API-KEY': apiKey
                    }
                };
                const req2 = http.request(opts, (r) => {
                    let data = '';
                    r.on('data', c => data += c);
                    r.on('end', () => resolve({ status: r.statusCode, body: data }));
                });
                req2.on('error', reject);
                req2.write(body);
                req2.end();
            });

            if (activateResp.status >= 400) {
                return res.status(activateResp.status).json({
                    success: false,
                    error: `n8n API returned ${activateResp.status}: ${activateResp.body}`
                });
            }

            this.auditModel.log('RUNTIME', 'INFO', 'N8N_WORKFLOW_ACTIVATED', { workflowId });
            res.json({
                success: true,
                message: `Workflow ${workflowId} activated via n8n API. Webhook is now live!`,
                workflowId,
                n8nUrl: `http://localhost:5678/workflow/${workflowId}`
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async deactivateWorkflow(req, res) {
        try {
            const workflowId = req.body.workflowId || 'USdZGa2vqGuUstP7';
            const apiKey = this._getN8nApiKey();

            if (!apiKey) {
                return res.status(400).json({ success: false, error: 'No n8n API key found' });
            }

            const http = require('node:http');
            await new Promise((resolve, reject) => {
                const body = JSON.stringify({ active: false });
                const opts = {
                    hostname: 'localhost', port: 5678,
                    path: `/api/v1/workflows/${workflowId}`,
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                        'X-N8N-API-KEY': apiKey
                    }
                };
                const req2 = http.request(opts, (r) => {
                    let data = '';
                    r.on('data', c => data += c);
                    r.on('end', () => resolve({ status: r.statusCode, body: data }));
                });
                req2.on('error', reject);
                req2.write(body);
                req2.end();
            });

            this.auditModel.log('RUNTIME', 'INFO', 'N8N_WORKFLOW_DEACTIVATED', { workflowId });
            res.json({ success: true, message: `Workflow ${workflowId} deactivated`, workflowId });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = RuntimeController;
