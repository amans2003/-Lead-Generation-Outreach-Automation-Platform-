'use strict';

/**
 * dashboard.routes.js
 *
 * Thin router that maps the frontend's expected dashboard API paths to
 * the underlying AnalyticsService methods.
 *
 *   GET /stats         – top-level KPIs for the stats cards
 *   GET /chart         – daily lead counts for the line chart
 *   GET /funnel        – outreach funnel metrics
 */

const express          = require('express');
const authMiddleware   = require('../middleware/auth.middleware');
const analyticsService = require('../services/AnalyticsService');
const OutreachLog      = require('../models/OutreachLog.model');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /stats
 * Returns KPIs expected by DashboardPage: totalLeads, newToday, goodLeads,
 * outreached, responded, and a trends object.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [base, outreachedCount, respondedCount] = await Promise.all([
      analyticsService.getDashboardStats(),
      OutreachLog.countDocuments({ status: { $in: ['sent', 'delivered', 'responded'] } }),
      OutreachLog.countDocuments({ status: 'responded' }),
    ]);

    return res.status(200).json({
      totalLeads: base.totalLeads,
      newToday:   base.todayNewLeads,
      goodLeads:  base.goodLeads,
      outreached: outreachedCount,
      responded:  respondedCount,
      trends: {},
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /chart?days=30
 * Returns an array of { date, count } objects for the trend line chart.
 */
router.get('/chart', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getLeadsByDay(days);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /funnel
 * Returns the outreach funnel metrics expected by OutreachProgress component.
 */
router.get('/funnel', async (req, res, next) => {
  try {
    const metrics = await analyticsService.getConversionRate();
    return res.status(200).json({
      scraped:    metrics.scraped,
      outreached: metrics.outreachSent,
      responded:  metrics.responded,
      goodLeads:  metrics.goodLead,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
