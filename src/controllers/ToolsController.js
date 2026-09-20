// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: ToolsController (Tool Endpoints for n8n AI Agent)
// ==========================================================

const MenuModel = require('../models/MenuModel');
const FAQModel = require('../models/FAQModel');
const OrderModel = require('../models/OrderModel');
const AuditModel = require('../models/AuditModel');

class ToolsController {
    constructor() {
        this.menuModel = new MenuModel();
        this.faqModel = new FAQModel();
        this.orderModel = new OrderModel();
        this.auditModel = new AuditModel();
    }

    // Tool 1: Get Inventory
    getInventory(req, res) {
        try {
            const { item, query } = req.query;
            const searchItem = item || query;

            if (searchItem) {
                const availability = this.menuModel.checkAvailability(searchItem);
                this.auditModel.log('TOOL', 'INFO', 'TOOL_GET_INVENTORY_CHECK', { item: searchItem, availability });
                return res.json({
                    success: true,
                    query: searchItem,
                    exists: availability.exists,
                    available: availability.available,
                    item: availability.item || null,
                    reason: availability.reason
                });
            }

            const items = this.menuModel.getAvailableItems();
            this.auditModel.log('TOOL', 'INFO', 'TOOL_GET_INVENTORY_LIST', { count: items.length });
            return res.json({
                success: true,
                count: items.length,
                items
            });
        } catch (err) {
            this.auditModel.log('TOOL', 'ERROR', 'TOOL_GET_INVENTORY_ERROR', { error: err.message });
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Tool 2: Get FAQ
    getFAQ(req, res) {
        try {
            const { q, question, query } = req.query;
            const searchQuery = q || question || query;

            if (!searchQuery) {
                const allFaqs = this.faqModel.getAll({ activeOnly: true });
                return res.json({ success: true, count: allFaqs.length, items: allFaqs });
            }

            const match = this.faqModel.findMatching(searchQuery);
            this.auditModel.log('TOOL', 'INFO', 'TOOL_GET_FAQ', { query: searchQuery, matched: !!match });

            if (match) {
                return res.json({
                    success: true,
                    matched: true,
                    question: match.question,
                    answer: match.answer,
                    category: match.category
                });
            }

            return res.json({
                success: true,
                matched: false,
                message: 'No exact FAQ match found. Default restaurant policy applies.'
            });
        } catch (err) {
            this.auditModel.log('TOOL', 'ERROR', 'TOOL_GET_FAQ_ERROR', { error: err.message });
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // Tool 3: Post Orders
    postOrder(req, res) {
        try {
            const { customer_name, customer_phone, item_name, quantity, source, notes } = req.body;

            // 1. Mandatory detail checks (BR-12)
            if (!customer_name || !item_name || !quantity) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required order fields: customer_name, item_name, and quantity are mandatory.'
                });
            }

            // 2. Inventory check (BR-11)
            const check = this.menuModel.checkAvailability(item_name);
            if (!check.available) {
                this.auditModel.log('TOOL', 'WARNING', 'ORDER_REFUSED_OUT_OF_STOCK', { item_name, reason: check.reason });
                return res.status(400).json({
                    success: false,
                    error: `Item "${item_name}" cannot be ordered because it is currently out of stock or unavailable.`,
                    item: check.item
                });
            }

            // 3. Persist Order (BR-13)
            const unitPrice = check.item.price;
            const totalAmount = unitPrice * parseInt(quantity, 10);

            const order = this.orderModel.create({
                customer_name,
                customer_phone: customer_phone || '',
                item_name: check.item.item_name,
                quantity: parseInt(quantity, 10),
                unit_price: unitPrice,
                total_amount: totalAmount,
                source: source || 'N8N',
                notes: notes || ''
            });

            this.auditModel.log('TOOL', 'INFO', 'TOOL_POST_ORDER_SUCCESS', {
                orderCode: order.order_code,
                customer: customer_name,
                item: check.item.item_name,
                quantity
            });

            return res.status(201).json({
                success: true,
                message: 'Order saved and confirmed',
                order
            });
        } catch (err) {
            this.auditModel.log('TOOL', 'ERROR', 'TOOL_POST_ORDER_ERROR', { error: err.message });
            res.status(400).json({ success: false, error: err.message });
        }
    }
}

module.exports = ToolsController;
