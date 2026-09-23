// ==========================================================
// AuthController - Session & JWT based authentication using SQLite users table
// Zero external binary dependencies (powered by SecurityService)
// ==========================================================

const SecurityService = require('../services/SecurityService');
const DatabaseService = require('../database/db');

class AuthController {
  constructor() {
    this.security = SecurityService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  /** POST /auth/login */
  async login(req, res) {
    const usernameOrEmail = req.body?.username || req.body?.email;
    const password = req.body?.password;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ success: false, error: 'Username or email and password required' });
    }
    try {
      const user = this.db.queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      const passwordMatch = this.security.verifyPassword(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      // Generate JWT token
      const payload = { username: user.username, role: user.role, email: user.email };
      const token = this.security.signToken(payload);

      // Also set session if available
      if (req.session) {
        req.session.user = payload;
      }

      return res.json({ success: true, token, user: payload });
    } catch (err) {
      console.error('[AuthController] Login error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // Register new user (admin or regular)
  async register(req, res) {
    const { username, email, password, role = 'user' } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'username, email, and password required' });
    }
    try {
      const existing = this.db.queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
      if (existing) {
        return res.status(409).json({ success: false, error: 'User already exists' });
      }
      const passwordHash = this.security.hashPassword(password);
      this.db.run(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role]
      );
      return res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
      console.error('[AuthController] Register error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = AuthController;


