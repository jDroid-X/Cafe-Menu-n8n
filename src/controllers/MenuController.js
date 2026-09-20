// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: MenuController
// ==========================================================

const MenuModel = require('../models/MenuModel');

class MenuController {
    constructor() {
        this.model = new MenuModel();
    }

    getAll(req, res) {
        try {
            const items = this.model.getAll({
                activeOnly: req.query.activeOnly === 'true',
                category: req.query.category,
                status: req.query.status,
                search: req.query.search
            });
            res.json({ success: true, data: items, count: items.length });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getById(req, res) {
        try {
            const item = this.model.getById(req.params.id);
            if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
            res.json({ success: true, data: item });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    create(req, res) {
        try {
            if (!req.body.item_code || !req.body.item_name || req.body.price === undefined) {
                return res.status(400).json({ success: false, error: 'item_code, item_name and price are required' });
            }
            const item = this.model.create(req.body);
            res.status(201).json({ success: true, data: item, message: 'Menu item created successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    update(req, res) {
        try {
            const item = this.model.update(req.params.id, req.body);
            res.json({ success: true, data: item, message: 'Menu item updated successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    delete(req, res) {
        try {
            this.model.delete(req.params.id);
            res.json({ success: true, message: 'Menu item deleted successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    toggleStatus(req, res) {
        try {
            const item = this.model.getById(req.params.id);
            if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
            const newStatus = item.status === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
            const updated = this.model.update(item.id, { status: newStatus });
            res.json({ success: true, data: updated, message: `Status changed to ${newStatus}` });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    bulkImport(req, res) {
        try {
            const items = req.body.items;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, error: 'Items array is required for bulk import' });
            }
            const result = this.model.bulkUpsert(items);
            res.json({
                success: true,
                message: `Bulk import completed: ${result.inserted} added, ${result.updated} updated`,
                data: result
            });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}

module.exports = MenuController;
