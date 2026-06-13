'use strict';

const winston = require('winston');

// ─── Logger setup ─────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: false,
    }),
  ],
});

// ─── Error classifier ─────────────────────────────────────────────────────────

/**
 * Map a known error type to { statusCode, message }.
 * Returns null for unrecognised errors (will fall through to 500).
 *
 * @param {Error} err
 * @returns {{ statusCode: number, message: string } | null}
 */
const classifyError = (err) => {
  // Mongoose CastError  (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return {
      statusCode: 400,
      message: `Invalid value for field '${err.path}': ${err.value}`,
    };
  }

  // Mongoose duplicate key error  (code 11000 / 11001)
  if (err.code === 11000 || err.code === 11001) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return {
      statusCode: 409,
      message: `Duplicate value for '${field}': '${value}' already exists.`,
    };
  }

  // Mongoose ValidationError  (schema-level validation)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return {
      statusCode: 400,
      message: messages.join('. '),
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token has expired. Please log in again.' };
  }
  if (err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Token is not yet active.' };
  }

  // Joi validation errors forwarded as-is
  if (err.isJoi || err.name === 'ValidationError' && err.isJoi) {
    return { statusCode: 400, message: err.message };
  }

  return null;
};

// ─── Global error handler ─────────────────────────────────────────────────────

/**
 * Express global error-handling middleware.
 * Must be registered LAST, after all routes and other middleware.
 *
 * Usage in app.js:
 *   const errorHandler = require('./middleware/errorHandler.middleware');
 *   app.use(errorHandler);
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Respect a statusCode already set on the error object (e.g. by http-errors)
  const knownError = classifyError(err);

  const statusCode = knownError
    ? knownError.statusCode
    : err.statusCode || err.status || 500;

  const message = knownError
    ? knownError.message
    : err.message || 'An unexpected error occurred.';

  // Log the full error (always)
  logger.error({
    message: err.message,
    statusCode,
    name: err.name,
    path: req.path,
    method: req.method,
    stack: err.stack,
    userId: req.user ? req.user.id : null,
  });

  const response = {
    success: false,
    message,
  };

  // Expose stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
