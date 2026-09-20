// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: OrderController
// ==========================================================

const OrderModel = require('../models/OrderModel');

class OrderController {
    constructor() {
        this.model = new OrderModel();
    }

    getAll(req, res) {
        try {
            const orders = this.model.getAll({
                status: req.query.status,
                customerPhone: req.query.customerPhone,
                customerName: req.query.customerName
            });
            res.json({ success: true, data: orders, count: orders.length });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getById(req, res) {
        try {
            const order = this.model.getById(req.params.id);
            if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
            res.json({ success: true, data: order });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    create(req, res) {
        try {
            const order = this.model.create(req.body);
            res.status(201).json({ success: true, data: order, message: 'Order recorded successfully' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    updateStatus(req, res) {
        try {
            if (!req.body.status) {
                return res.status(400).json({ success: false, error: 'Status is required' });
            }
            const order = this.model.updateStatus(req.params.id, req.body.status, req.body.description);
            res.json({ success: true, data: order, message: 'Order status updated' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    updatePayment(req, res) {
        try {
            if (!req.body.payment_status) {
                return res.status(400).json({ success: false, error: 'Payment status is required' });
            }
            const order = this.model.updatePaymentStatus(req.params.id, req.body.payment_status);
            res.json({ success: true, data: order, message: 'Payment status updated' });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    getAnalytics(req, res) {
        try {
            const analytics = this.model.getCFOAnalytics();
            res.json({ success: true, data: analytics });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = OrderController;
