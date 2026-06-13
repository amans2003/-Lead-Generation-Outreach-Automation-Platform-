'use strict';

/**
 * outreach.routes.js
 *
 * POST  /send-single           – immediately send to one lead      (auth)
 * POST  /campaign              – queue outreach for all leads      (auth, validate)
 * GET   /logs                  – paginated outreach log history    (auth)
 * POST  /webhook/twilio        – Twilio status-callback webhook    (NO auth)
 * POST  /webhook/email         – Inbound e-mail webhook            (NO auth)
 * GET   /whatsapp/qr           – WhatsApp QR code for scanning     (auth)
 * GET   /whatsapp/status       – WhatsApp connection status        (auth)
 */

const express              = require('express');
const Joi                  = require('joi');
const authMiddleware       = require('../middleware/auth.middleware');
const validate             = require('../middleware/validate.middleware');
const OutreachOrchestrator = require('../services/outreach/OutreachOrchestrator');
const WhatsAppService      = require('../services/outreach/WhatsAppService');
const OutreachLog          = require('../models/OutreachLog.model');
const Lead                 = require('../models/Lead.model');
const logger               = require('../config/logger');

const router = express.Router();

// ─── Joi schemas ──────────────────────────────────────────────────────────────

const sendSingleSchema = Joi.object({
  leadId:     Joi.string().length(24).required(),
  campaignId: Joi.string().length(24).required(),
  channel:    Joi.string().valid('sms', 'email', 'whatsapp').required(),
  message:    Joi.string().max(2000).optional(),
});

const campaignOutreachSchema = Joi.object({
  campaignId: Joi.string().length(24).required(),
  filters: Joi.object({
    status:   Joi.string().optional(),
    category: Joi.string().optional(),
    source:   Joi.string().optional(),
    city:     Joi.string().optional(),
  }).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /send-single
 * Body: { leadId, campaignId, channel, message? }
 * Immediately processes one lead through the outreach pipeline.
 */
router.post(
  '/send-single',
  authMiddleware,
  validate(sendSingleSchema),
  async (req, res, next) => {
    try {
      const { leadId, campaignId, channel, message } = req.body;

      const lead = await Lead.findById(leadId).lean();
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found.',
        });
      }

      const result = await OutreachOrchestrator.processLead(
        { ...lead, _channel: channel, _message: message },
        campaignId
      );

      return res.status(202).json({
        success: true,
        message: result.skipped
          ? 'Lead skipped (score below threshold).'
          : 'Outreach job(s) queued.',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /campaign
 * Body: { campaignId, filters? }
 * Queues outreach for every lead matching the optional filters.
 */
router.post(
  '/campaign',
  authMiddleware,
  validate(campaignOutreachSchema),
  async (req, res, next) => {
    try {
      const { campaignId, filters = {} } = req.body;

      // Build Mongoose query from optional filters
      const query = {};
      if (filters.status)   query.status   = filters.status;
      if (filters.category) query.category = filters.category;
      if (filters.source)   query.source   = filters.source;
      if (filters.city)     query.city     = new RegExp(filters.city, 'i');

      const leads = await Lead.find(query).lean();

      if (leads.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No matching leads found.',
          data: { queued: 0 },
        });
      }

      // Process leads asynchronously — don't await all of them before responding
      let queued = 0;
      let skipped = 0;
      const errors = [];

      const BATCH = 20;
      for (let i = 0; i < leads.length; i += BATCH) {
        const batch = leads.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((lead) => OutreachOrchestrator.processLead(lead, campaignId))
        );

        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            if (r.value.skipped) skipped += 1;
            else queued += r.value.queued.length;
          } else {
            errors.push(r.reason && r.reason.message);
          }
        });
      }

      logger.info('outreach.routes: campaign outreach queued', {
        campaignId, queued, skipped, errors: errors.length,
      });

      return res.status(202).json({
        success: true,
        message: queued + ' outreach job(s) queued.',
        data: { total: leads.length, queued, skipped, errors: errors.length },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /logs
 * Query params: page, limit, channel, status, leadId, campaignId
 */
router.get('/logs', authMiddleware, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.channel)    query.channel  = req.query.channel;
    if (req.query.status)     query.status   = req.query.status;
    if (req.query.leadId)     query.lead     = req.query.leadId;
    if (req.query.campaignId) query.campaign = req.query.campaignId;

    const [logs, total] = await Promise.all([
      OutreachLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('lead', 'businessName phone email')
        .populate('campaign', 'name')
        .lean(),
      OutreachLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /webhook/twilio
 * Called by Twilio when an SMS delivery-status changes.
 * No auth — Twilio signs the request but we validate it at the service layer if needed.
 */
router.post('/webhook/twilio', async (req, res, next) => {
  try {
    const { MessageSid, MessageStatus, To, From, Body } = req.body;

    logger.info('outreach.routes: Twilio webhook received', {
      MessageSid, MessageStatus, To, From,
    });

    if (MessageSid && MessageStatus) {
      // Map Twilio status to OutreachLog status
      const statusMap = {
        sent:        'sent',
        delivered:   'delivered',
        undelivered: 'failed',
        failed:      'failed',
        received:    'responded',
      };

      const outreachStatus = statusMap[MessageStatus] || MessageStatus;

      // Update the matching OutreachLog
      await OutreachLog.findOneAndUpdate(
        { twilioSid: MessageSid },
        {
          $set: {
            status:      outreachStatus,
            deliveredAt: MessageStatus === 'delivered' ? new Date() : undefined,
            respondedAt: MessageStatus === 'received'  ? new Date() : undefined,
            response:    Body || undefined,
          },
        }
      );
    }

    // Twilio expects a 200 TwiML response (empty body is fine)
    res.set('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');
  } catch (err) {
    logger.error('outreach.routes: Twilio webhook error', { error: err.message });
    // Still return 200 so Twilio does not retry
    res.set('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');
  }
});

/**
 * POST /webhook/email
 * Called by an inbound email forwarding service (e.g. SendGrid inbound parse,
 * Mailgun routes, etc.) when a recipient replies.
 * No auth.
 */
router.post('/webhook/email', async (req, res, next) => {
  try {
    const { from, subject, text, html, headers } = req.body;

    logger.info('outreach.routes: inbound email webhook received', { from, subject });

    // Try to match the email to an OutreachLog by the "from" address of the reply
    if (from) {
      const replyEmail = (typeof from === 'string' ? from : from.email || '').toLowerCase().trim();

      const log = await OutreachLog.findOne({ channel: 'email', status: { $in: ['sent', 'delivered'] } })
        .populate('lead', 'email')
        .sort({ createdAt: -1 });

      if (log && log.lead && log.lead.email && log.lead.email.toLowerCase() === replyEmail) {
        log.status      = 'responded';
        log.respondedAt = new Date();
        log.response    = (text || html || '').slice(0, 2000);
        await log.save();
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('outreach.routes: email webhook error', { error: err.message });
    return res.status(200).json({ success: true }); // always ACK
  }
});

/**
 * GET /whatsapp/qr
 * Returns the current WhatsApp QR code as a base64 data-URL (or 204 if not needed).
 */
router.get('/whatsapp/qr', authMiddleware, (req, res) => {
  const qr = WhatsAppService.getQR();

  if (!qr) {
    return res.status(204).end();
  }

  return res.status(200).json({
    success: true,
    data: { qr },
  });
});

/**
 * GET /whatsapp/status
 * Returns WhatsApp client connection status.
 */
router.get('/whatsapp/status', authMiddleware, (req, res) => {
  const status = WhatsAppService.getStatus();

  return res.status(200).json({
    success: true,
    data: { status },
  });
});

module.exports = router;
