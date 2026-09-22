// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: MenuController
// ==========================================================

const MenuModel = require('../models/MenuModel');
const GoogleSheetsService = require('../services/GoogleSheetsService');

class MenuController {
    constructor() {
        this.model = new MenuModel();
        this.sheetsService = GoogleSheetsService.getInstance();
    }

    // Refresh menu items from Google Sheets inventory sheet
    async refreshFromSheet(req, res) {
        try {
            // Read the entire Inventory sheet (assumes header row with matching keys)
            const rows = await this.sheetsService.readSheet(this.sheetsService.inventorySheet);
            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(200).json({ success: true, message: 'Inventory sheet is empty – no changes applied' });
            }
            // Map sheet rows to the menu item schema expected by bulkUpsert
            const items = rows.map(row => ({
                item_code: row.item_code || row.itemcode || row.code || `AUTO-${Date.now()}`,
                item_name: row.item_name || row.itemname || row.name,
                category: row.category || 'Uncategorized',
                description: row.description || '',
                price: parseFloat(row.price) || 0,
                quantity: parseInt(row.quantity, 10) || 0,
                status: row.status || (parseInt(row.quantity, 10) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'),
                active: row.active !== undefined ? (row.active == '1' || row.active === true || row.active === 'true' ? 1 : 0) : 1
            }));
            const result = this.model.bulkUpsert(items);
            res.json({ success: true, message: 'Menu refreshed from Google Sheet', data: result });
        } catch (err) {
            console.error('[MenuController] refreshFromSheet error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
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
