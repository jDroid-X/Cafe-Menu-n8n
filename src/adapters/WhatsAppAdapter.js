// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Adapter: WhatsAppAdapter (Mock & Meta Cloud API Normalization)
// ==========================================================

class WhatsAppAdapter {
    constructor(config = {}) {
        this.mode = config.mode || 'MOCK';
        this.endpoint = config.endpoint || 'https://graph.facebook.com/v19.0';
        this.phoneNumberId = config.phone_number_id || '';
        this.accessToken = config.access_token || '';
    }

    /**
     * Normalizes an incoming WhatsApp payload (Meta Cloud format or simple test input)
     * into a standard internal message object.
     */
    normalizeIncoming(payload) {
        // 1. If simple payload from Test Console
        if (payload.text || payload.message) {
            return {
                senderId: payload.from || payload.senderId || 'demo_user',
                senderName: payload.name || payload.senderName || '',
                senderPhone: payload.phone || payload.senderPhone || '+91 9876543210',
                messageText: (payload.text || payload.message || '').trim(),
                timestamp: new Date().toISOString(),
                raw: payload
            };
        }

        // 2. Meta WhatsApp Business Cloud Webhook payload structure
        // entry[0].changes[0].value.messages[0]
        try {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0]?.value;
            const message = change?.messages?.[0];
            const contact = change?.contacts?.[0];

            if (message) {
                return {
                    senderId: message.from,
                    senderName: contact?.profile?.name || 'Customer',
                    senderPhone: message.from,
                    messageText: message.text?.body || '',
                    timestamp: new Date(parseInt(message.timestamp, 10) * 1000).toISOString(),
                    raw: payload
                };
            }
        } catch (e) {
            console.warn('[WhatsAppAdapter] Could not parse Meta webhook payload:', e.message);
        }

        return {
            senderId: 'unknown',
            senderName: 'Guest',
            senderPhone: '',
            messageText: String(payload),
            timestamp: new Date().toISOString(),
            raw: payload
        };
    }

    /**
     * Formats outbound message to WhatsApp Meta API payload or Mock response.
     */
    async sendMessage(recipientPhone, text) {
        if (this.mode === 'MOCK') {
            return {
                success: true,
                mode: 'MOCK',
                recipient: recipientPhone,
                text,
                messageId: `wamid.mock.${Date.now()}`,
                sentAt: new Date().toISOString()
            };
        }

        // Real Meta Cloud API Call
        if (!this.accessToken || !this.phoneNumberId) {
            throw new Error('Meta WhatsApp Cloud credentials (Phone Number ID / Access Token) not configured.');
        }

        const url = `${this.endpoint}/${this.phoneNumberId}/messages`;
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'text',
            text: { preview_url: false, body: text }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Meta API error: ${JSON.stringify(data)}`);
        }

        return {
            success: true,
            mode: 'REAL',
            recipient: recipientPhone,
            text,
            data
        };
    }
}

module.exports = WhatsAppAdapter;
