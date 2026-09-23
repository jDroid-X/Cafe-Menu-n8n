// ==========================================================
// ConfigService - central config loader/writer with event emission
// ==========================================================

const fs = require('node:fs');
const path = require('node:path');
const EventEmitter = require('node:events');

class ConfigService extends EventEmitter {
  constructor() {
    super();
    if (ConfigService.instance) return ConfigService.instance;
    this.configPath = path.resolve(__dirname, '../../src/config/appConfig.json');
    this._config = this._load();
    this._applyEnvOverrides();
    ConfigService.instance = this;
  }

  /** Apply environment variable overrides to the loaded config */
  _applyEnvOverrides() {
    const envMap = {
      N8N_BASE_URL: ['n8n', 'baseUrl'],
      JWT_SECRET: ['jwtSecret'],
      GEMINI_API_KEY: ['geminiApiKey'],
      GOOGLE_SHEET_ID: ['googleSheetId'],
      WHATSAPP_VERIFY_TOKEN: ['whatsapp', 'verifyToken'],
    };
    for (const [envKey, pathArr] of Object.entries(envMap)) {
      const envVal = process.env[envKey];
      if (envVal) {
        let target = this._config;
        for (let i = 0; i < pathArr.length - 1; i++) {
          const segment = pathArr[i];
          target[segment] = target[segment] || {};
          target = target[segment];
        }
        target[pathArr[pathArr.length - 1]] = envVal;
      }
    }
  }

  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[ConfigService] Failed to load config:', err.message);
      return {};
    }
  }

  _save() {
    const data = JSON.stringify(this._config, null, 2);
    fs.writeFileSync(this.configPath, data, 'utf8');
    this.emit('updated', this._config);
  }

  /** Get a deep copy of current config */
  getConfig() {
    return JSON.parse(JSON.stringify(this._config));
}
  /** Get JWT secret */
  getJwtSecret() {
    return this._config.jwtSecret || process.env.JWT_SECRET;
  }

  /** Get Gemini API key */
  getGeminiApiKey() {
    return this._config.geminiApiKey || process.env.GEMINI_API_KEY;
  }

  /** Get Google Sheet ID */
  getGoogleSheetId() {
    return this._config.googleSheetId || process.env.GOOGLE_SHEET_ID;
  }

  /** Get WhatsApp verification token */
  getWhatsAppVerifyToken() {
    return (this._config.whatsapp && this._config.whatsapp.verifyToken) || process.env.WHATSAPP_VERIFY_TOKEN;
  }

  /** Update config with a partial object */
  updateConfig(partial) {
    if (typeof partial !== 'object' || partial === null) {
      throw new Error('Config update must be a non-null object');
    }
    const merge = (target, src) => {
      for (const key of Object.keys(src)) {
        const val = src[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          target[key] = target[key] || {};
          merge(target[key], val);
        } else {
          target[key] = val;
        }
      }
    };
    merge(this._config, partial);
    this._save();
    return this.getConfig();
  }
}

module.exports = ConfigService;
