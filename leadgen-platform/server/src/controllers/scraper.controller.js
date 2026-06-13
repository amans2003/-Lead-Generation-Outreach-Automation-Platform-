'use strict';

/**
 * scraper.controller.js
 * HTTP handlers for scraper management.
 * Uses scraperQueue (BullMQ) to enqueue jobs and ScraperJob model for history.
 */

const ScraperJob = require('../models/ScraperJob.model');
const { scraperQueue, addScraperJob } = require('../services/queue/scraperQueue');
const logger = require('../config/logger');

/**
 * POST /api/scraper/start
 * Enqueue a new scraper job.
 * Body: { categories, cities, maxResults, sources }
 */
async function startScrape(req, res, next) {
  try {
    const {
      categories = [],
      cities = [],
      maxResults = 100,
      sources = [],
    } = req.body;

    if (categories.length === 0 && cities.length === 0) {
      const err = new Error('At least one category or city is required to start scraping');
      err.statusCode = 400;
      return next(err);
    }

    const today = new Date().toISOString().slice(0, 10);

    // Create a ScraperJob record to track this run
    const scraperJobDoc = await ScraperJob.create({
      jobDate: today,
      status: 'running',
      targetCount: maxResults,
      startedAt: new Date(),
    });

    const jobData = {
      scraperJobId: scraperJobDoc._id.toString(),
      categories,
      cities,
      maxResults,
      sources,
      jobDate: today,
    };

    const bullJob = await addScraperJob(jobData);

    logger.info('scraper.controller.startScrape: job enqueued', {
      bullJobId: bullJob.id,
      scraperJobId: scraperJobDoc._id,
    });

    return res.status(202).json({
      success: true,
      message: 'Scraper job enqueued',
      data: {
        jobId: bullJob.id,
        scraperJobId: scraperJobDoc._id,
        status: 'running',
        jobDate: today,
      },
    });
  } catch (err) {
    logger.error('scraper.controller.startScrape error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/scraper/stop
 * Attempt to drain / pause the scraper queue.
 * BullMQ does not support killing a running worker from outside; we pause the queue
 * so no new jobs are picked up, and update any running ScraperJob records.
 */
async function stopScrape(req, res, next) {
  try {
    await scraperQueue.pause();

    // Mark all currently-running jobs as failed/stopped
    await ScraperJob.updateMany(
      { status: 'running' },
      { $set: { status: 'failed', completedAt: new Date() } }
    );

    logger.info('scraper.controller.stopScrape: queue paused');

    return res.status(200).json({
      success: true,
      message: 'Scraper queue paused. Active worker jobs will finish their current task.',
    });
  } catch (err) {
    logger.error('scraper.controller.stopScrape error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/scraper/status
 * Return the current state of the BullMQ scraper queue plus today's job summary.
 */
async function getStatus(req, res, next) {
  try {
    const [waiting, active, failed, completed, isPaused] = await Promise.all([
      scraperQueue.getWaitingCount(),
      scraperQueue.getActiveCount(),
      scraperQueue.getFailedCount(),
      scraperQueue.getCompletedCount(),
      scraperQueue.isPaused(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const todayJob = await ScraperJob.findOne({ jobDate: today })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        queue: {
          isPaused,
          waiting,
          active,
          failed,
          completed,
        },
        todayJob: todayJob || null,
      },
    });
  } catch (err) {
    logger.error('scraper.controller.getStatus error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/scraper/history
 * Return paginated scraper job history.
 * Query params: page (default 1), limit (default 20)
 */
async function getJobHistory(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ScraperJob.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScraperJob.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('scraper.controller.getJobHistory error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/scraper/dedup-stats
 * Return aggregate deduplication statistics across all scraper jobs.
 */
async function getDedupStats(req, res, next) {
  try {
    const stats = await ScraperJob.aggregate([
      {
        $group: {
          _id: null,
          totalScraped: { $sum: '$scrapedCount' },
          totalNew: { $sum: '$newCount' },
          totalDuplicates: { $sum: '$duplicateCount' },
          totalErrors: { $sum: '$errorCount' },
          jobCount: { $sum: 1 },
        },
      },
    ]);

    const data = stats[0] || {
      totalScraped: 0,
      totalNew: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      jobCount: 0,
    };

    // Remove the _id from the aggregation result
    delete data._id;

    data.duplicateRate =
      data.totalScraped > 0
        ? ((data.totalDuplicates / data.totalScraped) * 100).toFixed(2) + '%'
        : '0.00%';

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    logger.error('scraper.controller.getDedupStats error', { message: err.message });
    next(err);
  }
}

module.exports = {
  startScrape,
  stopScrape,
  getStatus,
  getJobHistory,
  getDedupStats,
};
