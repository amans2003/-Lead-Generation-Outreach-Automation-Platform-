'use strict';

/**
 * lead.validators.js
 * Joi validation schemas for lead management routes.
 */

const Joi = require('joi');

const VALID_LEAD_STATUSES = [
  'new',
  'processing',
  'good_lead',
  'not_interested',
  'bounced',
  'contacted',
  'interested',
  'converted',
  'invalid',
];

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...VALID_LEAD_STATUSES)
    .required()
    .messages({
      'any.only': 'Status must be one of: ' + VALID_LEAD_STATUSES.join(', '),
      'any.required': 'Status is required',
    }),
});

const bulkDeleteSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[a-f\d]{24}$/i)
        .message('Each id must be a valid MongoDB ObjectId')
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one id is required',
      'any.required': 'ids array is required',
    }),
});

const exportSchema = Joi.object({
  status: Joi.string()
    .valid(...VALID_LEAD_STATUSES)
    .optional()
    .messages({
      'any.only': 'Status must be one of: ' + VALID_LEAD_STATUSES.join(', '),
    }),
  category: Joi.string().trim().optional(),
  source: Joi.string()
    .valid('justdial', 'sulekha', 'google_maps', 'indiamart', 'tradeindia', 'manual', 'other')
    .optional(),
  city: Joi.string().trim().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});

module.exports = {
  updateStatusSchema,
  bulkDeleteSchema,
  exportSchema,
};
