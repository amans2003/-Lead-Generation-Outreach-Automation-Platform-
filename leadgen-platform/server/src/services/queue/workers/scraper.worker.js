'use strict';

/**
 * scraper.worker.js
 * BullMQ Worker for the 'scraper-jobs' queue.
 *
 * Responsibilities:
 *  - Process each scraper job by calling ScraperOrchestrator.runDailyScrape()
 *  - Update the ScraperJob MongoDB document on start / complete / failed
 *  - Emit Socket.io progress events so the dashboard can track live progress
 */

const { Worker } = require('bullmq');
const env = require('../../../config/env');
const logger = require('../../../config/logger');
const ScraperJob = require('../../../models/ScraperJob.model');

// ---------------------------------------------------------------------------
// Redis connection (same pattern as queues)
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
// Socket.io accessor
// The Socket.io server instance is attached to global.io by the main app file.
// Using a lazy accessor avoids circular-require issues at boot time.
// ---------------------------------------------------------------------------
function getIO() {
  return global.io || null;
}

function emitProgress(event, payload) {
  const io = getIO();
  if (io) {
    io.emit(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------
async function processScraperJob(job) {
  logger.info('Scraper job started', { jobId: job.id, data: job.data });

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // The controller already created the ScraperJob doc and passed its ID in job.data.
  // For cron-triggered runs that bypass the controller, create one if missing.
  const existingId = job.data && job.data.scraperJobId;
  let scraperJobId;

  if (existingId) {
    scraperJobId = existingId;
  } else {
    const newDoc = await ScraperJob.create({
      jobDate: today,
      status: 'running',
      targetCount: env.SCRAPER_DAILY_TARGET,
      startedAt: new Date(),
    });
    scraperJobId = newDoc._id.toString();
  }

  emitProgress('scraper:started', {
    jobId: job.id,
    scraperJobId,
    jobDate: today,
  });

  await job.updateProgress(5);

  // Lazy-load to avoid circular deps at boot time
  let ScraperOrchestrator;
  try {
    ScraperOrchestrator = require('../../scraper/ScraperOrchestrator');
  } catch (err) {
    throw new Error('ScraperOrchestrator not found: ' + err.message);
  }

  // runDailyScrape expects the ScraperJob MongoDB ObjectId string.
  // ScraperOrchestrator reads global.io for Socket.io — no injection needed here.
  const result = await ScraperOrchestrator.runDailyScrape(scraperJobId);

  await job.updateProgress(100);

  emitProgress('scraper:completed', {
    jobId: job.id,
    scraperJobId,
    result,
  });

  logger.info('Scraper job completed', { jobId: job.id, result });
  return result;
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------
const scraperWorker = new Worker('scraper-jobs', processScraperJob, {
  connection: redisConnection,
  concurrency: 1,
  // Puppeteer scraping can take several minutes per site — default 30s lock is too short.
  // 5-minute lock + renew halfway through prevents "could not renew lock" errors.
  lockDuration:    300_000,   // 5 minutes
  lockRenewTime:   150_000,   // renew every 2.5 minutes
  stalledInterval:  60_000,   // check for stalled jobs every 60 seconds
  maxStalledCount:  1,        // allow one stall before marking failed
});

// ---------------------------------------------------------------------------
// Worker event listeners
// ---------------------------------------------------------------------------
scraperWorker.on('active', (job) => {
  logger.info('Scraper worker: job active', { jobId: job.id });
});

scraperWorker.on('completed', (job, returnValue) => {
  logger.info('Scraper worker: job completed', { jobId: job.id, returnValue });
});

scraperWorker.on('failed', async (job, err) => {
  logger.error('Scraper worker: job failed', {
    jobId: job ? job.id : 'unknown',
    error: err.message,
    stack: err.stack,
  });

  // Update the ScraperJob document to 'failed' or 'partial'
  try {
    const today = new Date().toISOString().slice(0, 10);
    const scraperJobDoc = await ScraperJob.findOne({ jobDate: today });
    if (scraperJobDoc && scraperJobDoc.status === 'running') {
      // Mark as 'partial' if some leads were scraped, 'failed' otherwise
      scraperJobDoc.status = scraperJobDoc.scrapedCount > 0 ? 'partial' : 'failed';
      scraperJobDoc.completedAt = new Date();
      scraperJobDoc.logs.push('JOB FAILED: ' + err.message);
      await scraperJobDoc.save();
    }
  } catch (dbErr) {
    logger.error('Failed to update ScraperJob on worker failure', { error: dbErr.message });
  }

  emitProgress('scraper:failed', {
    jobId: job ? job.id : null,
    error: err.message,
  });
});

scraperWorker.on('error', (err) => {
  logger.error('Scraper worker error', { error: err.message });
});

scraperWorker.on('stalled', (jobId) => {
  logger.warn('Scraper worker: job stalled', { jobId });
});

module.exports = scraperWorker;
