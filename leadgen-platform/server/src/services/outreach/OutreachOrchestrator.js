'use strict';

/**
 * OutreachOrchestrator
 *
 * Orchestrates multi-channel outreach for individual leads.
 *
 * processLead(lead, campaignId):
 *  1. Scores the lead via LeadScorer - skips if score < LEAD_SCORE_SKIP_THRESHOLD
 *  2. Generates per-channel messages via MessageGenerator
 *  3. Queues a send job in the outreach BullMQ queue for each channel
 *  4. Updates the lead document status to 'processing'
 */

const { Queue } = require('bullmq');
const logger    = require('../../config/logger');
const env       = require('../../config/env');
const redisClient = require('../../config/redis');
const Lead      = require('../../models/Lead.model');
const Campaign  = require('../../models/Campaign.model');

// ---------------------------------------------------------------------------
// Lazy-require AI services to avoid circular-require issues
// ---------------------------------------------------------------------------
function getLeadScorer() {
  return require('../ai/LeadScorer');   // eslint-disable-line global-require
}

function getMessageGenerator() {
  return require('../ai/MessageGenerator');  // eslint-disable-line global-require
}

// ---------------------------------------------------------------------------
// BullMQ outreach queue
// ---------------------------------------------------------------------------
const OUTREACH_QUEUE_NAME = 'outreach';

let _outreachQueue = null;

function getOutreachQueue() {
  if (!_outreachQueue) {
    _outreachQueue = new Queue(OUTREACH_QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts:  3,
        backoff: {
          type:  'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail:     { count: 200 },
      },
    });
    logger.info('[OutreachOrchestrator] BullMQ outreach queue initialised');
  }
  return _outreachQueue;
}

// ---------------------------------------------------------------------------
// OutreachOrchestrator
// ---------------------------------------------------------------------------
class OutreachOrchestrator {
  /**
   * Full outreach pipeline for a single lead.
   *
   * @param {object} lead        - Lead document (plain object or Mongoose doc)
   * @param {string} campaignId  - Campaign MongoDB ObjectId string
   * @returns {Promise<{queued: string[], skipped: boolean, score: number}>}
   */
  async processLead(lead, campaignId) {
    if (!lead || !campaignId) {
      throw new Error('[OutreachOrchestrator] processLead requires lead and campaignId');
    }

    const leadId   = String(lead._id);
    const skipThreshold = env.LEAD_SCORE_SKIP_THRESHOLD;

    // ------------------------------------------------------------------
    // 1. Score the lead
    // ------------------------------------------------------------------
    let score = 0;
    try {
      const { scoreLead } = getLeadScorer();
      score = await scoreLead(lead);
    } catch (scorerErr) {
      logger.warn('[OutreachOrchestrator] LeadScorer failed - using score 0', {
        leadId,
        error: scorerErr.message,
      });
      score = 0;
    }

    if (score < skipThreshold) {
      logger.info('[OutreachOrchestrator] Lead score below threshold - skipping', {
        leadId,
        score,
        threshold: skipThreshold,
      });
      return { queued: [], skipped: true, score };
    }

    // ------------------------------------------------------------------
    // 2. Fetch campaign to determine channels
    // ------------------------------------------------------------------
    let campaign;
    try {
      campaign = await Campaign.findById(campaignId).lean();
    } catch (dbErr) {
      throw new Error(
        '[OutreachOrchestrator] Could not load campaign ' + campaignId + ': ' + dbErr.message
      );
    }

    if (!campaign) {
      throw new Error('[OutreachOrchestrator] Campaign not found: ' + campaignId);
    }

    const channels = campaign.channels && campaign.channels.length > 0
      ? campaign.channels
      : ['sms'];   // sensible default

    // ------------------------------------------------------------------
    // 3. Generate per-channel messages
    // ------------------------------------------------------------------
    const messages = {};
    const { generateOutreachMessage } = getMessageGenerator();

    for (const channel of channels) {
      try {
        messages[channel] = await generateOutreachMessage(lead, channel);
      } catch (genErr) {
        logger.warn('[OutreachOrchestrator] MessageGenerator failed for channel', {
          leadId,
          channel,
          error: genErr.message,
        });
        // Fall back to campaign template if AI generation fails
        messages[channel] = { message: campaign.messageTemplate || this._defaultMessage(lead, channel) };
      }
    }

    // ------------------------------------------------------------------
    // 4. Queue send jobs in the outreach BullMQ queue
    // ------------------------------------------------------------------
    const queue = getOutreachQueue();
    const queuedChannels = [];

    for (const channel of channels) {
      const message = messages[channel];
      if (!message) continue;

      // Determine the destination address for this channel
      const destination = this._getDestination(lead, channel);
      if (!destination) {
        logger.warn('[OutreachOrchestrator] No destination for channel - skipping', {
          leadId,
          channel,
        });
        continue;
      }

      const jobName = channel + ':' + leadId;
      // message is { message, subject? } from MessageGenerator
      const msgText    = (message && message.message) ? message.message : String(message || '');
      const msgSubject = (message && message.subject) ? message.subject : undefined;
      const jobData = {
        leadId,
        campaignId,
        channel,
        to:        destination,
        message:   msgText,
        subject:   msgSubject,
        score,
        attempt:   1,
      };

      // Use a deterministic job ID to prevent double-queuing
      const jobId = 'outreach:' + channel + ':' + leadId;

      await queue.add(jobName, jobData, { jobId });
      queuedChannels.push(channel);

      logger.debug('[OutreachOrchestrator] Queued outreach job', {
        jobId,
        channel,
        to: destination,
      });
    }

    // ------------------------------------------------------------------
    // 5. Update lead status to 'processing'
    // ------------------------------------------------------------------
    try {
      await Lead.findByIdAndUpdate(leadId, {
        $set:  { status: 'processing' },
        $inc:  { outreachAttempts: 1 },
      });
    } catch (updateErr) {
      logger.warn('[OutreachOrchestrator] Failed to update lead status', {
        leadId,
        error: updateErr.message,
      });
    }

    logger.info('[OutreachOrchestrator] Lead queued for outreach', {
      leadId,
      campaignId,
      score,
      channels: queuedChannels,
    });

    return { queued: queuedChannels, skipped: false, score };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the contact address for a given channel.
   * @private
   */
  _getDestination(lead, channel) {
    switch (channel) {
      case 'sms':
        return lead.phone || lead.altPhone || null;
      case 'email':
        return lead.email || null;
      case 'whatsapp':
        return lead.whatsapp || lead.phone || null;
      default:
        return null;
    }
  }

  /**
   * Fallback message when AI generation is unavailable.
   * @private
   */
  _defaultMessage(lead, channel) {
    const name = lead.businessName || lead.ownerName || 'there';
    if (channel === 'email') {
      return (
        '<p>Hi ' + name + ',</p>' +
        '<p>We help businesses like yours grow with smart automation. ' +
        'Would you be open to a quick chat?</p>' +
        '<p>Best regards,<br/>The LeadGen Team</p>'
      );
    }
    return (
      'Hi ' + name + '! We help local businesses grow with automation. ' +
      'Interested in a free demo? Reply YES to learn more.'
    );
  }
}

module.exports = new OutreachOrchestrator();
