// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Runtime: N8nManager (Safe Port Discovery & Isolated Runner)
// ==========================================================

const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const ConfigModel = require('../models/ConfigModel');
const AuditModel = require('../models/AuditModel');

class N8nManager {
    static instance = null;

    constructor() {
        if (N8nManager.instance) return N8nManager.instance;

        this.configModel = new ConfigModel();
        this.auditModel = new AuditModel();
        this.n8nProcess = null;
        this.demoDir = path.resolve(__dirname, '../../.n8n_demo_runtime');

        if (!fs.existsSync(this.demoDir)) {
            fs.mkdirSync(this.demoDir, { recursive: true });
        }

        N8nManager.instance = this;
    }

    static getInstance() {
        if (!N8nManager.instance) {
            N8nManager.instance = new N8nManager();
        }
        return N8nManager.instance;
    }

    isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', (err) => {
                // Only treat EADDRINUSE as "port in use"; other errors are transient
                resolve(err.code !== 'EADDRINUSE');
            });
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port, '127.0.0.1');
        });
    }

    async findSafePort(startPort = 5679, endPort = 5699) {
        // Specifically avoid standard default n8n port 5678 to protect any user instance
        for (let port = startPort; port <= endPort; port++) {
            const available = await this.isPortAvailable(port);
            if (available) {
                return port;
            }
        }
        throw new Error(`No free port found in range ${startPort}-${endPort}`);
    }

    async getStatus() {
        const net = require('node:net');
        const is5678Active = await new Promise((resolve) => {
            const s = net.createConnection({ port: 5678, host: 'localhost' });
            s.once('connect', () => { s.destroy(); resolve(true); });
            s.once('error', () => { s.destroy(); resolve(false); });
            setTimeout(() => { s.destroy(); resolve(false); }, 800);
        });

        const conf = this.configModel.getN8nConfig() || {};
        const isRunning = is5678Active || (this.n8nProcess !== null);
        const configuredPort = is5678Active ? 5678 : (conf.port || 5678);

        return {
            configuredPort,
            host: conf.host || 'localhost',
            workflowId: conf.workflow_id || 'USdZGa2vqGuUstP7',
            workflowName: conf.workflow_name || 'CafeMenu Whatsapp',
            isRunning,
            workflowActive: isRunning,
            geminiActive: isRunning,
            runtimeStatus: isRunning ? 'ONLINE_LIVE' : 'BUSY_RETRY',
            pid: this.n8nProcess ? this.n8nProcess.pid : conf.pid,
            webhookUrl: `http://localhost:${configuredPort}/webhook/whatsapp-restaurant`,
            isolatedUserDataFolder: this.demoDir,
            portListening: is5678Active
        };
    }

    async ensureN8nRunning() {
        const net = require('node:net');
        const is5678Active = await new Promise((resolve) => {
            const s = net.createConnection({ port: 5678, host: 'localhost' });
            s.once('connect', () => { s.destroy(); resolve(true); });
            s.once('error', () => { s.destroy(); resolve(false); });
            setTimeout(() => { s.destroy(); resolve(false); }, 1000);
        });

        if (is5678Active) {
            return { isRunning: true, port: 5678, message: 'n8n is running on port 5678', runtimeStatus: 'ONLINE_LIVE' };
        }

        console.log('[N8nManager] Port 5678 inactive. Auto-starting primary n8n server in background...');
        const { spawn, execSync } = require('node:child_process');
        let n8nCmd = 'n8n';
        if (process.platform === 'win32') {
            try {
                n8nCmd = execSync('where n8n.cmd', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            } catch (_) {
                n8nCmd = 'n8n.cmd';
            }
        }

        const child = spawn(n8nCmd, ['start'], {
            detached: true,
            stdio: 'ignore',
            shell: process.platform === 'win32'
        });
        child.unref();

        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const ready = await new Promise((resolve) => {
                const s = net.createConnection({ port: 5678, host: 'localhost' });
                s.once('connect', () => { s.destroy(); resolve(true); });
                s.once('error', () => { s.destroy(); resolve(false); });
                setTimeout(() => { s.destroy(); resolve(false); }, 500);
            });
            if (ready) {
                console.log('[N8nManager] ✅ Auto-started n8n successfully on port 5678');
                return { isRunning: true, port: 5678, message: 'n8n auto-started successfully on port 5678', runtimeStatus: 'ONLINE_LIVE' };
            }
        }

        return { isRunning: false, port: 5678, message: 'n8n startup in progress', runtimeStatus: 'BUSY_RETRY' };
    }

    async startDemoInstance() {
        if (this.n8nProcess) {
            return { success: true, message: 'Isolated demo n8n is already running', pid: this.n8nProcess.pid };
        }

        // Find a free port for the demo n8n instance (avoid 5678 to not conflict with user's existing n8n)
        const safePort = await this.findSafePort(5679, 5699);
        console.log(`[N8nManager] Starting demo n8n on port ${safePort}...`);

        // Seed workflow into demo DB BEFORE starting n8n
        await this.seedWorkflowBeforeStart();

        // Update config
        this.configModel.updateN8nConfig({
            port: safePort,
            webhook_base_url: `http://localhost:${safePort}/webhook/whatsapp-restaurant`,
            is_running: 1,
            last_heartbeat: new Date().toISOString()
        });

        // 3. Environment
        const env = {
            ...process.env,
            N8N_PORT: String(safePort),
            N8N_USER_FOLDER: this.demoDir,
            N8N_DISABLE_PRODUCTION_MAIN_PROCESS: 'true',
            N8N_METRICS: 'false',
            N8N_DIAGNOSTICS_ENABLED: 'false'
        };

        // 4. Start n8n on port 5678
        try {
            const isWindows = process.platform === 'win32';

            if (isWindows) {
                const { execSync } = require('node:child_process');
                let n8nCmd;
                try {
                    n8nCmd = execSync('where n8n.cmd', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
                } catch (_) {
                    n8nCmd = 'n8n.cmd';
                }
                const subProc = require('node:child_process').spawn('cmd', ['/c', n8nCmd, 'start'], {
                    env,
                    detached: true,
                    stdio: 'ignore'
                });
                this.n8nProcess = subProc;
            } else {
                const { spawn } = require('node:child_process');
                this.n8nProcess = spawn('n8n', ['start'], { env, stdio: 'pipe' });
            }

            if (!this.n8nProcess || this.n8nProcess.pid == null) {
                throw new Error('n8n child process failed to start — no PID assigned');
            }
            this.configModel.updateN8nConfig({ pid: this.n8nProcess.pid, is_running: 1 });

            this.auditModel.log('RUNTIME', 'INFO', 'N8N_STARTED', { port: safePort, pid: this.n8nProcess.pid });

            // Import workflow asynchronously after n8n is ready
            this.waitForN8nReady(safePort, 60000)
                .then(() => this.importWorkflow(safePort))
                .catch(err => console.warn('[N8nManager] Workflow import failed:', err.message));

            return {
                success: true,
                message: `n8n started on port ${safePort}`,
                port: safePort,
                pid: this.n8nProcess.pid
            };
        } catch (err) {
            this.auditModel.log('RUNTIME', 'ERROR', 'N8N_START_FAILED', { error: err.message });
            throw new Error(`Failed to start n8n process: ${err.message}`);
        }
    }

    /**
     * Seed the demo workflow into the database BEFORE n8n starts
     */
    async seedWorkflowBeforeStart() {
        try {
            const dbPath = path.join(this.demoDir, '.n8n', 'database.sqlite');
            if (!fs.existsSync(dbPath)) {
                console.warn('[N8nManager] Demo DB not found, skipping pre-seed:', dbPath);
                return;
            }
            const workflowPath = path.resolve(__dirname, '../../n8n/restaurant_workflow.json');
            if (!fs.existsSync(workflowPath)) {
                console.warn('[N8nManager] Workflow file not found, skipping pre-seed');
                return;
            }

            const { DatabaseSync } = require('node:sqlite');
            const wfData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
            const workflowId = `demo_start_${Date.now()}`;
            const now = new Date().toISOString();
            const versionId = `v${Date.now()}`;

            const db = new DatabaseSync(dbPath);
            db.prepare("DELETE FROM workflow_entity WHERE id LIKE 'demo_%'").run();
            db.prepare(`
                INSERT INTO workflow_entity
                    (id, name, active, nodes, connections, settings, staticData, pinData,
                     versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
                     isArchived, versionCounter, description, activeVersionId, nodeGroups, sourceWorkflowId)
                VALUES (?, ?, 1, ?, ?, ?, NULL, NULL, ?, 0, ?, NULL, ?, ?, 0, 1, NULL, NULL, '[]', NULL)
            `).run(
                workflowId,
                wfData.name || 'Restaurant Menu AI',
                JSON.stringify(wfData.nodes || []),
                JSON.stringify(wfData.connections || {}),
                JSON.stringify(wfData.settings || {}),
                versionId,
                '{}',
                now,
                now
            );
            db.close();
            console.log(`[N8nManager] ✅ Pre-seeded workflow '${wfData.name}' into demo DB`);
        } catch (err) {
            console.error('[N8nManager] Pre-seed failed:', err.message);
        }
    }

    /**
     * Wait for n8n HTTP API to become available
     */
    waitForN8nReady(port, timeoutMs = 60000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                http.get(`http://localhost:${port}/api/1/health`, (res) => {
                    if (res.statusCode === 200) resolve();
                    else setTimeout(check, 500);
                }).on('error', () => {
                    if (Date.now() - start > timeoutMs) {
                        reject(new Error(`n8n did not respond within ${timeoutMs}ms on port ${port}`));
                    } else {
                        setTimeout(check, 500);
                    }
                });
            };
            check();
        });
    }

    /**
     * Import and activate the restaurant workflow into the demo n8n instance
     * Uses direct SQLite file manipulation since the n8n demo API requires auth
     */
    async importWorkflow(port) {
        try {
            const dbPath = path.join(this.demoDir, '.n8n', 'database.sqlite');
            if (!fs.existsSync(dbPath)) {
                console.warn('[N8nManager] Demo n8n database not found:', dbPath);
                return;
            }
            const workflowPath = path.resolve(__dirname, '../../n8n/restaurant_workflow.json');
            if (!fs.existsSync(workflowPath)) {
                console.warn('[N8nManager] Workflow file not found, skipping import:', workflowPath);
                return;
            }

            const { DatabaseSync } = require('node:sqlite');
            const wfData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
            const workflowId = `demo_${Date.now()}`;
            const now = new Date().toISOString();
            const versionId = `v${Date.now()}`;

            const db = new DatabaseSync(dbPath);

            // Delete any previous demo workflows first
            db.prepare("DELETE FROM workflow_entity WHERE id LIKE 'demo_%'").run();

            // Insert with all required columns matching n8n v2 schema (9 placeholders)
            db.prepare(`
                INSERT INTO workflow_entity
                    (id, name, active, nodes, connections, settings, staticData, pinData,
                     versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
                     isArchived, versionCounter, description, activeVersionId, nodeGroups, sourceWorkflowId)
                VALUES (?, ?, 1, ?, ?, ?, NULL, NULL, ?, 0, ?, NULL, ?, ?, 0, 1, NULL, NULL, '[]', NULL)
            `).run(
                workflowId,
                wfData.name || 'Restaurant Menu AI',
                JSON.stringify(wfData.nodes || []),
                JSON.stringify(wfData.connections || {}),
                JSON.stringify(wfData.settings || {}),
                versionId,
                '{}',
                now,
                now
            );

            db.close();

            this.configModel.updateN8nConfig({
                workflow_name: wfData.name || 'Restaurant Menu AI',
                webhook_base_url: `http://localhost:${port}/webhook/whatsapp-restaurant`
            });

            console.log(`[N8nManager] ✅ Imported workflow '${wfData.name}' into demo n8n (port ${port}, id: ${workflowId})`);
        } catch (err) {
            console.error('[N8nManager] Failed to import workflow via SQLite:', err.message);
            // Fallback: try HTTP API
            try {
                const wfData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../n8n/restaurant_workflow.json'), 'utf8'));
                const body = JSON.stringify(wfData);
                await this.httpPost(`http://localhost:${port}/api/1/workflows`, body, { 'X-N8N-API-KEY': '' });
                console.log(`[N8nManager] ✅ Imported via HTTP API (port ${port})`);
            } catch (e2) {
                console.error('[N8nManager] HTTP import also failed:', e2.message);
            }
        }
    }

    /**
     * Helper: simple POST via Node http module
     */
    httpPost(url, body, extraHeaders = {}) {
        return new Promise((resolve, reject) => {
            const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders };
            const req = http.request(url, { method: 'POST', headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch { resolve(data); }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    stopDemoInstance() {
        if (!this.n8nProcess) {
            this.configModel.updateN8nConfig({ is_running: 0, pid: null });
            return { success: true, message: 'No demo process was actively managed' };
        }

        try {
            this.n8nProcess.kill('SIGTERM');
            const pid = this.n8nProcess.pid;
            this.n8nProcess = null;
            this.configModel.updateN8nConfig({ is_running: 0, pid: null });

            this.auditModel.log('RUNTIME', 'INFO', 'N8N_ISOLATED_STOPPED', { pid });
            return { success: true, message: `Demo n8n process ${pid} stopped successfully` };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

module.exports = N8nManager;
