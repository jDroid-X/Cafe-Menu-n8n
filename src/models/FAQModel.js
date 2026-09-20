// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: FAQModel (FAQ Store & Query Matching)
// ==========================================================

const DatabaseService = require('../database/db');

class FAQModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    getAll(filter = {}) {
        let sql = 'SELECT * FROM faq_items WHERE 1=1';
        const params = [];

        if (filter.activeOnly) {
            sql += ' AND active = 1';
        }
        if (filter.category) {
            sql += ' AND category = ?';
            params.push(filter.category);
        }
        if (filter.search) {
            sql += ' AND (question LIKE ? OR answer LIKE ?)';
            const term = `%${filter.search}%`;
            params.push(term, term);
        }

        sql += ' ORDER BY id ASC';
        return this.db.queryAll(sql, params);
    }

    getById(id) {
        return this.db.queryOne('SELECT * FROM faq_items WHERE id = ?', [id]);
    }

    findMatching(query) {
        if (!query) return null;
        const normalized = query.trim().toLowerCase();

        // Exact question match
        const exact = this.db.queryOne('SELECT * FROM faq_items WHERE active = 1 AND LOWER(question) = ?', [normalized]);
        if (exact) return exact;

        // Keyword extraction matching
        const words = normalized
            .replace(/[^\w\s]/gi, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !['what', 'when', 'where', 'have', 'does', 'your', 'about', 'some'].includes(w));

        if (words.length > 0) {
            for (const word of words) {
                const match = this.db.queryOne('SELECT * FROM faq_items WHERE active = 1 AND (LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)', [`%${word}%`, `%${word}%`]);
                if (match) return match;
            }
        }

        // Substring fallback
        return this.db.queryOne('SELECT * FROM faq_items WHERE active = 1 AND (LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)', [`%${normalized}%`, `%${normalized}%`]);
    }

    create(data) {
        const result = this.db.run(`
            INSERT INTO faq_items (category, question, answer, active)
            VALUES (?, ?, ?, ?)
        `, [
            data.category || 'General',
            data.question,
            data.answer,
            data.active !== undefined ? (data.active ? 1 : 0) : 1
        ]);

        return this.getById(result.lastInsertRowid);
    }

    update(id, data) {
        const current = this.getById(id);
        if (!current) throw new Error(`FAQ ${id} not found`);

        const category = data.category ?? current.category;
        const question = data.question ?? current.question;
        const answer = data.answer ?? current.answer;
        const active = data.active !== undefined ? (data.active ? 1 : 0) : current.active;

        this.db.run(`
            UPDATE faq_items SET
                category = ?,
                question = ?,
                answer = ?,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [category, question, answer, active, id]);

        return this.getById(id);
    }

    delete(id) {
        return this.db.run('DELETE FROM faq_items WHERE id = ?', [id]);
    }
}

module.exports = FAQModel;
