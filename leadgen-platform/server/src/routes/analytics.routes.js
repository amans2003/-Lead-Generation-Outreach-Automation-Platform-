'use strict';

/**
 * analytics.routes.js
 *
 * All routes require authentication.
 *
 * GET  /dashboard            – top-level dashboard KPIs
 * GET  /leads-by-day         – daily lead count for last N days
 * GET  /conversion-rate      – funnel conversion rates
 * GET  /source-performance   – per-source lead & conversion stats
 * GET  /category-performance – per-category lead & conversion stats
 * GET  /dedup-history        – daily duplicate-rate trend
 */

const express           = require('express');
const authMiddleware    = require('../middleware/auth.middleware');
const analyticsService  = require('../services/AnalyticsService');

const router = express.Router();

// All analytics routes require authentication — apply once at the router level
router.use(authMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /dashboard
 * Returns top-level KPIs: totalLeads, goodLeads, notInterested,
 * processing, duplicatesSkippedToday, todayNewLeads.
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await analyticsService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /leads-by-day
 * Query params: days (default 30)
 * Returns array of { date: 'YYYY-MM-DD', count: number }.
 */
router.get('/leads-by-day', async (req, res, next) => {
  try {
    const days = req.query.days || 30;
    const data = await analyticsService.getLeadsByDay(days);

    return res.status(200).json({
      success: true,
      data: { series: data },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /conversion-rate
 * Returns funnel conversion metrics: scraped → outreach → responded → good_lead.
 */
router.get('/conversion-rate', async (req, res, next) => {
  try {
    const metrics = await analyticsService.getConversionRate();

    return res.status(200).json({
      success: true,
      data: { metrics },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /source-performance
 * Returns array of { source, totalLeads, goodLeads, conversionRate }.
 */
router.get('/source-performance', async (req, res, next) => {
  try {
    const performance = await analyticsService.getSourcePerformance();

    return res.status(200).json({
      success: true,
      data: { performance },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /category-performance
 * Returns array of { category, totalLeads, goodLeads, conversionRate }.
 */
router.get('/category-performance', async (req, res, next) => {
  try {
    const performance = await analyticsService.getCategoryPerformance();

    return res.status(200).json({
      success: true,
      data: { performance },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /dedup-history
 * Query params: days (default 30)
 * Returns array of { date, scraped, duplicates, duplicateRate }.
 */
router.get('/dedup-history', async (req, res, next) => {
  try {
    const days = req.query.days || 30;
    const history = await analyticsService.getDedupHistory(days);

    return res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
