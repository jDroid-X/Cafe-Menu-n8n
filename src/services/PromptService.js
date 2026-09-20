// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Service: PromptService (Dynamic System Instruction Builder)
// Prompt Engineering Agent Implementation
// ==========================================================

const RestaurantModel = require('../models/RestaurantModel');
const ConfigModel = require('../models/ConfigModel');

class PromptService {
    constructor() {
        this.restaurantModel = new RestaurantModel();
        this.configModel = new ConfigModel();
    }

    assembleSystemPrompt() {
        const rest = this.restaurantModel.getConfig() || {};
        const brandName = rest.restaurant_name || 'jDroid-X- CafeMenu';
        const contactPhone = rest.contact_number || '+95 1224567890';
        const agent = this.configModel.getAgentConfig() || {};

        try {
            const N8nSyncService = require('./N8nSyncService');
            const n8nSync = N8nSyncService.getInstance().getSyncStatus();
            if (n8nSync && n8nSync.synced && n8nSync.systemMessage && n8nSync.systemMessage.trim().length > 20) {
                return n8nSync.systemMessage
                    .replace(/\{\{BRAND_NAME\}\}/g, brandName)
                    .replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone)
                    .trim();
            }
        } catch (e) {}

        return `### IDENTITY & ROLE
${agent.identity_prompt || `You are the friendly AI assistant for ${brandName}.`}
Restaurant Name: ${brandName}
Currency: ${rest.currency_symbol || '₹'} (${rest.currency || 'INR'})
Opening Hours: ${rest.opening_hours || '09:00 AM - 11:00 PM'}
Delivery: ${rest.delivery_enabled ? 'Available within delivery zone' : 'Currently dine-in and takeaway only'}
Contact Front Desk: ${contactPhone}

### RESTAURANT BUSINESS RULES
${agent.restaurant_rules || 'Greet warmly. Represent the restaurant truthfully using tools only.'}

### FOOD ORDERING RULES
${agent.order_rules || 'Collect Customer Name, Food Item, and Quantity. Confirm order only after stock check.'}

### INVENTORY & STOCK RULES
${agent.inventory_rules || 'Check stock before confirming. If an item is OUT_OF_STOCK or 0 qty, politely refuse and suggest available items.'}

### FAQ RULES
${agent.faq_rules || 'Answer restaurant questions strictly based on FAQ data.'}

### RESPONSE STYLE & LANGUAGE
Style: ${agent.response_style || 'Polite, friendly, concise, and helpful.'}
Language: ${agent.response_language || 'English'}
Max Tokens: ${agent.max_tokens || 450}

### FALLBACK CONTINGENCY
${agent.fallback_message || 'Apologize and advise customer to call the restaurant desk.'}
`;
    }
}

module.exports = PromptService;
