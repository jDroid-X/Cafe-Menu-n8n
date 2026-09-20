// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: FAQController
// ==========================================================

const FAQModel = require('../models/FAQModel');

class FAQController {
    constructor() {
        this.model = new FAQModel();
    }

    getAll(req, res) {
        try {
            const items = this.model.getAll({
                activeOnly: req.query.activeOnly === 'true',
                category: req.query.category,
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
            if (!item) return res.status(404).json({ success: false, error: 'FAQ not found' });
            res.json({ success: true, data: item });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    create(req, res) {
        try {
            if (!req.body.question || !req.body.answer) {
                return res.status(400).json({ success: false, error: 'question and answer are required' });
            }
            const item = this.model.create(req.body);
            res.status(201).json({ success: true, data: item, message: 'FAQ created successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    update(req, res) {
        try {
            const item = this.model.update(req.params.id, req.body);
            res.json({ success: true, data: item, message: 'FAQ updated successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    delete(req, res) {
        try {
            this.model.delete(req.params.id);
            res.json({ success: true, message: 'FAQ deleted successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = FAQController;
