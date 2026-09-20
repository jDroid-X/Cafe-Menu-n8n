// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Factory: AdapterFactory (Dynamic Provider Instantiation)
// ==========================================================

const WhatsAppAdapter = require('./WhatsAppAdapter');
const LLMAdapter = require('./LLMAdapter');
const SheetsAdapter = require('./SheetsAdapter');
const ConfigModel = require('../models/ConfigModel');

class AdapterFactory {
    static getWhatsAppAdapter() {
        const configModel = new ConfigModel();
        const conf = configModel.getIntegration('WHATSAPP') || {};
        let configJson = {};
        try { configJson = JSON.parse(conf.config_json || '{}'); } catch(e) {}

        return new WhatsAppAdapter({
            mode: conf.mode || 'MOCK',
            endpoint: conf.endpoint,
            phone_number_id: configJson.phone_number_id,
            access_token: configJson.access_token || process.env.WHATSAPP_TOKEN
        });
    }

    static getLLMAdapter() {
        const configModel = new ConfigModel();
        const conf = configModel.getIntegration('LLM') || {};
        let configJson = {};
        try { configJson = JSON.parse(conf.config_json || '{}'); } catch(e) {}

        return new LLMAdapter({
            mode: conf.mode || 'MOCK',
            api_key: configJson.api_key || process.env.GEMINI_API_KEY,
            model: configJson.model || 'gemini-1.5-flash',
            temperature: configJson.temperature || 0.2
        });
    }

    static getSheetsAdapter() {
        const configModel = new ConfigModel();
        const conf = configModel.getIntegration('GOOGLE_SHEETS') || {};
        let configJson = {};
        try { configJson = JSON.parse(conf.config_json || '{}'); } catch(e) {}

        return new SheetsAdapter({
            mode: conf.mode || 'LOCAL',
            spreadsheet_name: configJson.spreadsheet_name,
            inventory_sheet: configJson.inventory_sheet,
            orders_sheet: configJson.orders_sheet,
            faq_sheet: configJson.faq_sheet
        });
    }
}

module.exports = AdapterFactory;
