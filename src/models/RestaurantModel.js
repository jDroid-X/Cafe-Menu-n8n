// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: RestaurantModel (Persistence & Business Logic)
// ==========================================================

const DatabaseService = require('../database/db');

class RestaurantModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    getConfig() {
        const config = this.db.queryOne('SELECT * FROM restaurant_config ORDER BY id ASC LIMIT 1');
        return config || null;
    }

    updateConfig(data) {
        const current = this.getConfig();
        if (!current) {
            throw new Error('Restaurant configuration not found');
        }

        const restaurantName = data.restaurant_name ?? current.restaurant_name;
        const welcomeMessage = data.welcome_message ?? current.welcome_message;
        const currency = data.currency ?? current.currency;
        const currencySymbol = data.currency_symbol ?? current.currency_symbol;
        const timezone = data.timezone ?? current.timezone;
        const openingHours = data.opening_hours ?? current.opening_hours;
        const deliveryEnabled = data.delivery_enabled !== undefined ? (data.delivery_enabled ? 1 : 0) : current.delivery_enabled;
        const contactNumber = data.contact_number ?? current.contact_number;
        const minOrderAmount = data.min_order_amount ?? current.min_order_amount;
        const active = data.active !== undefined ? (data.active ? 1 : 0) : current.active;

        this.db.run(`
            UPDATE restaurant_config SET
                restaurant_name = ?,
                welcome_message = ?,
                currency = ?,
                currency_symbol = ?,
                timezone = ?,
                opening_hours = ?,
                delivery_enabled = ?,
                contact_number = ?,
                min_order_amount = ?,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            restaurantName,
            welcomeMessage,
            currency,
            currencySymbol,
            timezone,
            openingHours,
            deliveryEnabled,
            contactNumber,
            minOrderAmount,
            active,
            current.id
        ]);

        return this.getConfig();
    }
}

module.exports = RestaurantModel;
