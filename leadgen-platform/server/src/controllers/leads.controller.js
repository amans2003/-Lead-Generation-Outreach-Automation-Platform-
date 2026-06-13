'use strict';

/**
 * leads.controller.js
 * HTTP handlers for lead management.
 * Delegates to LeadService.
 */

const leadService = require('../services/LeadService');
const logger = require('../config/logger');

/**
 * GET /api/leads
 * Query leads with optional filters and pagination.
 * Query params: status, category, source, city, dateFrom, dateTo,
 *               page, limit, sortBy, sortOrder
 */
async function getLeads(req, res, next) {
  try {
    const { status, category, source, city, dateFrom, dateTo } = req.query;
    const { page, limit, sortBy, sortOrder } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (source) filters.source = source;
    if (city) filters.city = city;
    if (dateFrom || dateTo) {
      filters.dateRange = {};
      if (dateFrom) filters.dateRange.from = dateFrom;
      if (dateTo) filters.dateRange.to = dateTo;
    }

    const pagination = { page, limit, sortBy, sortOrder };

    const result = await leadService.getLeads(filters, pagination);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('leads.controller.getLeads error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/leads/:id
 * Get a single lead by MongoDB ObjectId with populated outreach logs.
 */
async function getLeadById(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);

    return res.status(200).json({
      success: true,
      data: { lead },
    });
  } catch (err) {
    logger.error('leads.controller.getLeadById error', { message: err.message, id: req.params.id });
    next(err);
  }
}

/**
 * PATCH /api/leads/:id/status
 * Update a lead's lifecycle status.
 * Body: { status }
 */
async function updateLeadStatus(req, res, next) {
  try {
    const { status } = req.body;
    const lead = await leadService.updateLeadStatus(req.params.id, status);

    return res.status(200).json({
      success: true,
      message: 'Lead status updated',
      data: { lead },
    });
  } catch (err) {
    logger.error('leads.controller.updateLeadStatus error', { message: err.message });
    next(err);
  }
}

/**
 * DELETE /api/leads/:id
 * Hard-delete a lead and its associated outreach logs.
 */
async function deleteLead(req, res, next) {
  try {
    const result = await leadService.deleteLead(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Lead deleted',
      data: result,
    });
  } catch (err) {
    logger.error('leads.controller.deleteLead error', { message: err.message });
    next(err);
  }
}

/**
 * DELETE /api/leads/bulk
 * Bulk-delete leads.
 * Body: { ids: string[] }
 */
async function bulkDelete(req, res, next) {
  try {
    const { ids } = req.body;
    const result = await leadService.bulkDelete(ids);

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} lead(s) deleted`,
      data: result,
    });
  } catch (err) {
    logger.error('leads.controller.bulkDelete error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/leads/export
 * Export filtered leads as a CSV file download.
 * Query params: same filter fields as getLeads
 */
async function exportCSV(req, res, next) {
  try {
    const { status, category, source, city, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (source) filters.source = source;
    if (city) filters.city = city;
    if (dateFrom || dateTo) {
      filters.dateRange = {};
      if (dateFrom) filters.dateRange.from = dateFrom;
      if (dateTo) filters.dateRange.to = dateTo;
    }

    const csv = await leadService.exportToCSV(filters);

    const filename = 'leads_export_' + new Date().toISOString().slice(0, 10) + '.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

    return res.status(200).send(csv);
  } catch (err) {
    logger.error('leads.controller.exportCSV error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/leads/stats/today
 * Return lead counts grouped by status for the current day.
 */
async function getTodayStats(req, res, next) {
  try {
    const stats = await leadService.getTodayStats();

    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    logger.error('leads.controller.getTodayStats error', { message: err.message });
    next(err);
  }
}

module.exports = {
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  bulkDelete,
  exportCSV,
  getTodayStats,
};
