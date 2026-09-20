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

    async startN8n(req, res) {
        try {
            const result = await this.n8nManager.startDemoInstance();
            res.json(result);
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
}

module.exports = RuntimeController;
