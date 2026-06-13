'use strict';

/**
 * AnalyticsService.js
 * Aggregation queries for the analytics dashboard.
 */

const Lead = require('../models/Lead.model');
const OutreachLog = require('../models/OutreachLog.model');
const ScraperJob = require('../models/ScraperJob.model');
const logger = require('../config/logger');

class AnalyticsService {
  /**
   * Return top-level dashboard statistics.
   *
   * @returns {Promise<{
   *   totalLeads: number,
   *   goodLeads: number,
   *   notInterested: number,
   *   processing: number,
   *   duplicatesSkippedToday: number,
   *   todayNewLeads: number
   * }>}
   */
  async getDashboardStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [statusCounts, todayJobStats] = await Promise.all([
      // Aggregate all leads by status
      Lead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Today's scraper job for duplicate count
      ScraperJob.findOne({
        jobDate: new Date().toISOString().slice(0, 10),
      }).lean(),
    ]);

    const counts = {};
    let totalLeads = 0;
    statusCounts.forEach(({ _id, count }) => {
      if (_id) counts[_id] = count;
      totalLeads += count;
    });

    // Count leads created today
    const todayNewLeads = await Lead.countDocuments({ createdAt: { $gte: startOfDay } });

    return {
      totalLeads,
      goodLeads: counts.good_lead || 0,
      notInterested: counts.not_interested || 0,
      processing: counts.processing || 0,
      duplicatesSkippedToday: todayJobStats ? (todayJobStats.duplicateCount || 0) : 0,
      todayNewLeads,
    };
  }

  /**
   * Daily lead counts for the last N days.
   *
   * @param {number} days  defaults to 30
   * @returns {Promise<Array<{ date: string, count: number }>>}
   */
  async getLeadsByDay(days) {
    const n = Math.max(1, parseInt(days, 10) || 30);
    const since = new Date();
    since.setDate(since.getDate() - n);
    since.setHours(0, 0, 0, 0);

    const result = await Lead.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map(({ _id, count }) => ({ date: _id, count }));
  }

  /**
   * Conversion-funnel rates: scraped -> outreach sent -> responded -> good_lead.
   *
   * @returns {Promise<{
   *   scraped: number,
   *   outreachSent: number,
   *   responded: number,
   *   goodLead: number,
   *   scrapeToOutreachRate: string,
   *   outreachToResponseRate: string,
   *   responseToGoodRate: string,
   *   overallRate: string
   * }>}
   */
  async getConversionRate() {
    const [
      scraped,
      outreachSent,
      responded,
      goodLead,
    ] = await Promise.all([
      Lead.countDocuments({}),
      OutreachLog.countDocuments({ status: { $in: ['sent', 'delivered', 'responded'] } }),
      OutreachLog.countDocuments({ status: 'responded' }),
      Lead.countDocuments({ status: 'good_lead' }),
    ]);

    const pct = (num, den) => (den > 0 ? ((num / den) * 100).toFixed(2) + '%' : '0.00%');

    return {
      scraped,
      outreachSent,
      responded,
      goodLead,
      scrapeToOutreachRate: pct(outreachSent, scraped),
      outreachToResponseRate: pct(responded, outreachSent),
      responseToGoodRate: pct(goodLead, responded),
      overallRate: pct(goodLead, scraped),
    };
  }

  /**
   * Per-source lead count and conversion to good_lead.
   *
   * @returns {Promise<Array<{ source: string, totalLeads: number, goodLeads: number, conversionRate: string }>>}
   */
  async getSourcePerformance() {
    const result = await Lead.aggregate([
      {
        $group: {
          _id: '$source',
          totalLeads: { $sum: 1 },
          goodLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'good_lead'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    return result.map(({ _id, totalLeads, goodLeads }) => ({
      source: _id || 'unknown',
      totalLeads,
      goodLeads,
      conversionRate: totalLeads > 0
        ? ((goodLeads / totalLeads) * 100).toFixed(2) + '%'
        : '0.00%',
    }));
  }

  /**
   * Per-category lead count and conversion to good_lead.
   *
   * @returns {Promise<Array<{ category: string, totalLeads: number, goodLeads: number, conversionRate: string }>>}
   */
  async getCategoryPerformance() {
    const result = await Lead.aggregate([
      {
        $group: {
          _id: '$category',
          totalLeads: { $sum: 1 },
          goodLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'good_lead'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    return result.map(({ _id, totalLeads, goodLeads }) => ({
      category: _id || 'unknown',
      totalLeads,
      goodLeads,
      conversionRate: totalLeads > 0
        ? ((goodLeads / totalLeads) * 100).toFixed(2) + '%'
        : '0.00%',
    }));
  }

  /**
   * Duplicate-rate trend: for each day in the last N days, return how many
   * leads were scraped vs. how many were duplicates, and the duplicate rate.
   *
   * @param {number} days  defaults to 30
   * @returns {Promise<Array<{ date: string, scraped: number, duplicates: number, duplicateRate: string }>>}
   */
  async getDedupHistory(days) {
    const n = Math.max(1, parseInt(days, 10) || 30);
    const since = new Date();
    since.setDate(since.getDate() - n);
    since.setHours(0, 0, 0, 0);
    const sinceDate = since.toISOString().slice(0, 10);

    // ScraperJob documents store daily aggregates
    const jobs = await ScraperJob.find({
      jobDate: { $gte: sinceDate },
    })
      .sort({ jobDate: 1 })
      .lean();

    return jobs.map((job) => {
      const scraped = job.scrapedCount || 0;
      const duplicates = job.duplicateCount || 0;
      return {
        date: job.jobDate,
        scraped,
        duplicates,
        duplicateRate: scraped > 0
          ? ((duplicates / scraped) * 100).toFixed(2) + '%'
          : '0.00%',
      };
    });
  }
}

module.exports = new AnalyticsService();
