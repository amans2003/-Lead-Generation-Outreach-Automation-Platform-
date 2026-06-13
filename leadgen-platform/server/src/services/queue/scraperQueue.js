'use strict';

/**
 * scraperQueue.js
 * BullMQ Queue for scraper jobs.
 *
 * Exports:
 *   scraperQueue   – the BullMQ Queue instance
 *   addScraperJob  – helper to enqueue a scraper job with standard options
 */

const { Queue } = require('bullmq');
const env = require('../../config/env');
const logger = require('../../config/logger');

// ---------------------------------------------------------------------------
// Redis connection options for BullMQ
// BullMQ requires its own ioredis connection (separate from the shared client)
// because BullMQ sets maxRetriesPerRequest: null which the shared client may
// also already set, but we create a fresh connection to avoid conflicts.
// ---------------------------------------------------------------------------
const redisConnection = {
  host: (() => {
    try {
      const url = new URL(env.REDIS_URL);
      return url.hostname;
    } catch (_) {
      return '127.0.0.1';
    }
  })(),
  port: (() => {
    try {
      const url = new URL(env.REDIS_URL);
      return Number(url.port) || 6379;
    } catch (_) {
      return 6379;
    }
  })(),
  password: (() => {
    try {
      const url = new URL(env.REDIS_URL);
      return url.password || undefined;
    } catch (_) {
      return undefined;
    }
  })(),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------
const scraperQueue = new Queue('scraper-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

scraperQueue.on('error', (err) => {
  logger.error('scraperQueue error', { error: err.message });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
/**
 * Add a scraper job to the queue.
 *
 * @param {Object} data  – arbitrary payload forwarded to the worker
 * @param {Object} [opts] – optional BullMQ job-level overrides
 * @returns {Promise<Job>}
 */
async function addScraperJob(data, opts = {}) {
  const jobOptions = {
    delay: 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...opts,
  };

  const job = await scraperQueue.add('scrape', data, jobOptions);
  logger.info('Scraper job enqueued', { jobId: job.id, data });
  return job;
}

module.exports = { scraperQueue, addScraperJob };
