// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Runtime: N8nManager (Safe Port Discovery & Isolated Runner)
// ==========================================================

const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
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
        const conf = this.configModel.getN8nConfig() || {};
        const portActive = conf.port ? !(await this.isPortAvailable(conf.port)) : false;

        return {
            configuredPort: conf.port,
            host: conf.host,
            workflowName: conf.workflow_name,
            isRunning: this.n8nProcess !== null || (portActive && conf.is_running === 1),
            pid: this.n8nProcess ? this.n8nProcess.pid : conf.pid,
            webhookUrl: conf.webhook_base_url,
            isolatedUserDataFolder: this.demoDir,
            portListening: portActive
        };
    }

    async startDemoInstance() {
        if (this.n8nProcess) {
            return { success: true, message: 'Isolated demo n8n is already running', pid: this.n8nProcess.pid };
        }

        // 1. Find a free, safe port
        const safePort = await this.findSafePort(5679, 5699);

        // 2. Update config
        this.configModel.updateN8nConfig({
            port: safePort,
            webhook_base_url: `http://localhost:${safePort}/webhook/whatsapp-restaurant`,
            is_running: 1,
            last_heartbeat: new Date().toISOString()
        });

        // 3. Environment for complete isolation
        const env = {
            ...process.env,
            N8N_PORT: String(safePort),
            N8N_USER_FOLDER: this.demoDir,
            N8N_DISABLE_PRODUCTION_MAIN_PROCESS: 'true',
            N8N_METRICS: 'false',
            N8N_DIAGNOSTICS_ENABLED: 'false'
        };

        // 4. Try starting n8n command if available
        try {
            const isWindows = process.platform === 'win32';
            const cmd = isWindows ? 'n8n.cmd' : 'n8n';

            this.n8nProcess = spawn(cmd, ['start'], {
                env,
                detached: false,
                stdio: 'pipe'
            });
            // Guard: ensure process started successfully before referencing pid
            if (!this.n8nProcess || this.n8nProcess.pid == null) {
                throw new Error('n8n child process failed to start — no PID assigned');
            }
            this.configModel.updateN8nConfig({ pid: this.n8nProcess.pid, is_running: 1 });

            this.n8nProcess.on('exit', (code, signal) => {
                console.log(`[N8nManager] n8n exited with code ${code}, signal ${signal}`);
                this.n8nProcess = null;
                this.configModel.updateN8nConfig({ is_running: 0, pid: null });
            });

            this.auditModel.log('RUNTIME', 'INFO', 'N8N_ISOLATED_STARTED', {
                port: safePort,
                pid: this.n8nProcess.pid,
                userData: this.demoDir
            });

            return {
                success: true,
                message: `Isolated n8n instance started on port ${safePort}`,
                port: safePort,
                pid: this.n8nProcess.pid
            };
        } catch (err) {
            this.auditModel.log('RUNTIME', 'ERROR', 'N8N_START_FAILED', { error: err.message });
            throw new Error(`Failed to start n8n process: ${err.message}`);
        }
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
