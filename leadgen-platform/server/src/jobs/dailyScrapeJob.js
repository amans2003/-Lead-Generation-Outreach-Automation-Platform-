'use strict';

/**
 * dailyScrapeJob.js
 *
 * Schedules the daily scrape using node-cron.
 * The cron expression is read from env.SCRAPER_SCHEDULE_CRON (default: "0 2 * * *" = 2 AM daily).
 *
 * Usage:
 *   const { startDailyScrapeJob, stopDailyScrapeJob } = require('./jobs/dailyScrapeJob');
 *   startDailyScrapeJob();
 */

const cron   = require('node-cron');
const env    = require('../config/env');
const logger = require('../config/logger');
const { addScraperJob } = require('../services/queue/scraperQueue');

let _task = null;

/**
 * Starts the node-cron scheduler that enqueues a scraper job on the configured schedule.
 * Safe to call multiple times — subsequent calls are no-ops if already running.
 */
function startDailyScrapeJob() {
  if (_task) {
    logger.info('[dailyScrapeJob] Cron task already running');
    return;
  }

  const cronExpression = env.SCRAPER_SCHEDULE_CRON || '0 2 * * *';

  if (!cron.validate(cronExpression)) {
    logger.error('[dailyScrapeJob] Invalid cron expression: ' + cronExpression);
    return;
  }

  _task = cron.schedule(
    cronExpression,
    async () => {
      const now = new Date().toISOString();
      logger.info('[dailyScrapeJob] Scheduled trigger fired', { time: now });

      try {
        const job = await addScraperJob({
          source:       'cron',
          triggeredAt:  now,
        });
        logger.info('[dailyScrapeJob] Scraper job enqueued by cron', { bullJobId: job.id });
      } catch (err) {
        logger.error('[dailyScrapeJob] Failed to enqueue scraper job', { error: err.message });
      }
    },
    {
      scheduled:  true,
      timezone:   'Asia/Kolkata', // adjust to your server timezone
    }
  );

  logger.info('[dailyScrapeJob] Cron task started', { schedule: cronExpression });
}

/**
 * Stops the node-cron task gracefully.
 */
function stopDailyScrapeJob() {
  if (_task) {
    _task.stop();
    _task = null;
    logger.info('[dailyScrapeJob] Cron task stopped');
  }
}

module.exports = { startDailyScrapeJob, stopDailyScrapeJob };
