'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Middleware
 *
 * Exports three pre-configured limiters:
 *
 *   apiLimiter     - General API routes   : 100 req / 15 min
 *   authLimiter    - Auth routes          :  10 req / 15 min
 *   scraperLimiter - Scraper routes       :   5 req /  1 min
 */

// ─── Shared helper ──────────────────────────────────────────────────────────

/**
 * Build a standard rate-limit response body so all limiters are consistent.
 * @param {string} message - Human-readable message
 * @returns {Function} handler for the `handler` option of express-rate-limit
 */
const buildHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    message,
    retryAfter: res.getHeader('Retry-After'),
  });
};

// ─── General API limiter ─────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,               // raised from 100 — dashboard + socket.io need headroom
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again after 15 minutes.',
  handler: buildHandler('Too many requests. Please try again after 15 minutes.'),
  skipSuccessfulRequests: true, // only failed requests count against the limit
});

// ─── Auth limiter (stricter) ──────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  handler: buildHandler('Too many authentication attempts. Please try again after 15 minutes.'),
  skipSuccessfulRequests: false,
});

// ─── Scraper limiter ──────────────────────────────────────────────────────────

const scraperLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Scraper rate limit exceeded. Please try again after 1 minute.',
  handler: buildHandler('Scraper rate limit exceeded. Please try again after 1 minute.'),
  skipSuccessfulRequests: false,
});

module.exports = { apiLimiter, authLimiter, scraperLimiter };
