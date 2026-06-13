'use strict';

/**
 * LeadService.js
 * Business-logic layer for Lead CRUD, filtering, pagination, bulk ops, and CSV export.
 */

const Lead = require('../models/Lead.model');
const OutreachLog = require('../models/OutreachLog.model');
const logger = require('../config/logger');
const { exportToCSVString } = require('../utils/csvExporter');

class LeadService {
  /**
   * Query leads with optional filters and cursor-based pagination.
   *
   * @param {Object} filters  - { status, category, source, city, dateRange: { from, to } }
   * @param {Object} pagination - { page, limit, sortBy, sortOrder }
   * @returns {Promise<{ leads: Array, total: number, page: number, totalPages: number }>}
   */
  async getLeads(filters, pagination) {
    if (!filters) filters = {};
    if (!pagination) pagination = {};

    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.source) query.source = filters.source;
    if (filters.city) query.city = new RegExp(filters.city, 'i');

    if (filters.dateRange) {
      const dateFilter = {};
      if (filters.dateRange.from) dateFilter.$gte = new Date(filters.dateRange.from);
      if (filters.dateRange.to) dateFilter.$lte = new Date(filters.dateRange.to);
      if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(pagination.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const [leads, total] = await Promise.all([
      Lead.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Lead.countDocuments(query),
    ]);

    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single lead by ID with populated outreach logs.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getLeadById(id) {
    const lead = await Lead.findById(id)
      .populate({
        path: 'outreachLogs',
        model: 'OutreachLog',
        options: { sort: { createdAt: -1 } },
      })
      .lean();

    if (!lead) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      throw err;
    }

    return lead;
  }

  /**
   * Update the status of a lead and log the change.
   *
   * @param {string} id
   * @param {string} status  - one of Lead.schema.path('status').enumValues
   * @returns {Promise<Object>}
   */
  async updateLeadStatus(id, status) {
    const validStatuses = ['new', 'processing', 'good_lead', 'not_interested', 'bounced', 'contacted', 'interested', 'converted', 'invalid'];
    if (!validStatuses.includes(status)) {
      const err = new Error('Invalid lead status: ' + status);
      err.statusCode = 400;
      throw err;
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      throw err;
    }

    const previousStatus = lead.status;
    lead.status = status;
    await lead.save();

    logger.info('LeadService.updateLeadStatus', {
      leadId: id,
      previousStatus,
      newStatus: status,
    });

    return lead.toObject();
  }

  /**
   * Delete a lead.
   * Soft delete: mark as inactive (if the model supports it) OR hard delete.
   * The Lead model does not have an isActive field so we perform a hard delete
   * but first remove associated OutreachLogs.
   *
   * @param {string} id
   * @returns {Promise<{ deleted: boolean }>}
   */
  async deleteLead(id) {
    const lead = await Lead.findById(id);
    if (!lead) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      throw err;
    }

    // Remove associated outreach logs
    if (lead.outreachLogs && lead.outreachLogs.length > 0) {
      await OutreachLog.deleteMany({ _id: { $in: lead.outreachLogs } });
    }

    await Lead.findByIdAndDelete(id);

    logger.info('LeadService.deleteLead', { leadId: id });

    return { deleted: true, id };
  }

  /**
   * Bulk delete leads by IDs.
   *
   * @param {string[]} ids
   * @returns {Promise<{ deletedCount: number }>}
   */
  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('No IDs provided for bulk delete');
      err.statusCode = 400;
      throw err;
    }

    // Gather outreach log IDs to remove
    const leads = await Lead.find({ _id: { $in: ids } }).select('outreachLogs').lean();
    const outreachLogIds = leads.flatMap((l) => l.outreachLogs || []);

    if (outreachLogIds.length > 0) {
      await OutreachLog.deleteMany({ _id: { $in: outreachLogIds } });
    }

    const result = await Lead.deleteMany({ _id: { $in: ids } });

    logger.info('LeadService.bulkDelete', { ids, deletedCount: result.deletedCount });

    return { deletedCount: result.deletedCount };
  }

  /**
   * Export filtered leads to a CSV string.
   *
   * @param {Object} filters  - same shape as getLeads filters
   * @returns {Promise<string>}  CSV text
   */
  async exportToCSV(filters) {
    if (!filters) filters = {};

    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.source) query.source = filters.source;
    if (filters.city) query.city = new RegExp(filters.city, 'i');
    if (filters.dateRange) {
      const dateFilter = {};
      if (filters.dateRange.from) dateFilter.$gte = new Date(filters.dateRange.from);
      if (filters.dateRange.to) dateFilter.$lte = new Date(filters.dateRange.to);
      if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
    }

    const leads = await Lead.find(query).lean();

    // Delegate CSV serialisation to the utility; fall back gracefully
    if (typeof exportToCSVString === 'function') {
      return exportToCSVString(leads);
    }

    // Fallback: manual CSV generation
    const fields = [
      'businessName', 'ownerName', 'phone', 'email', 'whatsapp',
      'city', 'state', 'category', 'source', 'status',
      'aiScore', 'outreachAttempts', 'createdAt',
    ];

    const header = fields.join(',');
    const rows = leads.map((lead) =>
      fields
        .map((f) => {
          const val = lead[f] === undefined || lead[f] === null ? '' : String(lead[f]);
          // Escape commas/quotes for CSV
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? '"' + val.replace(/"/g, '""') + '"'
            : val;
        })
        .join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Return count of leads grouped by status for today.
   *
   * @returns {Promise<Object>}  e.g. { new: 12, processing: 3, good_lead: 7, ... }
   */
  async getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Lead.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      new: 0,
      processing: 0,
      good_lead: 0,
      not_interested: 0,
      bounced: 0,
      contacted: 0,
      interested: 0,
      converted: 0,
      invalid: 0,
      total: 0,
    };

    result.forEach(({ _id, count }) => {
      if (_id && stats[_id] !== undefined) stats[_id] = count;
      else if (_id) stats[_id] = count; // handle any unlisted status
      stats.total += count;
    });

    return stats;
  }
}

module.exports = new LeadService();
