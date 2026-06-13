'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Resolve LOG_DIR lazily so this module can be required before env.js validates
// (e.g. during early boot errors). Falls back to 'logs' if env not ready yet.
function getLogDir() {
  try {
    const env = require('./env');
    return env.LOG_DIR || 'logs';
  } catch (_) {
    return 'logs';
  }
}

function getLogLevel() {
  try {
    const env = require('./env');
    return env.LOG_LEVEL || 'info';
  } catch (_) {
    return 'info';
  }
}

const logDir = path.isAbsolute(getLogDir())
  ? getLogDir()
  : path.join(process.cwd(), getLogDir());

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, errors, json, colorize, simple } = format;

const logger = createLogger({
  level: getLogLevel(),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Human-readable colorized output for the console
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        simple()
      ),
    }),

    // Error-only log file
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),

    // All-levels log file
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],

  // Do not crash on unhandled exceptions — let the caller decide
  exitOnError: false,
});

module.exports = logger;
