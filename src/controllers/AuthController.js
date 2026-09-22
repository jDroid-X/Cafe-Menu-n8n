// ==========================================================
// AuthController - simple login returning a JWT (admin/demo)
// ==========================================================

const jwt = require('jsonwebtoken');

// Demo credentials – can be overridden via env vars for production
const DEMO_USER = {
  username: process.env.DEMO_USERNAME || 'admin',
  password: process.env.DEMO_PASSWORD || 'demo', // plain text only for demo
  role: 'demo'
};

class AuthController {
  // POST /auth/login
  login(req, res) {
    const { username, password, mode } = req.body;
    // mode defaults to 'demo'
    if ((mode || 'demo') === 'demo') {
      if (username === DEMO_USER.username && password === DEMO_USER.password) {
        const token = jwt.sign({ username, role: DEMO_USER.role }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });
        return res.json({ success: true, token });
      }
      return res.status(401).json({ success: false, error: 'Invalid demo credentials' });
    }
    // Live mode – placeholder for future registration flow
    return res.status(403).json({ success: false, error: 'Live mode not implemented yet' });
  }
}

module.exports = AuthController;
