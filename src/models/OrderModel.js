// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Model: OrderModel (Order Persistence, Lifecycle & CFO Analytics)
// ==========================================================

const DatabaseService = require('../database/db');

class OrderModel {
    constructor() {
        this.db = DatabaseService.getInstance();
    }

    getAll(filter = {}) {
        let sql = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        if (filter.status) {
            sql += ' AND status = ?';
            params.push(filter.status);
        }
        if (filter.paymentStatus) {
            sql += ' AND payment_status = ?';
            params.push(filter.paymentStatus);
        }
        if (filter.customerPhone) {
            sql += ' AND customer_phone = ?';
            params.push(filter.customerPhone);
        }
        if (filter.customerName) {
            sql += ' AND customer_name LIKE ?';
            params.push(`%${filter.customerName}%`);
        }

        sql += ' ORDER BY id DESC';
        return this.db.queryAll(sql, params);
    }

    getById(id) {
        return this.db.queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    }

    getByOrderCode(orderCode) {
        if (!orderCode) return null;
        const normalized = orderCode.trim().toUpperCase().replace('#', '');
        return this.db.queryOne('SELECT * FROM orders WHERE UPPER(order_code) = ?', [normalized]);
    }

    findMatching(query) {
        if (!query) return null;
        const cleaned = query.trim();

        // 1. Try exact order code
        const byCode = this.getByOrderCode(cleaned);
        if (byCode) return byCode;

        // 2. Try match inside text (e.g. "ORD-123456" in string)
        const codeMatch = cleaned.match(/ORD-?\d+/i);
        if (codeMatch) {
            const found = this.db.queryOne('SELECT * FROM orders WHERE UPPER(order_code) = ?', [codeMatch[0].toUpperCase().replace('#', '')]);
            if (found) return found;
        }

        // 3. Try customer name
        return this.db.queryOne('SELECT * FROM orders WHERE LOWER(customer_name) LIKE ? ORDER BY id DESC LIMIT 1', [`%${cleaned.toLowerCase()}%`]);
    }

    create(data) {
        if (!data.customer_name || !data.customer_name.trim()) {
            throw new Error('Customer name is required to confirm an order.');
        }
        if (!data.item_name || !data.item_name.trim()) {
            throw new Error('Food item name is required.');
        }
        const quantity = parseInt(data.quantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
            throw new Error('Valid order quantity (> 0) is required.');
        }

        const orderCode = data.order_code || `ORD-${Date.now().toString().slice(-6)}`;
        const unitPrice = parseFloat(data.unit_price || 0);
        const totalAmount = parseFloat(data.total_amount || (unitPrice * quantity));
        const status = data.status || 'Confirmed';
        const paymentStatus = data.payment_status || 'Pending';
        const description = data.description || 'Order accepted (item available)';
        const source = data.source || 'DEMO_CONSOLE';
        const customerPhone = data.customer_phone || '';
        const notes = data.notes || '';
        const metadata = typeof data.metadata_json === 'object' ? JSON.stringify(data.metadata_json) : (data.metadata_json || '{}');

        const result = this.db.run(`
            INSERT INTO orders (
                order_code, customer_name, customer_phone, item_name, quantity,
                unit_price, total_amount, status, payment_status, description,
                metadata_json, source, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderCode,
            data.customer_name.trim(),
            customerPhone,
            data.item_name.trim(),
            quantity,
            unitPrice,
            totalAmount,
            status,
            paymentStatus,
            description,
            metadata,
            source,
            notes
        ]);

        // Auto-decrement inventory stock if item exists
        try {
            this.db.run(`
                UPDATE menu_items 
                SET quantity = MAX(0, quantity - ?),
                    status = CASE WHEN (quantity - ?) <= 0 THEN 'OUT_OF_STOCK' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE LOWER(item_name) = LOWER(?)
            `, [quantity, quantity, data.item_name.trim()]);
        } catch (e) {
            console.warn('[OrderModel] Stock auto-decrement warning:', e.message);
        }

        const savedOrder = this.getById(result.lastInsertRowid);

        // Async write to Google Sheets (non-blocking — local order always succeeds)
        setImmediate(() => {
            try {
                const GoogleSheetsService = require('../services/GoogleSheetsService');
                GoogleSheetsService.getInstance().appendOrder(savedOrder)
                    .then(() => console.log(`[OrderModel] ✅ Order ${savedOrder.order_code} pushed to Google Sheets`))
                    .catch(err => console.warn(`[OrderModel] ⚠️ Google Sheets write failed (order still saved locally): ${err.message}`));
            } catch (e) {
                console.warn('[OrderModel] GoogleSheetsService unavailable:', e.message);
            }
        });

        return savedOrder;
    }

    updateStatus(id, status, description = null) {
        if (description) {
            this.db.run('UPDATE orders SET status = ?, description = ? WHERE id = ?', [status, description, id]);
        } else {
            this.db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        }
        return this.getById(id);
    }

    updatePaymentStatus(id, paymentStatus) {
        this.db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, id]);
        return this.getById(id);
    }

    getCFOAnalytics() {
        const totalRevRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
                   COUNT(*) as total_orders,
                   COALESCE(SUM(quantity), 0) as total_quantity
            FROM orders
            WHERE status NOT IN ('Rejected', 'Cancelled')
        `) || { total_revenue: 0, total_orders: 0, total_quantity: 0 };

        const dayRevRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as day_revenue,
                   COUNT(*) as day_orders,
                   COALESCE(SUM(quantity), 0) as day_quantity
            FROM orders
            WHERE status NOT IN ('Rejected', 'Cancelled')
              AND DATE(order_date) = DATE('now')
        `) || { day_revenue: 0, day_orders: 0, day_quantity: 0 };

        const weekRevRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as week_revenue,
                   COUNT(*) as week_orders,
                   COALESCE(SUM(quantity), 0) as week_quantity
            FROM orders
            WHERE status NOT IN ('Rejected', 'Cancelled')
              AND DATE(order_date) >= DATE('now', '-7 days')
        `) || { week_revenue: 0, week_orders: 0, week_quantity: 0 };

        const monthRevRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as month_revenue,
                   COUNT(*) as month_orders,
                   COALESCE(SUM(quantity), 0) as month_quantity
            FROM orders
            WHERE status NOT IN ('Rejected', 'Cancelled')
              AND DATE(order_date) >= DATE('now', '-30 days')
        `) || { month_revenue: 0, month_orders: 0, month_quantity: 0 };

        const pendingPayRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as pending_amount,
                   COUNT(*) as pending_count
            FROM orders
            WHERE payment_status = 'Pending' AND status NOT IN ('Rejected', 'Cancelled')
        `) || { pending_amount: 0, pending_count: 0 };

        const receivedPayRow = this.db.queryOne(`
            SELECT COALESCE(SUM(total_amount), 0) as received_amount
            FROM orders
            WHERE payment_status IN ('Payment Received', 'UPI Confirmed')
        `) || { received_amount: 0 };

        const deliveredCountRow = this.db.queryOne(`
            SELECT COUNT(*) as count FROM orders WHERE status IN ('Delivered', 'Accepted', 'Confirmed', 'In Progress')
        `) || { count: 0 };

        const totalOrders = totalRevRow.total_orders;
        const totalRevenue = totalRevRow.total_revenue;
        const totalQuantity = totalRevRow.total_quantity;
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
        const avgUnitsPerOrder = totalOrders > 0 ? (totalQuantity / totalOrders).toFixed(1) : 0;

        return {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            todayRevenue: parseFloat(dayRevRow.day_revenue.toFixed(2)),
            dayRevenue: parseFloat(dayRevRow.day_revenue.toFixed(2)),
            weekRevenue: parseFloat(weekRevRow.week_revenue.toFixed(2)),
            monthRevenue: parseFloat(monthRevRow.month_revenue.toFixed(2)),

            totalOrders,
            todayOrders: dayRevRow.day_orders,
            dayOrders: dayRevRow.day_orders,
            weekOrders: weekRevRow.week_orders,
            monthOrders: monthRevRow.month_orders,

            totalQuantity,
            dayQuantity: dayRevRow.day_quantity,
            weekQuantity: weekRevRow.week_quantity,
            monthQuantity: monthRevRow.month_quantity,

            aov: parseFloat(aov),
            avgUnitsPerOrder: parseFloat(avgUnitsPerOrder),
            pendingPaymentAmount: parseFloat(pendingPayRow.pending_amount.toFixed(2)),
            pendingPaymentOrders: pendingPayRow.pending_count,
            receivedPaymentAmount: parseFloat(receivedPayRow.received_amount.toFixed(2)),
            deliveredOrdersCount: deliveredCountRow.count,
            fulfillmentRate: totalOrders > 0 ? Math.round((deliveredCountRow.count / totalOrders) * 100) : 100
        };
    }
}

module.exports = OrderModel;
