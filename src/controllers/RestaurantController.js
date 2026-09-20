// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: RestaurantController
// ==========================================================

const RestaurantModel = require('../models/RestaurantModel');

class RestaurantController {
    constructor() {
        this.model = new RestaurantModel();
    }

    getConfig(req, res) {
        try {
            const config = this.model.getConfig();
            res.json({ success: true, data: config });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    updateConfig(req, res) {
        try {
            const updated = this.model.updateConfig(req.body);
            res.json({ success: true, data: updated, message: 'Restaurant profile updated successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}

module.exports = RestaurantController;
