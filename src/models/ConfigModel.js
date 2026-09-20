// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: ConfigModel (Agent, Memory, Integration, n8n Settings)
// ==========================================================

const DatabaseService = require('../database/db');

class ConfigModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    // --- AGENT CONFIG ---
    getAgentConfig() {
        return this.db.queryOne('SELECT * FROM agent_config ORDER BY id ASC LIMIT 1');
    }

    updateAgentConfig(data) {
        const current = this.getAgentConfig() || {};
        const id = current.id || 1;
        this.db.run(`
            UPDATE agent_config SET
                identity_prompt = ?,
                restaurant_rules = ?,
                order_rules = ?,
                inventory_rules = ?,
                faq_rules = ?,
                response_style = ?,
                response_language = ?,
                temperature = ?,
                max_tokens = ?,
                fallback_message = ?,
                enabled = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            data.identity_prompt ?? current.identity_prompt,
            data.restaurant_rules ?? current.restaurant_rules,
            data.order_rules ?? current.order_rules,
            data.inventory_rules ?? current.inventory_rules,
            data.faq_rules ?? current.faq_rules,
            data.response_style ?? current.response_style,
            data.response_language ?? current.response_language,
            data.temperature ?? current.temperature,
            data.max_tokens ?? current.max_tokens,
            data.fallback_message ?? current.fallback_message,
            data.enabled !== undefined ? (data.enabled ? 1 : 0) : current.enabled,
            id
        ]);
        return this.getAgentConfig();
    }

    // --- MEMORY CONFIG ---
    getMemoryConfig() {
        return this.db.queryOne('SELECT * FROM memory_config ORDER BY id ASC LIMIT 1');
    }

    updateMemoryConfig(data) {
        const current = this.getMemoryConfig() || {};
        const id = current.id || 1;
        this.db.run(`
            UPDATE memory_config SET
                enabled = ?,
                memory_type = ?,
                max_messages = ?,
                session_key_expression = ?,
                expiry_minutes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            data.enabled !== undefined ? (data.enabled ? 1 : 0) : current.enabled,
            data.memory_type ?? current.memory_type,
            data.max_messages ?? current.max_messages,
            data.session_key_expression ?? current.session_key_expression,
            data.expiry_minutes ?? current.expiry_minutes,
            id
        ]);
        return this.getMemoryConfig();
    }

    // --- INTEGRATION CONFIG ---
    getIntegrations() {
        return this.db.queryAll('SELECT * FROM integration_config ORDER BY id ASC');
    }

    getIntegration(provider) {
        return this.db.queryOne('SELECT * FROM integration_config WHERE provider = ?', [provider]);
    }

    updateIntegration(provider, data) {
        const current = this.getIntegration(provider);
        if (!current) throw new Error(`Integration provider ${provider} not found`);

        const mode = data.mode ?? current.mode;
        const endpoint = data.endpoint ?? current.endpoint;
        const credentialReference = data.credential_reference ?? current.credential_reference;
        const configJson = typeof data.config_json === 'object' ? JSON.stringify(data.config_json) : (data.config_json ?? current.config_json);
        const enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : current.enabled;
        const status = data.status ?? current.status;

        this.db.run(`
            UPDATE integration_config SET
                mode = ?,
                endpoint = ?,
                credential_reference = ?,
                config_json = ?,
                enabled = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE provider = ?
        `, [mode, endpoint, credentialReference, configJson, enabled, status, provider]);

        return this.getIntegration(provider);
    }

    // --- N8N CONFIG ---
    getN8nConfig() {
        return this.db.queryOne('SELECT * FROM n8n_config ORDER BY id ASC LIMIT 1');
    }

    updateN8nConfig(data) {
        const current = this.getN8nConfig() || {};
        const id = current.id || 1;
        this.db.run(`
            UPDATE n8n_config SET
                host = ?,
                port = ?,
                workflow_name = ?,
                webhook_base_url = ?,
                execution_mode = ?,
                is_running = ?,
                pid = ?,
                last_heartbeat = ?,
                log_level = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            data.host ?? current.host,
            data.port ?? current.port,
            data.workflow_name ?? current.workflow_name,
            data.webhook_base_url ?? current.webhook_base_url,
            data.execution_mode ?? current.execution_mode,
            data.is_running !== undefined ? (data.is_running ? 1 : 0) : current.is_running,
            data.pid !== undefined ? data.pid : current.pid,
            data.last_heartbeat ?? current.last_heartbeat,
            data.log_level ?? current.log_level,
            id
        ]);
        return this.getN8nConfig();
    }
}

module.exports = ConfigModel;
