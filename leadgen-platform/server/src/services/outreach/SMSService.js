'use strict';

/**
 * SMSService
 *
 * Sends SMS messages via Twilio.
 * Enforces the OUTREACH_SMS_PER_HOUR rate limit using a simple in-process
 * sliding-window counter backed by an array of timestamps.
 */

const twilio = require('twilio');
const logger = require('../../config/logger');
const env    = require('../../config/env');

// ---------------------------------------------------------------------------
// Rate-limit state (in-process sliding window)
// ---------------------------------------------------------------------------
const _sentTimestamps = [];   // UTC epoch ms for each sent SMS this hour

/**
 * Returns the number of SMSes sent in the last 60 minutes.
 */
function _countInLastHour() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  // Remove old entries while we count
  while (_sentTimestamps.length > 0 && _sentTimestamps[0] < cutoff) {
    _sentTimestamps.shift();
  }
  return _sentTimestamps.length;
}

/**
 * Wait until there is capacity in the current hour window.
 * Sleeps in 10-second increments and rechecks.
 */
async function _waitForCapacity() {
  const limit = env.OUTREACH_SMS_PER_HOUR;
  while (_countInLastHour() >= limit) {
    logger.info(
      '[SMSService] Rate limit reached (' + limit + '/h). Waiting 10 s...'
    );
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

// ---------------------------------------------------------------------------
// SMSService class
// ---------------------------------------------------------------------------
class SMSService {
  constructor() {
    this._client = null;
  }

  /**
   * Lazily initialises and returns the Twilio client.
   * @returns {import('twilio').Twilio}
   */
  _getClient() {
    if (!this._client) {
      this._client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return this._client;
  }

  /**
   * Sends an SMS to `to` with the given `message`.
   * Blocks until the hourly rate limit has capacity.
   *
   * @param {string} to       - E.164 phone number, e.g. "+919876543210"
   * @param {string} message  - Plain-text message body
   * @returns {Promise<{sid: string, status: string}>}
   */
  async sendSMS(to, message) {
    if (!to || !message) {
      throw new Error('[SMSService] sendSMS requires both `to` and `message`');
    }

    // Normalise to E.164 for Indian numbers
    const normalised = this._normalisePhone(to);

    // Respect rate limit
    await _waitForCapacity();

    try {
      const msg = await this._getClient().messages.create({
        to:   normalised,
        from: env.TWILIO_PHONE_NUMBER,
        body: message,
      });

      // Record timestamp for rate-limit accounting
      _sentTimestamps.push(Date.now());

      logger.info('[SMSService] SMS sent', { to: normalised, sid: msg.sid, status: msg.status });

      return { sid: msg.sid, status: msg.status };

    } catch (err) {
      // Twilio errors have a numeric `code` and a human-readable `message`
      const twilioCode    = err.code    || 'UNKNOWN';
      const twilioMessage = err.message || String(err);

      logger.error('[SMSService] Failed to send SMS', {
        to: normalised,
        twilioCode,
        error: twilioMessage,
      });

      // Classify and re-throw with a friendly description
      if (twilioCode === 21211) {
        throw new Error('[SMSService] Invalid "to" phone number: ' + normalised);
      }
      if (twilioCode === 21614) {
        throw new Error('[SMSService] Phone number is not SMS-capable: ' + normalised);
      }
      if (twilioCode === 20003) {
        throw new Error('[SMSService] Twilio authentication failed - check SID/token');
      }

      throw new Error('[SMSService] Twilio error ' + twilioCode + ': ' + twilioMessage);
    }
  }

  /**
   * Normalises a phone number to E.164 format.
   * Adds the +91 India country code if no country code is present.
   *
   * @param {string} phone
   * @returns {string}
   */
  _normalisePhone(phone) {
    let p = phone.replace(/\D/g, '');           // strip non-digits
    if (p.startsWith('91') && p.length === 12) {
      return '+' + p;
    }
    if (p.length === 10) {
      return '+91' + p;
    }
    // Already has country code (other countries)
    return '+' + p;
  }
}

module.exports = new SMSService();
