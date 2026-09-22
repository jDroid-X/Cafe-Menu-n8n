// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Main Server Entrypoint (Node.js & Express)
// ==========================================================

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const DatabaseSeeder = require('./src/database/seed');
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3585;

// Session middleware setup
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
}));

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

// Error handling middleware (after routes)
app.use(errorHandler);

// Auto-seed demo database on startup
try {
  DatabaseSeeder.seedAll(false);
} catch (err) {
  console.error('[Startup] Seed verification error:', err.message);
}

// Start HTTP Server
const server = app.listen(PORT, () => {
  try {
    const N8nSyncService = require('./src/services/N8nSyncService');
    N8nSyncService.getInstance().startWatcher(10000);
  } catch (e) {
    console.warn('[Startup] N8nSyncService initialization warning:', e.message);
  }
  console.log(`\n==========================================================\n🍽️  jDroid-X- CafeMenu — WHATSAPP ORDERING AI DESK\n==========================================================\n🌐  Web Console:   http://localhost:${PORT}\n📡  REST API:      http://localhost:${PORT}/api/health\n⚙️  Active n8n:    http://localhost:5678/workflow/USdZGa2vqGuUstP7\n🔄  n8n Sync:      LIVE Two-Way Sync Active (3s Watcher)\n📁  Persistence:   SQLite (Node 24 native node:sqlite)\n🛡️  Role Suite:    Executive CFO & Store Operations Ready\n==========================================================\n`);
});

module.exports = { app, server };
