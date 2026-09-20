WHATSAPP RESTAURANT MENU / FOOD ORDERING AI AGENT
ProjectScope Documentation Pack
Demo Version

SOURCE BASIS
Primary reference: YouTube video "n8n Complete Course (Beginner to Advanced) | WhatsApp Automation Project"
URL: https://www.youtube.com/watch?v=zQM2HgNTBCs
Channel: Manish Digital Academy
Video duration: approximately 18 minutes.

The documentation is based on the available transcript/structured transcript of the referenced video. The demonstrated flow is:
WhatsApp message -> n8n WhatsApp Business Cloud Trigger -> AI Agent -> Gemini Chat Model + Simple Memory -> Google Sheets tools (Inventory, FAQ, Orders) -> WhatsApp Send Message.

The video also demonstrates replacing the initial "On Chat Message" trigger with WhatsApp Business Cloud, mapping WhatsApp Text Body into the AI Agent, using chat-context memory, and sending the AI Agent output back through WhatsApp.

DEMO SCOPE
This is a DEMO / proof-of-concept. It is intentionally designed so that future production behavior can be moved into configuration/settings screens rather than hard-coded implementation.

The demo must:
1. Run against a separate local n8n test instance/port, not the user's existing n8n port.
2. Avoid overwriting or modifying the existing n8n installation/workflows.
3. Use local/mock adapters where external credentials are unavailable.
4. Provide a configuration screen that groups all relevant n8n/business settings by context.
5. Make settings editable and persistable.
6. Keep production integrations disabled until credentials are supplied.
7. Clearly show Online vs Offline dependencies.
8. Provide a path to replace mock adapters with real WhatsApp Business Cloud, Gemini and Google Sheets integrations later.

REFERENCE IMPLEMENTATION FROM VIDEO
- Initial trigger: On Chat Message.
- AI Agent.
- Google Gemini Chat Model.
- Simple Memory, demonstrated with last 10 messages.
- Google Sheets tools:
  * Get Inventory
  * Get FAQ
  * Post Orders / Append Row
- Restaurant system instructions.
- WhatsApp Business Cloud:
  * On Message trigger
  * Send Message action
  * Meta App ID / App Secret
  * Access Token
  * Business Account ID
  * Test sender/recipient phone configuration.
- Order fields demonstrated: Customer Name, Food Item, Quantity Order, Order Date, Status.
- Inventory fields demonstrated: Food Item, Quantity, Status.
- FAQ sheet: question/answer pairs.
- Example menu items included Vada Pav and Misal Pav.
- Example behavior: unavailable items are refused politely and available options are offered.
