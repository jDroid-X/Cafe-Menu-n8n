// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Controller: SimulatorController (Test Console & Failure Simulation)
// ==========================================================

const SimulatorService = require('../services/SimulatorService');
const MemoryService = require('../services/MemoryService');

class SimulatorController {
    constructor() {
        this.service = new SimulatorService();
        this.memoryService = new MemoryService();
    }

    async chat(req, res) {
        try {
            const rawInput = req.body;
            if (!rawInput || (!rawInput.text && !rawInput.message)) {
                return res.status(400).json({ success: false, error: 'Message text is required' });
            }

            const result = await this.service.processMessage(rawInput);
            res.json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    getSimulationFlags(req, res) {
        res.json({ success: true, data: this.service.getSimulationFlags() });
    }

    setSimulationFlags(req, res) {
        this.service.setSimulationFlags(req.body);
        res.json({ success: true, data: this.service.getSimulationFlags(), message: 'Simulation switches updated' });
    }

    resetSession(req, res) {
        const { sessionKey } = req.body;
        const key = sessionKey || 'demo_session_1';
        const result = this.memoryService.clearSession(key);
        res.json({ success: true, message: `Session ${key} cleared`, data: result });
    }
}

module.exports = SimulatorController;
