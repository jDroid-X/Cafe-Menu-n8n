# CafeMenu — WhatsApp Ordering Demo

> **Live Demo URL:** `http://localhost:3585` (run the server locally)

---

## 🔐 Quick Login

- **URL:** `http://localhost:3585`
- **Demo credentials:**
  - **Admin:** `admin@jdroidx.ai` / `admin123` (`System Administrator` role)
  - **CFO:** `cfo@jdroidx.ai` / `cfo123` (`CFO / Executive` role)
  - **Manager:** `manager@jdroidx.ai` / `mgr123` (`Store Manager` role)

You can also click the **"Sign In to Executive Console"** button on the landing page to open the login overlay.

---

## 📊 What the App Does

- **WhatsApp Cloud / Mock Simulator** – send and receive messages via the integrated simulator.
- **Google Sheets Integration** – live inventory, FAQ and order data are stored in a Google Sheet.
- **n8n Workflow Engine** – visual pipeline that syncs with the UI and persists to SQLite.
- **AI‑Powered Ordering** – uses Google Gemini for natural‑language order capture.

---

## 📂 Key UI Sections

| Section | Description |
|---|---|
| **Dashboard** | CFO‑level financial overview and real‑time order list. |
| **Restaurant Profile** | Edit brand name, hours, contact, currency, and welcome message. |
| **Menu & Inventory** | Add items, bulk CSV upload, download CSV template, live stock view. |
| **FAQ** | Manage knowledge‑base entries for the AI assistant. |
| **n8n Workflow** | Configure webhook, memory, Gemini model, data sources, and dispatch options. |
| **Simulator Console** | Test WhatsApp interactions without a real phone number. |
| **Diagnostics** | Fault simulation, audit logs, and system health. |

---

## 📁 Google Sheets – Inventory Sheet

- **Spreadsheet URL:** https://docs.google.com/spreadsheets/d/1zipJC7y1Oa43PWMZHrotGd-lO8v54Xfq70bOLQUATcE/edit
- **Sheet Tab:** `Inventory`
- **Columns:** `Code`, `Food Item`, `Category`, `Price`, `Stock Qty`, `Status`

The UI button **"Open Inventory"** (top‑right of the *Data Integration* panel) launches this sheet directly.

---

## ⚙️ Configuration

All runtime settings are stored in `src/config/appConfig.json` and managed via the **Config Service**:
- **WhatsApp mode:** `MOCK` (simulator) or `REAL` (Meta Cloud API).
- **Google Gemini model:** selectable (Flash, Pro, etc.) and API key encrypted with AES‑256.
- **Data source mode:** `ONLINE` (Google Sheets) or `OFFLINE` (local JSON/CSV).

You can edit these values from the **Settings** panel or by modifying `src/config/appConfig.json` directly.

---

## 🚀 Running Locally

```bash
# Install dependencies (run once)
npm install

# Start the server (default port 3585)
node server.js
```

Open `http://localhost:3585` in a browser. The app automatically serves static assets from the `public/` folder and mounts the API under `/api`.

---

## 📦 Deploying

1. Build a production bundle (e.g., with `npm run build` if using Vite/Next.js – not required for this plain‑HTML demo).
2. Deploy the `public/` folder and the Node.js server to your host.
3. Set environment variables `PORT`, `GEMINI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, etc., or update `appConfig.json`.

---

## 🛠️ Development Workflow (OOP‑based MVC)

1. **INITIATE & PLAN** – Define goals, feasibility, and schedule.
2. **REQUIREMENTS** – Capture UI/UX, API contracts, and data models.
3. **DESIGN** – MVC separation: `controllers/`, `models/`, `views/` (HTML/CSS), `services/`.
4. **IMPLEMENT** – Follow the existing file structure; add new modules without duplicating code.
5. **TEST** – Run the built‑in benchmark (`scripts/benchmark‑simulator.js`) and UI tests.
6. **DEPLOY** – Use the instructions above.
7. **MAINTAIN** – Monitor logs, update the **Program Mapping** table for any hard‑coded values.

---

## 📜 License

MIT © 2026 jDroid‑X. Feel free to fork, modify, and deploy.
