# 🍽️ jDroid-X- CafeMenu — WhatsApp AI Ordering System

A complete WhatsApp restaurant ordering AI agent with n8n workflow integration, executive dashboard, and live two-way sync.

## 🚀 Online Deployment

### Railway (Recommended)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
**URL**: `https://your-app.up.railway.app`

### Render
1. Connect GitHub repo: `jDroid-X/Cafe-Menu-n8n`
2. Environment: Node
3. Build: `npm install`
4. Start: `node server.js`
5. Port: `3585`

**URL**: `https://cafe-menu-n8n.onrender.com`

---

## ⚠️ Production Database Requirement

The demo uses SQLite (`data/restaurant_demo.db`). For production deployment:

### Option 1: Railway PostgreSQL
```bash
railway add postgresql
railway variables -e production
# Set DATABASE_URL from Railway's PostgreSQL provision
```

### Option 2: Render PostgreSQL
Add a PostgreSQL service in Render dashboard and set:
```
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

---

## 🔄 n8n Integration

This system requires an n8n instance for the AI workflow:

| Component | Local Demo | Production |
|-----------|-----------|------------|
| **n8n Instance** | localhost:5678 | n8n.cloud or self-hosted |
| **Workflow ID** | USdZGa2vqGuUstP7 | Same or new |
| **Webhook URL** | http://localhost:5678/webhook/... | Update in n8n config |

**To connect to cloud n8n:**
1. Set environment variable: `N8N_HOST=https://your-workspace.n8n.cloud`
2. Update webhook URL in Settings → n8n Runtime

---

## 📋 Features

- ✅ WhatsApp Business API integration (Mock/Live)
- ✅ AI Agent with Google Gemini
- ✅ Live n8n workflow synchronization
- ✅ Executive CFO Dashboard
- ✅ Real-time order management
- ✅ Menu & inventory management
- ✅ FAQ system
- ✅ Audit logging
- ✅ Multi-role access (Admin, CFO, Manager)

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3585` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `N8N_DB_PATH` | `C:/Users/jiten/.n8n/database.sqlite` | n8n SQLite path |
| `GEMINI_API_KEY` | - | Google Gemini API key |
| `DATABASE_URL` | - | PostgreSQL connection string (production) |

---

## 📦 GitHub Repository

**Repo**: https://github.com/jDroid-X/Cafe-Menu-n8n
