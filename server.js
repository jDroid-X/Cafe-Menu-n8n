// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Main Server Entrypoint (Node.js & Express)
// ==========================================================

const express = require('express');
const cors = require('cors');
const path = require('node:path');
const DatabaseSeeder = require('./src/database/seed');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3585;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount REST API
app.use('/api', apiRoutes);

// Fallback route to index.html for SPA navigation
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

// Auto-seed demo database on startup
try {
    DatabaseSeeder.seedAll(false);
} catch (err) {
    console.error('[Startup] Seed verification error:', err.message);
}

// Start HTTP Server
const server = app.listen(PORT, () => {
    // Start live n8n synchronization watcher
    try {
        const N8nSyncService = require('./src/services/N8nSyncService');
        N8nSyncService.getInstance().startWatcher(3000);
    } catch (e) {
        console.warn('[Startup] N8nSyncService initialization warning:', e.message);
    }

    console.log(`
==========================================================
🍽️  jDroid-X- CafeMenu — WHATSAPP ORDERING AI DESK
==========================================================
🌐  Web Console:   http://localhost:${PORT}
📡  REST API:      http://localhost:${PORT}/api/health
⚙️  Active n8n:    http://localhost:5678/workflow/USdZGa2vqGuUstP7
🔄  n8n Sync:      LIVE Two-Way Sync Active (3s Watcher)
📁  Persistence:   SQLite (Node 24 native node:sqlite)
🛡️  Role Suite:    Executive CFO & Store Operations Ready
==========================================================
    `);
});

module.exports = { app, server };
