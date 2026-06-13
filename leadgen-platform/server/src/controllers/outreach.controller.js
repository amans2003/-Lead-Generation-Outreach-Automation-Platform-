'use strict';

/**
 * outreach.controller.js
 * HTTP handlers for outreach operations:
 *   sendSingle, createCampaign, getLogs,
 *   twilioWebhook, emailWebhook, getWhatsAppQR, getWhatsAppStatus
 */

const Lead = require('../models/Lead.model');
const Campaign = require('../models/Campaign.model');
const OutreachLog = require('../models/OutreachLog.model');
const outreachOrchestrator = require('../services/outreach/OutreachOrchestrator');
const whatsAppService = require('../services/outreach/WhatsAppService');
const { classifyResponse } = require('../services/ai/ResponseClassifier');
const logger = require('../config/logger');

/**
 * POST /api/outreach/send
 * Send a single outreach message to one lead on the specified channel.
 * Body: { leadId, channel, message? }
 */
async function sendSingle(req, res, next) {
  try {
    const { leadId, channel, message } = req.body;

    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      return next(err);
    }

    // Build or find a default single-send campaign
    let campaign = await Campaign.findOne({ name: '__single_send__' }).lean();
    if (!campaign) {
      campaign = await Campaign.create({
        name: '__single_send__',
        channels: [channel],
        targetCategories: [],
        targetCities: [],
        messageTemplate: message || '',
        useAI: !message,
        status: 'active',
      });
      campaign = campaign.toObject();
    }

    // If a custom message is provided, temporarily override the template
    if (message) {
      campaign.messageTemplate = message;
      campaign.useAI = false;
    }
    campaign.channels = [channel];

    const result = await outreachOrchestrator.processLead(lead, campaign._id.toString());

    return res.status(202).json({
      success: true,
      message: 'Outreach queued',
      data: result,
    });
  } catch (err) {
    logger.error('outreach.controller.sendSingle error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/outreach/campaign
 * Create a new campaign and start outreach to matching leads.
 * Body: { name, channels, targetCategories, targetCities, messageTemplate?, useAI? }
 */
async function createCampaign(req, res, next) {
  try {
    const {
      name,
      channels,
      targetCategories,
      targetCities,
      messageTemplate,
      useAI = true,
    } = req.body;

    // Build or save campaign
    const campaign = await Campaign.create({
      name,
      channels,
      targetCategories,
      targetCities,
      messageTemplate: messageTemplate || '',
      useAI,
      status: 'active',
      createdBy: req.user ? req.user._id : undefined,
    });

    // Find matching leads (new / not yet contacted)
    const query = {
      status: { $in: ['new'] },
    };
    if (targetCategories && targetCategories.length > 0) {
      query.category = { $in: targetCategories };
    }
    if (targetCities && targetCities.length > 0) {
      query.city = { $in: targetCities.map((c) => new RegExp('^' + c + '$', 'i')) };
    }

    const leads = await Lead.find(query).lean();

    logger.info('outreach.controller.createCampaign: processing leads', {
      campaignId: campaign._id,
      leadCount: leads.length,
    });

    // Enqueue outreach for each lead (non-blocking)
    let queuedCount = 0;
    let skippedCount = 0;

    for (const lead of leads) {
      try {
        const result = await outreachOrchestrator.processLead(lead, campaign._id.toString());
        if (result.skipped) skippedCount += 1;
        else queuedCount += 1;
      } catch (processErr) {
        logger.warn('outreach.controller.createCampaign: processLead failed', {
          leadId: lead._id,
          error: processErr.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Campaign created and outreach jobs enqueued',
      data: {
        campaign,
        totalLeads: leads.length,
        queuedCount,
        skippedCount,
      },
    });
  } catch (err) {
    logger.error('outreach.controller.createCampaign error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/outreach/logs
 * Return paginated outreach logs with optional filters.
 * Query params: leadId, campaignId, channel, status, page, limit
 */
async function getLogs(req, res, next) {
  try {
    const { leadId, campaignId, channel, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (leadId) query.lead = leadId;
    if (campaignId) query.campaign = campaignId;
    if (channel) query.channel = channel;
    if (status) query.status = status;

    const [logs, total] = await Promise.all([
      OutreachLog.find(query)
        .populate('lead', 'businessName ownerName phone email city')
        .populate('campaign', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
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
    logger.error('outreach.controller.getLogs error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/outreach/webhooks/twilio
 * Handles incoming Twilio SMS reply webhook.
 * Classifies the reply with AI and updates the lead status accordingly.
 * Twilio sends: From, Body, MessageSid, To
 */
async function twilioWebhook(req, res, next) {
  try {
    const { From, Body, MessageSid } = req.body;

    if (!From || !Body) {
      logger.warn('outreach.controller.twilioWebhook: missing From or Body', req.body);
      return res.status(200).send('<Response></Response>');
    }

    // Normalise phone number — strip non-digits and remove leading country code
    const normalised = From.replace(/\D/g, '').replace(/^91/, '').slice(-10);

    // Find the lead by phone number
    const lead = await Lead.findOne({
      $or: [
        { phone: { $regex: normalised + '$' } },
        { whatsapp: { $regex: normalised + '$' } },
      ],
    });

    if (!lead) {
      logger.warn('outreach.controller.twilioWebhook: lead not found for phone', { From });
      return res.status(200).send('<Response></Response>');
    }

    // Classify the response with AI
    const classification = await classifyResponse(Body);

    // Update the lead
    lead.status = classification;
    lead.lastResponseAt = new Date();
    lead.lastResponseText = Body;
    await lead.save();

    // Update the most recent outreach log for this lead
    await OutreachLog.findOneAndUpdate(
      { lead: lead._id, channel: 'sms', status: { $in: ['sent', 'delivered'] } },
      {
        $set: {
          status: 'responded',
          response: Body,
          respondedAt: new Date(),
          twilioSid: MessageSid,
        },
      },
      { sort: { createdAt: -1 } }
    );

    logger.info('outreach.controller.twilioWebhook: classified reply', {
      leadId: lead._id,
      classification,
      messageSid: MessageSid,
    });

    // Respond with empty TwiML to acknowledge receipt
    return res.status(200).type('text/xml').send('<Response></Response>');
  } catch (err) {
    logger.error('outreach.controller.twilioWebhook error', { message: err.message });
    // Always return 200 to Twilio to prevent retries
    return res.status(200).type('text/xml').send('<Response></Response>');
  }
}

/**
 * POST /api/outreach/webhooks/email
 * Handles inbound email reply webhook (e.g. SendGrid Inbound Parse).
 * Classifies the reply with AI and updates the lead status.
 */
async function emailWebhook(req, res, next) {
  try {
    const senderEmail =
      req.body.from ||
      req.body.sender ||
      (req.body.envelope && JSON.parse(req.body.envelope || '{}').from);

    const text = req.body.text || req.body.html || req.body.body || '';

    if (!senderEmail) {
      logger.warn('outreach.controller.emailWebhook: missing sender email');
      return res.status(200).json({ success: true });
    }

    const emailAddr = senderEmail.match(/[^\s<>"]+@[^\s<>"]+\.[^\s<>"]+/);
    const cleanEmail = emailAddr ? emailAddr[0].toLowerCase() : null;

    if (!cleanEmail) {
      return res.status(200).json({ success: true });
    }

    const lead = await Lead.findOne({ email: cleanEmail });

    if (!lead) {
      logger.warn('outreach.controller.emailWebhook: lead not found', { email: cleanEmail });
      return res.status(200).json({ success: true });
    }

    const classification = await classifyResponse(text);

    lead.status = classification;
    lead.lastResponseAt = new Date();
    lead.lastResponseText = text.slice(0, 500);
    await lead.save();

    await OutreachLog.findOneAndUpdate(
      { lead: lead._id, channel: 'email', status: { $in: ['sent', 'delivered'] } },
      {
        $set: {
          status: 'responded',
          response: text.slice(0, 500),
          respondedAt: new Date(),
        },
      },
      { sort: { createdAt: -1 } }
    );

    logger.info('outreach.controller.emailWebhook: classified reply', {
      leadId: lead._id,
      classification,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('outreach.controller.emailWebhook error', { message: err.message });
    return res.status(200).json({ success: true });
  }
}

/**
 * GET /api/outreach/whatsapp/qr
 * Returns the WhatsApp QR code as a base64 data-URL, or status if already connected.
 */
async function getWhatsAppQR(req, res, next) {
  try {
    const status = whatsAppService.getStatus();
    const qr = whatsAppService.getQR();

    if (status === 'ready') {
      return res.status(200).json({
        success: true,
        data: { status, qr: null, message: 'WhatsApp is already connected' },
      });
    }

    if (!qr) {
      // Attempt to initialise (non-blocking — don't await full readiness)
      whatsAppService.initialize().catch((initErr) => {
        logger.error('WhatsApp initialize error (background)', { error: initErr.message });
      });

      return res.status(200).json({
        success: true,
        data: {
          status,
          qr: null,
          message: 'WhatsApp client is initialising. Poll this endpoint again in a few seconds.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { status, qr },
    });
  } catch (err) {
    logger.error('outreach.controller.getWhatsAppQR error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/outreach/whatsapp/status
 * Returns the current WhatsApp connection status string.
 */
async function getWhatsAppStatus(req, res, next) {
  try {
    const status = whatsAppService.getStatus();

    return res.status(200).json({
      success: true,
      data: { status },
    });
  } catch (err) {
    logger.error('outreach.controller.getWhatsAppStatus error', { message: err.message });
    next(err);
  }
}

module.exports = {
  sendSingle,
  createCampaign,
  getLogs,
  twilioWebhook,
  emailWebhook,
  getWhatsAppQR,
  getWhatsAppStatus,
};
