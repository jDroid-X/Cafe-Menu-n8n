// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: MenuModel (Inventory & Availability Business Rules)
// ==========================================================

const DatabaseService = require('../database/db');

class MenuModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    getAll(filter = {}) {
        let sql = 'SELECT * FROM menu_items WHERE 1=1';
        const params = [];

        if (filter.activeOnly) {
            sql += ' AND active = 1';
        }
        if (filter.status) {
            sql += ' AND status = ?';
            params.push(filter.status);
        }
        if (filter.category) {
            sql += ' AND category = ?';
            params.push(filter.category);
        }
        if (filter.search) {
            sql += ' AND (item_name LIKE ? OR description LIKE ? OR item_code LIKE ?)';
            const term = `%${filter.search}%`;
            params.push(term, term, term);
        }

        sql += ' ORDER BY id ASC';
        return this.db.queryAll(sql, params);
    }

    getById(id) {
        return this.db.queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    }

    getByCode(code) {
        return this.db.queryOne('SELECT * FROM menu_items WHERE item_code = ?', [code]);
    }

    findByName(name) {
        if (!name) return null;
        const normalized = name.trim().toLowerCase();
        // Exact or partial match
        const exact = this.db.queryOne('SELECT * FROM menu_items WHERE LOWER(item_name) = ?', [normalized]);
        if (exact) return exact;

        const partial = this.db.queryOne('SELECT * FROM menu_items WHERE LOWER(item_name) LIKE ?', [`%${normalized}%`]);
        return partial;
    }

    getAvailableItems() {
        return this.db.queryAll(`
            SELECT item_code, item_name, category, description, price, quantity, status
            FROM menu_items
            WHERE active = 1 AND status = 'AVAILABLE' AND quantity > 0
            ORDER BY category, item_name
        `);
    }

    checkAvailability(itemName) {
        const item = this.findByName(itemName);
        if (!item) {
            return {
                exists: false,
                available: false,
                reason: 'Item not found in menu'
            };
        }

        const isAvailable = item.active === 1 && item.status === 'AVAILABLE' && item.quantity > 0;
        return {
            exists: true,
            item,
            available: isAvailable,
            reason: isAvailable ? 'Available' : 'Out of stock or unavailable'
        };
    }

    create(data) {
        const result = this.db.run(`
            INSERT INTO menu_items (item_code, item_name, category, description, price, quantity, status, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.item_code,
            data.item_name,
            data.category || 'Snacks',
            data.description || '',
            data.price || 0.0,
            data.quantity || 0,
            data.status || 'AVAILABLE',
            data.active !== undefined ? (data.active ? 1 : 0) : 1
        ]);

        return this.getById(result.lastInsertRowid);
    }

    update(id, data) {
        const current = this.getById(id);
        if (!current) throw new Error(`Item ${id} not found`);

        const itemCode = data.item_code ?? current.item_code;
        const itemName = data.item_name ?? current.item_name;
        const category = data.category ?? current.category;
        const description = data.description ?? current.description;
        const price = data.price ?? current.price;
        const quantity = data.quantity ?? current.quantity;
        const status = data.status ?? current.status;
        const active = data.active !== undefined ? (data.active ? 1 : 0) : current.active;

        this.db.run(`
            UPDATE menu_items SET
                item_code = ?,
                item_name = ?,
                category = ?,
                description = ?,
                price = ?,
                quantity = ?,
                status = ?,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [itemCode, itemName, category, description, price, quantity, status, active, id]);

        return this.getById(id);
    }

    delete(id) {
        return this.db.run('DELETE FROM menu_items WHERE id = ?', [id]);
    }

    bulkUpsert(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return { count: 0, items: [] };
        }

        let inserted = 0;
        let updated = 0;

        for (const item of items) {
            if (!item.item_name || item.price === undefined) continue;
            const code = item.item_code || `ITEM-${Date.now().toString().slice(-4)}${inserted}`;
            const existing = this.getByCode(code) || this.findByName(item.item_name);

            if (existing) {
                this.update(existing.id, {
                    item_name: item.item_name,
                    category: item.category || existing.category,
                    description: item.description ?? existing.description,
                    price: parseFloat(item.price),
                    quantity: item.quantity !== undefined ? parseInt(item.quantity, 10) : existing.quantity,
                    status: item.status || (parseInt(item.quantity, 10) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK')
                });
                updated++;
            } else {
                this.create({
                    item_code: code,
                    item_name: item.item_name,
                    category: item.category || 'Snacks',
                    description: item.description || '',
                    price: parseFloat(item.price),
                    quantity: item.quantity !== undefined ? parseInt(item.quantity, 10) : 30,
                    status: item.status || 'AVAILABLE'
                });
                inserted++;
            }
        }

        return { inserted, updated, total: inserted + updated };
    }
}

module.exports = MenuModel;
