// ==========================================================
// ConfigAppController - exposes API to read/write appConfig.json
// ==========================================================

const ConfigService = require('../services/ConfigService');

class ConfigAppController {
  constructor() {
    this.configService = ConfigService.getInstance();
  }

  // GET /config/app -> returns full config
  getAppConfig(req, res) {
    try {
      const cfg = this.configService.getConfig();
      res.json({ success: true, data: cfg });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // PATCH /config/app -> partial update
  updateAppConfig(req, res) {
    try {
      const updated = this.configService.updateConfig(req.body);
      res.json({ success: true, data: updated, message: 'App configuration updated' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = ConfigAppController;
