'use strict';

/**
 * campaign.controller.js
 * HTTP handlers for Campaign CRUD and stats.
 */

const Campaign = require('../models/Campaign.model');
const Lead = require('../models/Lead.model');
const OutreachLog = require('../models/OutreachLog.model');
const logger = require('../config/logger');

/**
 * POST /api/campaigns
 * Create a new campaign (draft state — does not trigger outreach).
 * Body: { name, description?, channels, targetCategories, targetCities, messageTemplate?, useAI? }
 */
async function createCampaign(req, res, next) {
  try {
    const {
      name,
      description,
      channels,
      targetCategories,
      targetCities,
      messageTemplate,
      useAI,
    } = req.body;

    const campaign = await Campaign.create({
      name,
      description,
      channels,
      targetCategories,
      targetCities,
      messageTemplate,
      useAI: useAI !== undefined ? useAI : true,
      status: 'draft',
      createdBy: req.user ? req.user._id : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Campaign created',
      data: { campaign },
    });
  } catch (err) {
    logger.error('campaign.controller.createCampaign error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/campaigns
 * Return a paginated list of all campaigns.
 * Query params: status, page, limit
 */
async function getCampaigns(req, res, next) {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      Campaign.countDocuments(query),
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
    logger.error('campaign.controller.getCampaigns error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/campaigns/:id
 * Return a single campaign by ID.
 */
async function getCampaignById(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      data: { campaign },
    });
  } catch (err) {
    logger.error('campaign.controller.getCampaignById error', { message: err.message });
    next(err);
  }
}

/**
 * PUT /api/campaigns/:id
 * Update campaign fields (not allowed when status is 'completed').
 * Body: any subset of campaign fields
 */
async function updateCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      return next(err);
    }

    if (campaign.status === 'completed') {
      const err = new Error('Cannot update a completed campaign');
      err.statusCode = 400;
      return next(err);
    }

    const allowedFields = [
      'name',
      'description',
      'channels',
      'targetCategories',
      'targetCities',
      'messageTemplate',
      'useAI',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: 'Campaign updated',
      data: { campaign },
    });
  } catch (err) {
    logger.error('campaign.controller.updateCampaign error', { message: err.message });
    next(err);
  }
}

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign. Does not delete associated outreach logs.
 */
async function deleteCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      return next(err);
    }

    if (campaign.status === 'active') {
      const err = new Error('Cannot delete an active campaign. Pause it first.');
      err.statusCode = 400;
      return next(err);
    }

    await Campaign.findByIdAndDelete(req.params.id);

    logger.info('campaign.controller.deleteCampaign: deleted', { campaignId: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Campaign deleted',
      data: { id: req.params.id },
    });
  } catch (err) {
    logger.error('campaign.controller.deleteCampaign error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/campaigns/:id/stats
 * Return detailed stats for a campaign: sent, delivered, responses, good leads,
 * channel breakdown.
 */
async function getCampaignStats(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();

    if (!campaign) {
      const err = new Error('Campaign not found');
      err.statusCode = 404;
      return next(err);
    }

    const [channelBreakdown, statusBreakdown, goodLeadCount] = await Promise.all([
      // Per-channel counts
      OutreachLog.aggregate([
        { $match: { campaign: campaign._id } },
        {
          $group: {
            _id: { channel: '$channel', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Per-status counts
      OutreachLog.aggregate([
        { $match: { campaign: campaign._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Good leads generated by this campaign
      Lead.countDocuments({
        status: 'good_lead',
        outreachLogs: {
          $in: await OutreachLog.distinct('_id', { campaign: campaign._id }),
        },
      }),
    ]);

    // Flatten channel breakdown
    const byChannel = {};
    channelBreakdown.forEach(({ _id, count }) => {
      if (!byChannel[_id.channel]) {
        byChannel[_id.channel] = {};
      }
      byChannel[_id.channel][_id.status] = count;
    });

    // Flatten status breakdown
    const byStatus = {};
    statusBreakdown.forEach(({ _id, count }) => {
      byStatus[_id] = count;
    });

    const totalSent = (byStatus.sent || 0) + (byStatus.delivered || 0) + (byStatus.responded || 0);
    const conversionRate =
      totalSent > 0 ? ((goodLeadCount / totalSent) * 100).toFixed(2) + '%' : '0.00%';

    return res.status(200).json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          createdAt: campaign.createdAt,
        },
        stats: {
          totalSent,
          delivered: byStatus.delivered || 0,
          responded: byStatus.responded || 0,
          failed: byStatus.failed || 0,
          goodLeads: goodLeadCount,
          conversionRate,
          byChannel,
        },
      },
    });
  } catch (err) {
    logger.error('campaign.controller.getCampaignStats error', { message: err.message });
    next(err);
  }
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
};
