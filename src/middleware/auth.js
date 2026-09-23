// ==========================================================
// auth.js - JWT & Session verification middleware for protected routes
// Zero external binary dependencies (powered by SecurityService)
// ==========================================================

const SecurityService = require('../services/SecurityService');

/**
 * Middleware to protect routes using JWT authentication or active session.
 * Expects Authorization header in the form: "Bearer <token>".
 * On success, attaches decoded payload to req.user and calls next().
 */
function verifySession(req, res, next) {
  const security = SecurityService.getInstance();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = security.verifyToken(token);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token: ' + err.message });
    }
  }

  // Check active express-session
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // Graceful Local Human-In-The-Loop Fallback for localhost development/demo
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.ip === '127.0.0.1' || req.ip === '::1';
  if (isLocalhost) {
    req.user = { username: 'admin@jdroidx.ai', role: 'admin', isLocalFallback: true };
    return next();
  }

  return res.status(401).json({ success: false, error: 'Unauthenticated — please sign in' });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    // Admin role has universal permission
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden – insufficient role' });
    }
    next();
  };
}

module.exports = { verifySession, requireRole };
