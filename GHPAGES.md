# 🍽️ jDroid-X- CafeMenu — GitHub Pages Deployment

## Live URL
**https://jdroid-x.github.io/Cafe-Menu-n8n/**

## What's Included

This is a **fully static frontend deployment** that runs entirely in the browser using `localStorage` for data persistence. No backend server required!

### Features Working Online:
- ✅ Executive Dashboard with order analytics
- ✅ WhatsApp Simulator (mock AI responses)
- ✅ Menu & Inventory Management
- ✅ FAQ Management
- ✅ Order Tracking
- ✅ Agent Settings (system prompt)
- ✅ n8n Workflow Configuration UI
- ✅ Theme Toggle (Light/Dark)
- ✅ Multi-role Authentication (demo only)

### Limitations (vs Full Backend):
| Feature | Local Demo | GitHub Pages |
|---------|-----------|--------------|
| Database | SQLite | localStorage |
| N8n Sync | Real-time | Mocked |
| WhatsApp API | Live/Mock | Mock only |
| Data Persistence | Server-side | Browser-only (clears on cache clear) |

## Enable GitHub Pages

GitHub Pages is already configured to serve from the `/docs` folder. If it's not showing:

1. Go to: https://github.com/jDroid-X/Cafe-Menu-n8n/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **master** / **/docs folder**
4. Click **Save**

## Update Instructions

To update the live site after making changes:

```bash
# Make your changes to files in docs/ or public/
git add -A
git commit -m "Your commit message"
git push
```

GitHub will automatically rebuild the site within 1-2 minutes.

## Architecture

```
docs/
├── index.html          # Main SPA entry point
├── .nojekyll          # Disables Jekyll processing
├── css/
│   └── styles.css     # All styles copied from public/
└── js/
    ├── mock-api.js    # Intercepts fetch() → serves from localStorage
    ├── api.js         # API client (works with mock)
    └── app.js         # Main application logic
```

The `mock-api.js` script intercepts all `fetch('/api/*')` calls and serves responses from `localStorage`, making the app work without a backend server.
