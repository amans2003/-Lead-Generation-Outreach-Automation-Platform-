'use strict';

/**
 * leads.routes.js
 *
 * GET    /                – paginated, filtered lead list          (auth)
 * GET    /stats/today     – today's lead counts by status         (auth)
 * GET    /export/csv      – download filtered leads as CSV        (auth)
 * GET    /:id             – single lead with outreach logs        (auth)
 * PATCH  /:id/status      – update a lead's status               (auth, validate)
 * DELETE /:id             – hard-delete a single lead             (auth)
 * POST   /bulk-delete     – hard-delete multiple leads by IDs    (auth, validate)
 */

const express        = require('express');
const Joi            = require('joi');
const leadService    = require('../services/LeadService');
const authMiddleware = require('../middleware/auth.middleware');
const validate       = require('../middleware/validate.middleware');

const router = express.Router();

// ─── Joi schemas ──────────────────────────────────────────────────────────────

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'new',
      'processing',
      'good_lead',
      'not_interested',
      'bounced',
      'contacted',
      'interested',
      'converted',
      'invalid'
    )
    .required(),
});

const bulkDeleteSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.string().length(24))
    .min(1)
    .required(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /
 * Query params: status, category, source, city, from, to, page, limit, sortBy, sortOrder
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      status, category, source, city,
      from, to,
      page, limit, sortBy, sortOrder,
    } = req.query;

    const filters = {
      status, category, source, city,
      dateRange: (from || to) ? { from, to } : undefined,
    };

    const pagination = { page, limit, sortBy, sortOrder };

    const result = await leadService.getLeads(filters, pagination);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /stats/today
 */
router.get('/stats/today', authMiddleware, async (req, res, next) => {
  try {
    const stats = await leadService.getTodayStats();

    return res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /export/csv
 * Query params: status, category, source, city, from, to
 * Streams a CSV file back as an attachment.
 */
router.get('/export/csv', authMiddleware, async (req, res, next) => {
  try {
    const { status, category, source, city, from, to } = req.query;

    const filters = {
      status, category, source, city,
      dateRange: (from || to) ? { from, to } : undefined,
    };

    const csvString = await leadService.exportToCSV(filters);

    const filename = 'leads-' + new Date().toISOString().slice(0, 10) + '.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

    return res.status(200).send(csvString);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /:id
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id);

    return res.status(200).json({
      success: true,
      data: { lead },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /:id/status
 * Body: { status }
 */
router.patch(
  '/:id/status',
  authMiddleware,
  validate(updateStatusSchema),
  async (req, res, next) => {
    try {
      const lead = await leadService.updateLeadStatus(req.params.id, req.body.status);

      return res.status(200).json({
        success: true,
        message: 'Lead status updated.',
        data: { lead },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /:id
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await leadService.deleteLead(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Lead deleted.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /bulk-delete
 * Body: { ids: string[] }
 */
router.post(
  '/bulk-delete',
  authMiddleware,
  validate(bulkDeleteSchema),
  async (req, res, next) => {
    try {
      const result = await leadService.bulkDelete(req.body.ids);

      return res.status(200).json({
        success: true,
        message: result.deletedCount + ' lead(s) deleted.',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
