'use strict';

/**
 * WhatsAppService
 *
 * Wraps whatsapp-web.js to provide:
 *  - initialize()          : boot the WA client, handle QR / ready / message events
 *  - sendMessage(to, msg)  : send a WhatsApp message (normalises Indian numbers)
 *  - getQR()               : return the current QR code as base64 PNG (for dashboard display)
 *  - getStatus()           : return the current connection status string
 *  - onMessage(callback)   : register a handler for incoming messages
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger  = require('../../config/logger');
const env     = require('../../config/env');

// Connection state constants
const STATUS = {
  INITIALIZING:   'initializing',
  QR_READY:       'qr_ready',
  AUTHENTICATED:  'authenticated',
  READY:          'ready',
  DISCONNECTED:   'disconnected',
  FAILED:         'failed',
};

class WhatsAppService {
  constructor() {
    this._client          = null;
    this._status          = STATUS.DISCONNECTED;
    this._qrBase64        = null;
    this._messageHandlers = [];
    this._readyPromise    = null;
    this._readyResolve    = null;
    this._readyReject     = null;
  }

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  /**
   * Creates the whatsapp-web.js Client, wires up all events, and starts
   * the Puppeteer browser session.  Safe to call multiple times (no-op if
   * already initialised).
   *
   * @returns {Promise<void>} resolves once the client is READY
   */
  async initialize() {
    if (this._client && this._status === STATUS.READY) {
      logger.info('[WhatsAppService] Already initialised and ready');
      return;
    }

    this._status = STATUS.INITIALIZING;

    // Build the client
    this._client = new Client({
      authStrategy: new LocalAuth({
        dataPath: env.WHATSAPP_SESSION_PATH || './whatsapp-session',
      }),
      puppeteer: {
        headless:        env.WHATSAPP_HEADLESS !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // One-time promise that resolves when READY, rejects on auth_failure
    this._readyPromise = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject  = reject;
    });

    // -------------------------------------------------------------------------
    // Event: QR code
    // -------------------------------------------------------------------------
    this._client.on('qr', async (qrString) => {
      this._status = STATUS.QR_READY;
      logger.info('[WhatsAppService] QR code received - scan with WhatsApp');

      try {
        this._qrBase64 = await qrcode.toDataURL(qrString);
      } catch (err) {
        logger.error('[WhatsAppService] Failed to convert QR to base64', { error: err.message });
        this._qrBase64 = null;
      }
    });

    // -------------------------------------------------------------------------
    // Event: Authenticated
    // -------------------------------------------------------------------------
    this._client.on('authenticated', () => {
      this._status  = STATUS.AUTHENTICATED;
      this._qrBase64 = null;    // QR no longer needed
      logger.info('[WhatsAppService] Authenticated');
    });

    // -------------------------------------------------------------------------
    // Event: Ready
    // -------------------------------------------------------------------------
    this._client.on('ready', () => {
      this._status = STATUS.READY;
      logger.info('[WhatsAppService] Client is READY');
      if (this._readyResolve) {
        this._readyResolve();
      }
    });

    // -------------------------------------------------------------------------
    // Event: Authentication failure
    // -------------------------------------------------------------------------
    this._client.on('auth_failure', (msg) => {
      this._status = STATUS.FAILED;
      logger.error('[WhatsAppService] Authentication failed', { msg });
      if (this._readyReject) {
        this._readyReject(new Error('WhatsApp authentication failed: ' + msg));
      }
    });

    // -------------------------------------------------------------------------
    // Event: Disconnected
    // -------------------------------------------------------------------------
    this._client.on('disconnected', (reason) => {
      this._status  = STATUS.DISCONNECTED;
      this._qrBase64 = null;
      logger.warn('[WhatsAppService] Disconnected', { reason });
    });

    // -------------------------------------------------------------------------
    // Event: Incoming message
    // -------------------------------------------------------------------------
    this._client.on('message', (msg) => {
      logger.info('[WhatsAppService] Incoming message', {
        from:    msg.from,
        bodyLen: msg.body ? msg.body.length : 0,
      });
      for (const handler of this._messageHandlers) {
        try {
          handler(msg);
        } catch (handlerErr) {
          logger.error('[WhatsAppService] Message handler error', { error: handlerErr.message });
        }
      }
    });

    // Start the Puppeteer session
    await this._client.initialize();

    // Wait until the client signals READY (or fails)
    return this._readyPromise;
  }

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  /**
   * Sends a WhatsApp message.
   * Formats the number as 91XXXXXXXXXX@c.us (Indian numbers assumed).
   *
   * @param {string} to       - Phone number (10-digit Indian or E.164)
   * @param {string} message  - Text message to send
   * @returns {Promise<{id: string, timestamp: number}>}
   */
  async sendMessage(to, message) {
    if (this._status !== STATUS.READY) {
      throw new Error(
        '[WhatsAppService] Client not ready (status: ' + this._status + '). ' +
        'Call initialize() first.'
      );
    }
    if (!to || !message) {
      throw new Error('[WhatsAppService] sendMessage requires both `to` and `message`');
    }

    const chatId = this._formatChatId(to);

    try {
      const result = await this._client.sendMessage(chatId, message);
      logger.info('[WhatsAppService] Message sent', { to: chatId, msgId: result.id.id });
      return { id: result.id.id, timestamp: result.timestamp };

    } catch (err) {
      logger.error('[WhatsAppService] Failed to send message', {
        to: chatId,
        error: err.message,
      });
      throw new Error('[WhatsAppService] Failed to send to ' + chatId + ': ' + err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // getQR
  // ---------------------------------------------------------------------------

  /**
   * Returns the latest QR code as a base64 data-URL string, or null if
   * the client is already authenticated / no QR has been generated yet.
   *
   * @returns {string|null}
   */
  getQR() {
    return this._qrBase64;
  }

  // ---------------------------------------------------------------------------
  // getStatus
  // ---------------------------------------------------------------------------

  /**
   * Returns the current connection status string.
   * One of: 'initializing' | 'qr_ready' | 'authenticated' | 'ready' | 'disconnected' | 'failed'
   *
   * @returns {string}
   */
  getStatus() {
    return this._status;
  }

  // ---------------------------------------------------------------------------
  // onMessage
  // ---------------------------------------------------------------------------

  /**
   * Registers a callback invoked for every incoming WhatsApp message.
   * Multiple handlers can be registered and all will be called.
   *
   * @param {(msg: import('whatsapp-web.js').Message) => void} callback
   */
  onMessage(callback) {
    if (typeof callback !== 'function') {
      throw new Error('[WhatsAppService] onMessage callback must be a function');
    }
    this._messageHandlers.push(callback);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a phone number to WhatsApp chat ID format: 91XXXXXXXXXX@c.us
   *
   * @param {string} phone
   * @returns {string}
   */
  _formatChatId(phone) {
    let digits = phone.replace(/\D/g, '');

    if (digits.startsWith('91') && digits.length === 12) {
      return digits + '@c.us';
    }
    if (digits.length === 10) {
      return '91' + digits + '@c.us';
    }
    // Already has country code (other countries / already formatted)
    return digits + '@c.us';
  }
}

module.exports = new WhatsAppService();
