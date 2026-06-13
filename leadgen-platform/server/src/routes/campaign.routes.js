'use strict';

/**
 * campaign.routes.js
 *
 * Full CRUD for Campaign documents.
 *
 * GET    /           – list all campaigns, paginated          (auth)
 * POST   /           – create a new campaign                  (auth, validate)
 * GET    /:id        – get single campaign by ID              (auth)
 * PUT    /:id        – full replace / update a campaign       (auth, validate)
 * PATCH  /:id        – partial update a campaign              (auth)
 * DELETE /:id        – delete a campaign                      (auth)
 * PATCH  /:id/status – change campaign status                 (auth, validate)
 */

const express        = require('express');
const Joi            = require('joi');
const Campaign       = require('../models/Campaign.model');
const authMiddleware = require('../middleware/auth.middleware');
const validate       = require('../middleware/validate.middleware');
const logger         = require('../config/logger');

const router = express.Router();

// ─── Joi schemas ──────────────────────────────────────────────────────────────

const createCampaignSchema = Joi.object({
  name:             Joi.string().min(2).max(200).required(),
  description:      Joi.string().max(2000).optional().allow(''),
  channels:         Joi.array().items(Joi.string().valid('sms', 'email', 'whatsapp')).min(1).required(),
  targetCategories: Joi.array().items(Joi.string().trim()).optional(),
  targetCities:     Joi.array().items(Joi.string().trim()).optional(),
  messageTemplate:  Joi.string().max(4000).optional().allow(''),
  useAI:            Joi.boolean().optional(),
  status:           Joi.string().valid('draft', 'active', 'paused', 'completed').optional(),
});

const updateCampaignSchema = Joi.object({
  name:             Joi.string().min(2).max(200).optional(),
  description:      Joi.string().max(2000).optional().allow(''),
  channels:         Joi.array().items(Joi.string().valid('sms', 'email', 'whatsapp')).min(1).optional(),
  targetCategories: Joi.array().items(Joi.string().trim()).optional(),
  targetCities:     Joi.array().items(Joi.string().trim()).optional(),
  messageTemplate:  Joi.string().max(4000).optional().allow(''),
  useAI:            Joi.boolean().optional(),
  status:           Joi.string().valid('draft', 'active', 'paused', 'completed').optional(),
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('draft', 'active', 'paused', 'completed').required(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /
 * Query params: page, limit, status
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        campaigns,
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
 * POST /
 * Body: createCampaignSchema fields
 */
router.post(
  '/',
  authMiddleware,
  validate(createCampaignSchema),
  async (req, res, next) => {
    try {
      const campaign = await Campaign.create({
        ...req.body,
        createdBy: req.user.id,
      });

      logger.info('campaign.routes: campaign created', { campaignId: campaign._id, userId: req.user.id });

      return res.status(201).json({
        success: true,
        message: 'Campaign created.',
        data: { campaign },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /:id
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { campaign },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /:id
 * Full replacement update.
 */
router.put(
  '/:id',
  authMiddleware,
  validate(createCampaignSchema),
  async (req, res, next) => {
    try {
      const campaign = await Campaign.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).lean();

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found.',
        });
      }

      logger.info('campaign.routes: campaign replaced', { campaignId: req.params.id, userId: req.user.id });

      return res.status(200).json({
        success: true,
        message: 'Campaign updated.',
        data: { campaign },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /:id
 * Partial update.
 */
router.patch(
  '/:id',
  authMiddleware,
  validate(updateCampaignSchema),
  async (req, res, next) => {
    try {
      const campaign = await Campaign.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).lean();

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found.',
        });
      }

      logger.info('campaign.routes: campaign patched', { campaignId: req.params.id, userId: req.user.id });

      return res.status(200).json({
        success: true,
        message: 'Campaign updated.',
        data: { campaign },
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
    const campaign = await Campaign.findByIdAndDelete(req.params.id).lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
    }

    logger.info('campaign.routes: campaign deleted', { campaignId: req.params.id, userId: req.user.id });

    return res.status(200).json({
      success: true,
      message: 'Campaign deleted.',
      data: { id: req.params.id },
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
  validate(statusUpdateSchema),
  async (req, res, next) => {
    try {
      const campaign = await Campaign.findByIdAndUpdate(
        req.params.id,
        { $set: { status: req.body.status } },
        { new: true, runValidators: true }
      ).lean();

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found.',
        });
      }

      logger.info('campaign.routes: campaign status changed', {
        campaignId: req.params.id,
        status: req.body.status,
        userId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Campaign status updated.',
        data: { campaign },
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
