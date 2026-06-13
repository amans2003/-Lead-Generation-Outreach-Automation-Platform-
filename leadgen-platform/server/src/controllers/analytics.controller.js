'use strict';

/**
 * analytics.controller.js
 * HTTP handlers for the analytics dashboard and reporting endpoints.
 * Delegates all aggregation logic to AnalyticsService.
 */

const analyticsService = require('../services/AnalyticsService');
const logger = require('../config/logger');

/**
 * GET /api/analytics/dashboard
 * Returns top-level KPIs: total leads, good leads, processing, duplicates today, etc.
 */
async function getDashboard(req, res, next) {
  try {
    const stats = await analyticsService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    logger.error('analytics.controller.getDashboard error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/analytics/leads-by-day
 * Daily lead creation counts for the last N days.
 * Query params: days (default 30)
 */
async function getLeadsByDay(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getLeadsByDay(days);

    return res.status(200).json({
      success: true,
      data: { days, series: data },
    });
  } catch (err) {
    logger.error('analytics.controller.getLeadsByDay error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/analytics/conversion-rate
 * Conversion funnel: scraped -> outreach sent -> responded -> good_lead.
 */
async function getConversionRate(req, res, next) {
  try {
    const data = await analyticsService.getConversionRate();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    logger.error('analytics.controller.getConversionRate error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/analytics/source-performance
 * Per-scraping-source lead count and good_lead conversion rate.
 */
async function getSourcePerformance(req, res, next) {
  try {
    const data = await analyticsService.getSourcePerformance();

    return res.status(200).json({
      success: true,
      data: { sources: data },
    });
  } catch (err) {
    logger.error('analytics.controller.getSourcePerformance error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/analytics/category-performance
 * Per-category lead count and good_lead conversion rate.
 */
async function getCategoryPerformance(req, res, next) {
  try {
    const data = await analyticsService.getCategoryPerformance();

    return res.status(200).json({
      success: true,
      data: { categories: data },
    });
  } catch (err) {
    logger.error('analytics.controller.getCategoryPerformance error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/analytics/dedup-history
 * Daily deduplication stats (scraped vs duplicate) for the last N days.
 * Query params: days (default 30)
 */
async function getDedupHistory(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await analyticsService.getDedupHistory(days);

    return res.status(200).json({
      success: true,
      data: { days, history: data },
    });
  } catch (err) {
    logger.error('analytics.controller.getDedupHistory error', { message: err.message });
    next(err);
  }
}

module.exports = {
  getDashboard,
  getLeadsByDay,
  getConversionRate,
  getSourcePerformance,
  getCategoryPerformance,
  getDedupHistory,
};
