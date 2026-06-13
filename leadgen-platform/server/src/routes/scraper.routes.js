'use strict';

/**
 * scraper.routes.js
 *
 * POST  /start        – enqueue a new scrape job        (auth, scraperLimiter)
 * POST  /stop         – cancel the running job          (auth)
 * GET   /status       – latest ScraperJob status        (auth)
 * GET   /jobs         – paginated job history           (auth)
 * GET   /dedup-stats  – dedup bloom-filter / DB stats   (auth)
 */

const express           = require('express');
const authMiddleware    = require('../middleware/auth.middleware');
const { scraperLimiter } = require('../middleware/rateLimiter.middleware');
const { addScraperJob, scraperQueue } = require('../services/queue/scraperQueue');
const ScraperJob        = require('../models/ScraperJob.model');
const DedupService      = require('../services/dedup/DedupService');
const logger            = require('../config/logger');

const router = express.Router();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /start
 * Enqueues a new daily-scrape job.
 * Body (optional): { targets: string[], cities: string[] }
 */
router.post('/start', authMiddleware, scraperLimiter, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Prevent duplicate running jobs for the same day
    const existingRunning = await ScraperJob.findOne({ jobDate: today, status: 'running' }).lean();
    if (existingRunning) {
      return res.status(409).json({
        success: false,
        message: 'A scrape job is already running for today.',
        data: { jobId: existingRunning._id },
      });
    }

    const jobPayload = {
      triggeredBy:  req.user.id,
      triggeredAt:  new Date().toISOString(),
      targets:      req.body.targets  || [],
      cities:       req.body.cities   || [],
    };

    const job = await addScraperJob(jobPayload);

    logger.info('scraper.routes: job enqueued', { bullJobId: job.id, userId: req.user.id });

    return res.status(202).json({
      success: true,
      message: 'Scrape job enqueued.',
      data: { jobId: job.id },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /stop
 * Attempts to drain / obliterate waiting jobs for the current day.
 * Running workers are not forcibly killed — they finish their current batch
 * and the ScraperJob doc is left as-is until the worker finalises it.
 */
router.post('/stop', authMiddleware, async (req, res, next) => {
  try {
    // Drain the BullMQ queue (removes waiting + delayed jobs)
    await scraperQueue.obliterate({ force: true });

    // Mark any 'running' jobs for today as 'partial' so the dashboard reflects reality
    const today = new Date().toISOString().slice(0, 10);
    const updated = await ScraperJob.updateMany(
      { jobDate: today, status: 'running' },
      { $set: { status: 'partial', completedAt: new Date() }, $push: { logs: 'Stopped by user: ' + req.user.id } }
    );

    logger.info('scraper.routes: stop requested', { userId: req.user.id, modified: updated.modifiedCount });

    return res.status(200).json({
      success: true,
      message: 'Scraper stopped. Any in-flight batch will finish naturally.',
      data: { jobsUpdated: updated.modifiedCount },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /status
 * Returns the most recent ScraperJob document.
 */
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // First try today's job, fall back to most recent overall
    const job = await ScraperJob.findOne({ jobDate: today }).lean()
      || await ScraperJob.findOne().sort({ createdAt: -1 }).lean();

    // Also report queue depth
    const [waiting, active, failed] = await Promise.all([
      scraperQueue.getWaitingCount(),
      scraperQueue.getActiveCount(),
      scraperQueue.getFailedCount(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        job:   job || null,
        queue: { waiting, active, failed },
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /jobs
 * Query params: page (default 1), limit (default 20)
 * Returns paginated ScraperJob history, newest first.
 */
router.get('/jobs', authMiddleware, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ScraperJob.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScraperJob.countDocuments(),
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
    return next(err);
  }
});

/**
 * GET /dedup-stats
 * Returns deduplication statistics from DedupService (SeenLead collection).
 */
router.get('/dedup-stats', authMiddleware, async (req, res, next) => {
  try {
    const stats = await DedupService.getStats();

    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
