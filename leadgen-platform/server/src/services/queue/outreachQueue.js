'use strict';

/**
 * outreachQueue.js
 * BullMQ Queue for outreach jobs.
 *
 * Exports:
 *   outreachQueue   - the BullMQ Queue instance
 *   addOutreachJob  - helper to enqueue an outreach job with per-channel rate limits
 *
 * Rate-limit env vars (jobs per hour):
 *   OUTREACH_SMS_PER_HOUR       (default 50)
 *   OUTREACH_EMAIL_PER_HOUR     (default 100)
 *   OUTREACH_WHATSAPP_PER_HOUR  (default 30)
 */

const { Queue } = require('bullmq');
const env = require('../../config/env');
const logger = require('../../config/logger');

// Redis connection
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

// Per-channel rate-limit config (max jobs per 1 hour window)
const CHANNEL_RATE_LIMITS = {
  sms: { max: env.OUTREACH_SMS_PER_HOUR, duration: 3600000 },
  email: { max: env.OUTREACH_EMAIL_PER_HOUR, duration: 3600000 },
  whatsapp: { max: env.OUTREACH_WHATSAPP_PER_HOUR, duration: 3600000 },
};

// Queue
const outreachQueue = new Queue('outreach-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

outreachQueue.on('error', (err) => {
  logger.error('outreachQueue error', { error: err.message });
});

/**
 * Add an outreach job to the queue.
 *
 * @param {{ leadId: string, channel: 'sms'|'email'|'whatsapp', campaignId?: string, message?: string }} data
 * @param {Object} [opts]  - optional BullMQ job-level overrides
 * @returns {Promise<Job>}
 */
async function addOutreachJob(data, opts) {
  if (!opts) opts = {};
  const { leadId, channel, campaignId } = data;

  if (!leadId) throw new Error('addOutreachJob: leadId is required');
  if (!channel) throw new Error('addOutreachJob: channel is required');

  const validChannels = ['sms', 'email', 'whatsapp'];
  if (!validChannels.includes(channel)) {
    throw new Error('addOutreachJob: invalid channel "' + channel + '". Must be one of: ' + validChannels.join(', '));
  }

  const rateLimit = CHANNEL_RATE_LIMITS[channel];
  const jobOptions = Object.assign({ rateLimiterKey: 'outreach:' + channel }, opts);

  if (!opts.delay) {
    const minSpacing = Math.ceil(rateLimit.duration / rateLimit.max);
    jobOptions.delay = env.OUTREACH_DELAY_BETWEEN_MS || minSpacing;
  }

  const job = await outreachQueue.add(
    'outreach:' + channel,
    Object.assign({ leadId, channel, campaignId }, data),
    jobOptions
  );

  logger.info('Outreach job enqueued', { jobId: job.id, leadId, channel, campaignId });
  return job;
}

module.exports = { outreachQueue, addOutreachJob, CHANNEL_RATE_LIMITS };
