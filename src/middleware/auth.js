// ==========================================================
// auth.js - JWT verification middleware for protected routes
// ==========================================================

const jwt = require('jsonwebtoken');
const ConfigService = require('../services/ConfigService');

/**
 * Middleware to protect routes using JWT authentication.
 * Expects Authorization header in the form: "Bearer <token>".
 * On success, attaches decoded payload to req.user and calls next().
 * On failure, responds with 401 Unauthorized.
 */
function verifySession(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthenticated' });
  }

  try {
    const secret = ConfigService.getInstance().getJwtSecret() || process.env.JWT_SECRET || 'default_jwt_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthenticated' });
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

module.exports = { verifySession, requireRole };
