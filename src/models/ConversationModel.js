// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: ConversationModel (Sessions & Message Memory)
// ==========================================================

const DatabaseService = require('../database/db');

class ConversationModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    getOrCreateSession(sessionKey, customerName = '', customerPhone = '') {
        const existing = this.db.queryOne('SELECT * FROM conversation_sessions WHERE session_key = ?', [sessionKey]);
        if (existing) {
            if (customerName || customerPhone) {
                this.db.run(`
                    UPDATE conversation_sessions SET 
                        customer_name = CASE WHEN ? != '' THEN ? ELSE customer_name END,
                        customer_phone = CASE WHEN ? != '' THEN ? ELSE customer_phone END,
                        last_activity = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [customerName, customerName, customerPhone, customerPhone, existing.id]);
            } else {
                this.db.run('UPDATE conversation_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?', [existing.id]);
            }
            return this.db.queryOne('SELECT * FROM conversation_sessions WHERE id = ?', [existing.id]);
        }

        const result = this.db.run(`
            INSERT INTO conversation_sessions (session_key, customer_name, customer_phone, memory_enabled)
            VALUES (?, ?, ?, 1)
        `, [sessionKey, customerName, customerPhone]);

        return this.db.queryOne('SELECT * FROM conversation_sessions WHERE id = ?', [result.lastInsertRowid]);
    }

    addMessage(sessionId, direction, messageText, rawPayload = {}) {
        const result = this.db.run(`
            INSERT INTO conversation_messages (session_id, direction, message_text, raw_payload)
            VALUES (?, ?, ?, ?)
        `, [sessionId, direction, messageText, JSON.stringify(rawPayload)]);

        this.db.run('UPDATE conversation_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
        return this.db.queryOne('SELECT * FROM conversation_messages WHERE id = ?', [result.lastInsertRowid]);
    }

    getRecentMessages(sessionId, limit = 10) {
        return this.db.queryAll(`
            SELECT * FROM (
                SELECT * FROM conversation_messages 
                WHERE session_id = ? 
                ORDER BY id DESC 
                LIMIT ?
            ) ORDER BY id ASC
        `, [sessionId, limit]);
    }

    clearSession(sessionKey) {
        const session = this.db.queryOne('SELECT id FROM conversation_sessions WHERE session_key = ?', [sessionKey]);
        if (session) {
            this.db.run('DELETE FROM conversation_messages WHERE session_id = ?', [session.id]);
            this.db.run('DELETE FROM conversation_sessions WHERE id = ?', [session.id]);
        }
        return { success: true, message: `Session ${sessionKey} cleared` };
    }
}

module.exports = ConversationModel;
