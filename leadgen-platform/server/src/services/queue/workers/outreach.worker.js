'use strict';

/**
 * outreach.worker.js
 * BullMQ Worker for the 'outreach-jobs' queue.  Concurrency: 5.
 *
 * Job processor flow:
 *  1. Fetch lead from DB
 *  2. Determine channel from job.data
 *  3. Generate AI message if no message provided
 *  4. Send via SMSService / EmailService / WhatsAppService
 *  5. Create OutreachLog document
 *  6. Update lead.outreachAttempts and lead.lastOutreachAt
 *  7. On failure: log error, update OutreachLog status to 'failed'
 */

const { Worker } = require('bullmq');
const env = require('../../../config/env');
const logger = require('../../../config/logger');
const Lead = require('../../../models/Lead.model');
const OutreachLog = require('../../../models/OutreachLog.model');

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------
const redisConnection = {
  host: (() => {
    try { const url = new URL(env.REDIS_URL); return url.hostname; } catch (_) { return '127.0.0.1'; }
  })(),
  port: (() => {
    try { const url = new URL(env.REDIS_URL); return Number(url.port) || 6379; } catch (_) { return 6379; }
  })(),
  password: (() => {
    try { const url = new URL(env.REDIS_URL); return url.password || undefined; } catch (_) { return undefined; }
  })(),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ---------------------------------------------------------------------------
// Lazy-load channel services (avoids circular requires at boot time)
// Expected paths (relative to this file):
//   ../../outreach/SMSService
//   ../../outreach/EmailService
//   ../../outreach/WhatsAppService
//   ../../ai/MessageGenerator  (or similar)
// ---------------------------------------------------------------------------
function getSMSService() {
  return require('../../outreach/SMSService');
}
function getEmailService() {
  return require('../../outreach/EmailService');
}
function getWhatsAppService() {
  return require('../../outreach/WhatsAppService');
}
function getMessageGenerator() {
  return require('../../ai/MessageGenerator');
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------
async function processOutreachJob(job) {
  const { leadId, channel, campaignId, message: providedMessage } = job.data;

  logger.info('Outreach job started', { jobId: job.id, leadId, channel, campaignId });

  // 1. Get lead from DB
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new Error('Lead not found: ' + leadId);
  }

  // Create a pending OutreachLog immediately so we can update it on failure
  const outreachLog = await OutreachLog.create({
    lead: lead._id,
    campaign: campaignId || undefined,
    channel,
    message: providedMessage || '',
    status: 'pending',
  });

  let sentResult = null;

  try {
    // 2. Resolve or generate message
    let message = providedMessage;
    let subject = job.data.subject || 'Exciting Opportunity for Your Business';
    if (!message || !message.trim()) {
      const { generateOutreachMessage } = getMessageGenerator();
      const genResult = await generateOutreachMessage(lead, channel);
      message = genResult.message;
      if (genResult.subject) subject = genResult.subject;
    }

    // Persist the final message text
    outreachLog.message = message;
    await outreachLog.save();

    // 3. Send via the appropriate channel service
    if (channel === 'sms') {
      const SMSService = getSMSService();
      const to = lead.whatsapp || lead.phone;
      if (!to) throw new Error('Lead has no phone number for SMS');
      sentResult = await SMSService.send({ to, message, lead });
    } else if (channel === 'email') {
      const EmailService = getEmailService();
      if (!lead.email) throw new Error('Lead has no email address');
      sentResult = await EmailService.send({
        to: lead.email,
        subject,
        message,
        lead,
      });
    } else if (channel === 'whatsapp') {
      const WhatsAppService = getWhatsAppService();
      const to = lead.whatsapp || lead.phone;
      if (!to) throw new Error('Lead has no WhatsApp / phone number');
      sentResult = await WhatsAppService.send({ to, message, lead });
    } else {
      throw new Error('Unknown outreach channel: ' + channel);
    }

    // 4. Update OutreachLog to 'sent'
    outreachLog.status = 'sent';
    outreachLog.sentAt = new Date();
    if (sentResult && sentResult.sid) outreachLog.twilioSid = sentResult.sid;
    if (sentResult && sentResult.messageId) outreachLog.twilioSid = sentResult.messageId;
    await outreachLog.save();

    // 5. Update lead counters
    lead.outreachAttempts = (lead.outreachAttempts || 0) + 1;
    lead.lastOutreachAt = new Date();
    if (lead.status === 'new') lead.status = 'contacted';
    if (!lead.outreachLogs.includes(outreachLog._id)) {
      lead.outreachLogs.push(outreachLog._id);
    }
    await lead.save();

    logger.info('Outreach job completed', {
      jobId: job.id,
      leadId,
      channel,
      outreachLogId: outreachLog._id,
    });

    return {
      leadId,
      channel,
      outreachLogId: outreachLog._id.toString(),
      status: 'sent',
    };
  } catch (err) {
    // 6. Handle failure
    logger.error('Outreach job processor error', {
      jobId: job.id,
      leadId,
      channel,
      error: err.message,
      stack: err.stack,
    });

    // Persist failure to OutreachLog
    try {
      outreachLog.status = 'failed';
      outreachLog.errorMessage = err.message;
      await outreachLog.save();

      // Still push the log reference to the lead so history is preserved
      if (!lead.outreachLogs.includes(outreachLog._id)) {
        lead.outreachLogs.push(outreachLog._id);
        lead.outreachAttempts = (lead.outreachAttempts || 0) + 1;
        lead.lastOutreachAt = new Date();
        await lead.save();
      }
    } catch (dbErr) {
      logger.error('Failed to persist outreach failure to DB', { error: dbErr.message });
    }

    // Re-throw so BullMQ marks job as failed and triggers retries
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Worker instance (concurrency: 5)
// ---------------------------------------------------------------------------
const outreachWorker = new Worker('outreach-jobs', processOutreachJob, {
  connection: redisConnection,
  concurrency: 5,
});

// ---------------------------------------------------------------------------
// Worker event listeners
// ---------------------------------------------------------------------------
outreachWorker.on('active', (job) => {
  logger.info('Outreach worker: job active', {
    jobId: job.id,
    channel: job.data.channel,
    leadId: job.data.leadId,
  });
});

outreachWorker.on('completed', (job, returnValue) => {
  logger.info('Outreach worker: job completed', { jobId: job.id, returnValue });
});

outreachWorker.on('failed', (job, err) => {
  logger.error('Outreach worker: job failed', {
    jobId: job ? job.id : 'unknown',
    leadId: job ? job.data.leadId : null,
    channel: job ? job.data.channel : null,
    error: err.message,
  });
});

outreachWorker.on('error', (err) => {
  logger.error('Outreach worker error', { error: err.message });
});

outreachWorker.on('stalled', (jobId) => {
  logger.warn('Outreach worker: job stalled', { jobId });
});

module.exports = outreachWorker;
