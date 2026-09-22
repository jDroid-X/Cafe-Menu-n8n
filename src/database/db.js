// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Database Connection Singleton (Node 24 native node:sqlite)
// ==========================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

class DatabaseService {
    static instance = null;

    constructor() {
        if (DatabaseService.instance) {
            return DatabaseService.instance;
        }

        const dataDir = path.resolve(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.dbPath = path.join(dataDir, 'restaurant_demo.db');
        this.db = new DatabaseSync(this.dbPath);

        // Enable WAL mode, busy timeout & foreign keys for concurrency and integrity
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA busy_timeout = 5000;');  // retry for up to 5s on lock
        this.db.exec('PRAGMA synchronous = NORMAL;');  // balance speed vs. safety
        this.db.exec('PRAGMA foreign_keys = ON;');

        this.initSchema();
        DatabaseService.instance = this;
    }

    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    initSchema() {
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schemaSql);
        }
    }

    queryAll(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (err) {
            console.error('[DB QueryAll Error]:', err.message, 'SQL:', sql);
            throw err;
        }
    }

    queryOne(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('[DB QueryOne Error]:', err.message, 'SQL:', sql);
            throw err;
        }
    }

    run(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.run(...params);
        } catch (err) {
            console.error('[DB Run Error]:', err.message, 'SQL:', sql);
            throw err;
        }
    }

    exec(sql) {
        try {
            return this.db.exec(sql);
        } catch (err) {
            console.error('[DB Exec Error]:', err.message);
            throw err;
        }
    }

    close() {
        if (this.db) {
            this.db.close();
            DatabaseService.instance = null;
        }
    }
}

module.exports = DatabaseService;
