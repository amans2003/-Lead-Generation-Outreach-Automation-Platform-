'use strict';

/**
 * Retry helper with exponential backoff.
 * Uses a logger if available, otherwise falls back to console.
 */

let logger;
try {
  // Attempt to load the shared logger. Gracefully degrade if not present.
  logger = require('../config/logger');
} catch (_) {
  logger = {
    info: (...args) => console.info('[retryHelper]', ...args),
    warn: (...args) => console.warn('[retryHelper]', ...args),
    error: (...args) => console.error('[retryHelper]', ...args),
  };
}

/**
 * Sleeps for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff.
 *
 * @param {() => Promise<any>} fn          - The async function to retry.
 * @param {object}             [options]   - Retry options.
 * @param {number}             [options.retries=3]  - Maximum number of retry attempts.
 * @param {number}             [options.delay=1000] - Initial delay in ms before first retry.
 * @param {number}             [options.backoff=2]  - Multiplier applied to delay on each retry.
 * @param {string}             [options.label]      - Optional label for log messages.
 * @returns {Promise<any>} The resolved value of fn() on success.
 * @throws {Error} Re-throws the last error after all retries are exhausted.
 */
async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    label = 'operation',
  } = options;

  let attempt = 0;
  let currentDelay = delay;
  let lastError;

  while (attempt <= retries) {
    try {
      if (attempt > 0) {
        logger.info(
          `[retryHelper] Attempt ${attempt}/${retries} for "${label}" after ${currentDelay / backoff}ms delay.`
        );
      }

      const result = await fn();
      if (attempt > 0) {
        logger.info(
          `[retryHelper] "${label}" succeeded on attempt ${attempt + 1}.`
        );
      }
      return result;
    } catch (err) {
      lastError = err;
      logger.warn(
        `[retryHelper] "${label}" failed on attempt ${attempt + 1}/${retries + 1}: ${err.message}`
      );

      if (attempt >= retries) {
        break;
      }

      logger.info(`[retryHelper] Waiting ${currentDelay}ms before next attempt...`);
      await sleep(currentDelay);
      currentDelay *= backoff;
      attempt++;
    }
  }

  logger.error(
    `[retryHelper] "${label}" failed after ${retries + 1} attempt(s). Last error: ${lastError.message}`
  );
  throw lastError;
}

module.exports = { retry };
