# n8n Restaurant Workflow Guide (Demo v0.1)

## 📌 Overview
This workflow reproduces the exact automation demonstrated in the YouTube tutorial *"n8n Complete Course | WhatsApp Automation Project"*:
1. **Inbound Trigger**: WhatsApp Business Cloud Webhook / Demo Trigger.
2. **Normalize Message**: Extracts sender phone, name, and chat body.
3. **AI Agent Node**: LangChain Agent with:
   - **Google Gemini Chat Model** (configurable temperature: 0.2)
   - **Simple Window Memory** (Buffer of 10 messages)
   - **Get Inventory Tool**: HTTP GET call to `/api/tools/inventory`
   - **Get FAQ Tool**: HTTP GET call to `/api/tools/faq`
   - **Post Order Tool**: HTTP POST call to `/api/tools/order`
4. **Outbound Dispatch**: Sends structured confirmation response back to WhatsApp.

---

## 🛡️ Isolation & Safety Guarantee
- This workflow is pre-configured to communicate with the local demo API at `http://localhost:3585`.
- It executes inside an **isolated local n8n instance** running on a separate port (e.g. `5679`), using an isolated data directory (`.n8n_demo_runtime/`).
- **Your existing n8n instance on port 5678 and existing workflows remain 100% untouched.**

---

## 🚀 How to Import into Demo n8n
1. Open the demo dashboard at `http://localhost:3585`.
2. Go to **Screen 09: n8n Runtime** and click **"Start Isolated Demo n8n"**.
3. Once the runner starts, click **"Open Demo n8n"** (e.g., `http://localhost:5679`).
4. In n8n, click **Workflows** -> **Import from File** and select `restaurant_workflow.json`.
5. If running in Online Mode, supply your Google Gemini credential. If running in Mock Mode, the interactive Test Console in the demo dashboard executes the entire pipeline natively.
