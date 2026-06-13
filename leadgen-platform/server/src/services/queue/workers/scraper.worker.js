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

  // Determine or create the ScraperJob document for today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let scraperJobDoc = await ScraperJob.findOne({ jobDate: today });

  if (!scraperJobDoc) {
    scraperJobDoc = await ScraperJob.create({
      jobDate: today,
      status: 'running',
      targetCount: env.SCRAPER_DAILY_TARGET,
      startedAt: new Date(),
    });
  } else {
    scraperJobDoc.status = 'running';
    scraperJobDoc.startedAt = scraperJobDoc.startedAt || new Date();
    await scraperJobDoc.save();
  }

  // Emit start event to connected clients
  emitProgress('scraper:started', {
    jobId: job.id,
    scraperJobId: scraperJobDoc._id,
    jobDate: today,
  });

  await job.updateProgress(5);

  // Lazy-load ScraperOrchestrator to avoid circular deps at module load time
  // It is expected to live at: src/services/scraper/ScraperOrchestrator.js
  let ScraperOrchestrator;
  try {
    ScraperOrchestrator = require('../../scraper/ScraperOrchestrator');
  } catch (err) {
    throw new Error('ScraperOrchestrator not found: ' + err.message);
  }

  // Progress callback forwarded by the orchestrator (optional contract)
  const onProgress = async (progressData) => {
    const pct = progressData.percent || 0;
    await job.updateProgress(pct);

    // Persist incremental stats
    if (progressData.scrapedCount !== undefined) {
      scraperJobDoc.scrapedCount = progressData.scrapedCount;
    }
    if (progressData.newCount !== undefined) {
      scraperJobDoc.newCount = progressData.newCount;
    }
    if (progressData.duplicateCount !== undefined) {
      scraperJobDoc.duplicateCount = progressData.duplicateCount;
    }
    if (progressData.errorCount !== undefined) {
      scraperJobDoc.errorCount = progressData.errorCount;
    }
    if (progressData.log) {
      scraperJobDoc.logs.push(progressData.log);
    }
    await scraperJobDoc.save();

    emitProgress('scraper:progress', {
      jobId: job.id,
      scraperJobId: scraperJobDoc._id,
      ...progressData,
    });
  };

  const result = await ScraperOrchestrator.runDailyScrape({ onProgress, jobData: job.data });

  // Persist final stats
  scraperJobDoc.status = 'completed';
  scraperJobDoc.completedAt = new Date();
  if (result) {
    if (result.scrapedCount !== undefined) scraperJobDoc.scrapedCount = result.scrapedCount;
    if (result.newCount !== undefined) scraperJobDoc.newCount = result.newCount;
    if (result.duplicateCount !== undefined) scraperJobDoc.duplicateCount = result.duplicateCount;
    if (result.errorCount !== undefined) scraperJobDoc.errorCount = result.errorCount;
    if (result.sourceStats) scraperJobDoc.sourceStats = result.sourceStats;
    if (result.log) scraperJobDoc.logs.push(result.log);
  }
  await scraperJobDoc.save();

  await job.updateProgress(100);

  emitProgress('scraper:completed', {
    jobId: job.id,
    scraperJobId: scraperJobDoc._id,
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
  concurrency: 1, // Only one scrape job at a time to avoid overloading sources
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
