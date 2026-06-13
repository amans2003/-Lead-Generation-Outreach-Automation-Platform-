'use strict';

/**
 * EmailService
 *
 * Sends emails via Gmail using Nodemailer with OAuth2.
 * Credentials are loaded from environment variables:
 *   EMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 */

const nodemailer = require('nodemailer');
const logger     = require('../../config/logger');
const env        = require('../../config/env');

class EmailService {
  constructor() {
    this._transporter = null;
  }

  // ---------------------------------------------------------------------------
  // Transporter setup
  // ---------------------------------------------------------------------------

  /**
   * Lazily creates the Nodemailer transporter with Gmail OAuth2.
   * Re-uses the same transporter instance across calls.
   *
   * @returns {import('nodemailer').Transporter}
   */
  _getTransporter() {
    if (this._transporter) return this._transporter;

    this._transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type:         'OAuth2',
        user:         env.EMAIL_USER,
        clientId:     env.GMAIL_CLIENT_ID,
        clientSecret: env.GMAIL_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
      },
    });

    // Verify connection on first creation (non-blocking - log only)
    this._transporter.verify((err) => {
      if (err) {
        logger.error('[EmailService] Transporter verification failed', { error: err.message });
      } else {
        logger.info('[EmailService] Gmail OAuth2 transporter ready');
      }
    });

    return this._transporter;
  }

  // ---------------------------------------------------------------------------
  // sendEmail
  // ---------------------------------------------------------------------------

  /**
   * Sends an HTML email.
   *
   * @param {string} to       - Recipient email address
   * @param {string} subject  - Email subject line
   * @param {string} html     - HTML body of the email
   * @param {object} [opts]   - Optional overrides (cc, bcc, replyTo, attachments)
   * @returns {Promise<{messageId: string, response: string}>}
   */
  async sendEmail(to, subject, html, opts = {}) {
    if (!to || !subject || !html) {
      throw new Error('[EmailService] sendEmail requires to, subject, and html');
    }

    const mailOptions = Object.assign(
      {
        from:    '"LeadGen Platform" <' + env.EMAIL_USER + '>',
        to,
        subject,
        html,
      },
      opts
    );

    try {
      const info = await this._getTransporter().sendMail(mailOptions);

      logger.info('[EmailService] Email sent', {
        to,
        subject,
        messageId: info.messageId,
      });

      return {
        messageId: info.messageId,
        response:  info.response,
      };

    } catch (err) {
      logger.error('[EmailService] Failed to send email', {
        to,
        subject,
        error: err.message,
      });

      // Classify common errors for the caller
      if (err.responseCode === 550 || (err.message && err.message.includes('550'))) {
        throw new Error('[EmailService] Recipient address rejected (550): ' + to);
      }
      if (err.message && err.message.toLowerCase().includes('invalid login')) {
        throw new Error('[EmailService] Gmail OAuth2 authentication failed - check credentials');
      }
      if (err.message && err.message.toLowerCase().includes('quota')) {
        throw new Error('[EmailService] Gmail daily sending quota exceeded');
      }

      throw new Error('[EmailService] Failed to send email to ' + to + ': ' + err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Resets the transporter (e.g. after credential rotation).
   * Next call to sendEmail will re-create it.
   */
  resetTransporter() {
    if (this._transporter) {
      this._transporter.close();
      this._transporter = null;
      logger.info('[EmailService] Transporter reset');
    }
  }
}

module.exports = new EmailService();
