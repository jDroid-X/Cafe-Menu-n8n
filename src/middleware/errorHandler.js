// ==========================================================
// errorHandler.js - Centralized error handling middleware
// ==========================================================

/**
 * Express error handling middleware. Captures any error passed via next(err)
 * and returns a consistent JSON response while logging the stack trace.
 * Must be the last middleware added to the app.
 */
function errorHandler(err, req, res, next) {
  console.error('[ErrorHandler]', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    // In production you might omit stack, but keep it for debugging here.
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
}

module.exports = errorHandler;
