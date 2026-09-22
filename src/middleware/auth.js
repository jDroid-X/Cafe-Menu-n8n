// ==========================================================
// auth.js - JWT verification middleware for protected routes
// ==========================================================

const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes using JWT authentication.
 * Expects Authorization header in the form: "Bearer <token>".
 * On success, attaches decoded payload to req.user and calls next().
 * On failure, responds with 401 Unauthorized.
 */
function verifyJwt(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: 'Invalid Authorization format' });
  }
  const token = parts[1];
  try {
    const ConfigService = require('../services/ConfigService');
  const secret = ConfigService.getInstance().getJwtSecret();
  const payload = jwt.verify(token, secret);
  req.user = payload; // attach decoded payload for downstream use
    req.user = payload; // attach decoded payload for downstream use
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, error: 'Forbidden – insufficient role' });
    }
    next();
  };
}

module.exports = { verifyJwt, requireRole };
