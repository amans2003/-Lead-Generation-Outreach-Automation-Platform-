'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 *
 * Reads the token from:
 *   1. Authorization header  ->  "Bearer <token>"
 *   2. httpOnly cookie       ->  req.cookies.token
 *
 * On success  : attaches req.user = { id, email, role } and calls next()
 * On failure  : responds 401 with JSON error
 */
const authMiddleware = (req, res, next) => {
  try {
    let token = null;

    // 1. Try Authorization header first
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // 2. Fall back to httpOnly cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth.middleware] JWT_SECRET environment variable is not set.');
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
      });
    }

    const decoded = jwt.verify(token, secret);

    req.user = {
      id: decoded.id || decoded._id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }

    if (err.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not yet active.',
      });
    }

    return next(err);
  }
};

module.exports = authMiddleware;
