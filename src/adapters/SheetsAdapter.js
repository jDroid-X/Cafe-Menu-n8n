// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Adapter: SheetsAdapter (Local SQLite / Google Sheets API)
// ==========================================================

const MenuModel = require('../models/MenuModel');
const FAQModel = require('../models/FAQModel');
const OrderModel = require('../models/OrderModel');

class SheetsAdapter {
    constructor(config = {}) {
        this.mode = config.mode || 'LOCAL'; // LOCAL or GOOGLE
        this.spreadsheetName = config.spreadsheet_name || 'Food Delivery System';
        this.inventorySheet = config.inventory_sheet || 'Inventory';
        this.ordersSheet = config.orders_sheet || 'Orders';
        this.faqSheet = config.faq_sheet || 'FAQ';

        this.menuModel = new MenuModel();
        this.faqModel = new FAQModel();
        this.orderModel = new OrderModel();
    }

    async getInventory() {
        if (this.mode === 'LOCAL') {
            return this.menuModel.getAll({ activeOnly: true });
        }
        // Google Sheets API reading would fetch rows from spreadsheetName/inventorySheet
        return this.menuModel.getAll({ activeOnly: true });
    }

    async getFAQ(query) {
        if (this.mode === 'LOCAL') {
            return this.faqModel.findMatching(query);
        }
        return this.faqModel.findMatching(query);
    }

    async postOrder(orderData) {
        if (this.mode === 'LOCAL') {
            return this.orderModel.create(orderData);
        }
        // In GOOGLE mode, append row to Google Sheet ordersSheet
        return this.orderModel.create(orderData);
    }
}

module.exports = SheetsAdapter;
