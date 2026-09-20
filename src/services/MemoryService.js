// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Service: MemoryService (Window Buffer Session Memory)
// ==========================================================

const ConversationModel = require('../models/ConversationModel');
const ConfigModel = require('../models/ConfigModel');

class MemoryService {
    constructor() {
        this.conversationModel = new ConversationModel();
        this.configModel = new ConfigModel();
    }

    getSession(sessionKey, customerName = '', customerPhone = '') {
        return this.conversationModel.getOrCreateSession(sessionKey, customerName, customerPhone);
    }

    recordMessage(sessionId, direction, text, rawPayload = {}) {
        return this.conversationModel.addMessage(sessionId, direction, text, rawPayload);
    }

    getContextHistory(sessionId) {
        const memConfig = this.configModel.getMemoryConfig();
        const maxMessages = (memConfig && memConfig.enabled) ? memConfig.max_messages : 0;
        if (maxMessages <= 0) return [];

        return this.conversationModel.getRecentMessages(sessionId, maxMessages);
    }

    formatHistoryForPrompt(messages) {
        if (!messages || messages.length === 0) return '';
        return messages.map(m => {
            const role = m.direction === 'INBOUND' ? 'Customer' : 'Assistant';
            return `${role}: ${m.message_text}`;
        }).join('\n');
    }

    clearSession(sessionKey) {
        return this.conversationModel.clearSession(sessionKey);
    }
}

module.exports = MemoryService;
