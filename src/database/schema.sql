-- ==========================================================
-- WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
-- Database Schema: 11 Core SQLite Tables
-- OOPS-based MVC Persistence Layer
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. Restaurant Profile Configuration
CREATE TABLE IF NOT EXISTS restaurant_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_name TEXT NOT NULL DEFAULT 'jDroid-X- CafeMenu',
    welcome_message TEXT NOT NULL DEFAULT 'Welcome to jDroid-X- CafeMenu 🍽️\nHow can I help you today?\n- 🛒 Place an order\n- ℹ️ FAQ / Information\n- 📦 Check order / stock',
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    opening_hours TEXT NOT NULL DEFAULT '09:00 AM - 11:00 PM',
    delivery_enabled INTEGER NOT NULL DEFAULT 1,
    contact_number TEXT NOT NULL DEFAULT '+95 1224567890',
    address TEXT DEFAULT '123 Marine Drive, Nariman Point, Mumbai 400021',
    location_url TEXT DEFAULT 'https://maps.google.com/?q=Mumbai',
    owner_name TEXT DEFAULT 'Jitendra G.',
    owner_phone TEXT DEFAULT '+91 9876543210',
    fssai_license TEXT DEFAULT '11521000000123',
    cuisine_types TEXT DEFAULT 'Street Food, Beverages, Fast Food',
    min_order_amount REAL NOT NULL DEFAULT 100.0,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Menu Items & Inventory
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT NOT NULL UNIQUE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Snacks',
    description TEXT,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. FAQ Items
CREATE TABLE IF NOT EXISTS faq_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'General',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT DEFAULT '',
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0.0,
    total_amount REAL NOT NULL DEFAULT 0.0,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK(status IN ('Confirmed', 'Accepted', 'In Progress', 'Delivered', 'Rejected', 'Cancelled', 'PENDING')),
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK(payment_status IN ('Payment Received', 'Pending', 'COD', 'UPI Confirmed')),
    description TEXT DEFAULT 'Order accepted (item available)',
    metadata_json TEXT DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'DEMO_CONSOLE' CHECK(source IN ('DEMO_CONSOLE', 'WHATSAPP', 'MOCK', 'N8N')),
    notes TEXT DEFAULT ''
);

-- 5. Conversation Sessions
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT NOT NULL UNIQUE,
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    memory_enabled INTEGER NOT NULL DEFAULT 1
);

-- 6. Conversation Messages
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('INBOUND', 'OUTBOUND', 'SYSTEM')),
    message_text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_payload TEXT DEFAULT '{}',
    FOREIGN KEY(session_id) REFERENCES conversation_sessions(id) ON DELETE CASCADE
);

-- 7. Integration Configuration
CREATE TABLE IF NOT EXISTS integration_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL UNIQUE CHECK(provider IN ('WHATSAPP', 'GOOGLE_SHEETS', 'LLM')),
    mode TEXT NOT NULL DEFAULT 'MOCK' CHECK(mode IN ('MOCK', 'REAL', 'LOCAL', 'GOOGLE')),
    endpoint TEXT DEFAULT '',
    credential_reference TEXT DEFAULT '',
    config_json TEXT DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'READY' CHECK(status IN ('READY', 'WARNING', 'BLOCKED', 'DISABLED')),
    last_tested DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI Agent Configuration
CREATE TABLE IF NOT EXISTS agent_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_prompt TEXT NOT NULL,
    restaurant_rules TEXT NOT NULL,
    order_rules TEXT NOT NULL,
    inventory_rules TEXT NOT NULL,
    faq_rules TEXT NOT NULL,
    response_style TEXT NOT NULL DEFAULT 'Polite, friendly, concise, and helpful restaurant host.',
    response_language TEXT NOT NULL DEFAULT 'English',
    temperature REAL NOT NULL DEFAULT 0.3,
    max_tokens INTEGER NOT NULL DEFAULT 500,
    fallback_message TEXT NOT NULL DEFAULT 'I am experiencing a slight technical hiccup retrieving restaurant details. Please contact the front desk at +91 9876543210.',
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Memory Configuration
CREATE TABLE IF NOT EXISTS memory_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled INTEGER NOT NULL DEFAULT 1,
    memory_type TEXT NOT NULL DEFAULT 'WINDOW_BUFFER' CHECK(memory_type IN ('WINDOW_BUFFER', 'SUMMARY', 'REDIS')),
    max_messages INTEGER NOT NULL DEFAULT 10,
    session_key_expression TEXT NOT NULL DEFAULT 'sender_phone',
    expiry_minutes INTEGER NOT NULL DEFAULT 60,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. n8n Runtime Configuration
CREATE TABLE IF NOT EXISTS n8n_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL DEFAULT 'localhost',
    port INTEGER NOT NULL DEFAULT 5679,
    workflow_name TEXT NOT NULL DEFAULT 'WhatsApp Restaurant Menu AI Workflow',
    webhook_base_url TEXT NOT NULL DEFAULT 'http://localhost:5679/webhook/whatsapp-restaurant',
    execution_mode TEXT NOT NULL DEFAULT 'ISOLATED_PROCESS',
    is_running INTEGER NOT NULL DEFAULT 0,
    pid INTEGER DEFAULT NULL,
    last_heartbeat DATETIME,
    log_level TEXT NOT NULL DEFAULT 'info',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit and Event Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    component TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK(severity IN ('INFO', 'WARNING', 'ERROR')),
    event_name TEXT NOT NULL,
    details_json TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
