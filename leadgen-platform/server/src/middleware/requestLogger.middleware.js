'use strict';

const winston = require('winston');

// ─── Logger setup ─────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase()} ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
    new winston.transports.File({
      filename: 'logs/requests.log',
      handleExceptions: false,
    }),
  ],
});

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Request Logger Middleware
 *
 * Logs each HTTP request once the response has finished:
 *   METHOD  /path/url  STATUS  Xms
 *
 * Usage in app.js (register early, before routes):
 *   const requestLogger = require('./middleware/requestLogger.middleware');
 *   app.use(requestLogger);
 */
const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint(); // nanosecond precision

  // Log when the response has been sent so we capture the final status code
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs) / 1_000_000;

    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const contentLength = res.getHeader('content-length') || '-';
    const userAgent = req.get('user-agent') || '-';
    const ip = req.ip || req.connection.remoteAddress || '-';

    // Choose log level based on status code
    let logLevel = 'info';
    if (statusCode >= 500) logLevel = 'error';
    else if (statusCode >= 400) logLevel = 'warn';

    logger[logLevel](
      `${method} ${url} ${statusCode} ${durationMs.toFixed(2)}ms`,
      {
        method,
        url,
        statusCode,
        responseTimeMs: parseFloat(durationMs.toFixed(2)),
        contentLength,
        ip,
        userAgent,
        userId: req.user ? req.user.id : null,
      }
    );
  });

  // Also catch aborted requests
  res.on('close', () => {
    if (!res.writableEnded) {
      const durationNs = process.hrtime.bigint() - startTime;
      const durationMs = Number(durationNs) / 1_000_000;
      logger.warn(`${req.method} ${req.originalUrl || req.url} ABORTED ${durationMs.toFixed(2)}ms`);
    }
  });

  next();
};

module.exports = requestLogger;
