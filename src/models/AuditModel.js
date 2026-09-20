// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: AuditModel (System Events & Telemetry Logs)
// ==========================================================

const DatabaseService = require('../database/db');

class AuditModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    log(component, severity, eventName, details = {}) {
        const detailsJson = typeof details === 'object' ? JSON.stringify(details) : String(details);
        this.db.run(`
            INSERT INTO audit_log (component, severity, event_name, details_json)
            VALUES (?, ?, ?, ?)
        `, [component, severity, eventName, detailsJson]);
    }

    getRecent(limit = 100, filter = {}) {
        let sql = 'SELECT * FROM audit_log WHERE 1=1';
        const params = [];

        if (filter.severity) {
            sql += ' AND severity = ?';
            params.push(filter.severity);
        }
        if (filter.component) {
            sql += ' AND component = ?';
            params.push(filter.component);
        }
        if (filter.search) {
            sql += ' AND (event_name LIKE ? OR details_json LIKE ?)';
            const term = `%${filter.search}%`;
            params.push(term, term);
        }

        sql += ' ORDER BY id DESC LIMIT ?';
        params.push(limit);

        return this.db.queryAll(sql, params);
    }

    clear() {
        this.db.run('DELETE FROM audit_log');
        return { success: true };
    }
}

module.exports = AuditModel;
