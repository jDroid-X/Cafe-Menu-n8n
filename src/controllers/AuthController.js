// ==========================================================
// AuthController - Session based authentication using SQLite users table
// ==========================================================

// JWT authentication using jsonwebtoken
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ConfigService = require('../services/ConfigService');
const DatabaseService = require('../services/DatabaseService'); // singleton db service

class AuthController {
  /** POST /auth/login */
  async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    try {
      const db = DatabaseService.getInstance();
      const user = db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      // Generate JWT token
      const payload = { username: user.username, role: user.role };
      const secret = ConfigService.getInstance().getJwtSecret() || process.env.JWT_SECRET || 'default_jwt_secret';
      const token = jwt.sign(payload, secret, { expiresIn: '8h' });
      return res.json({ success: true, token, user: payload });
    } catch (err) {
      console.error('[AuthController] Login error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
  // Register new user (admin or regular)
  async register(req, res) {
    const { username, email, password, role = 'user' } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'username, email, and password required' });
    }
    try {
      const db = DatabaseService.getInstance();
      const existing = db.queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
      if (existing) {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', [username, email, passwordHash, role]);
      return res.json({ success: true, message: 'User registered' });
    } catch (err) {
      console.error('[AuthController] Register error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

}
module.exports = AuthController;


