'use strict';

/**
 * outreach.validators.js
 * Joi validation schemas for outreach and campaign routes.
 */

const Joi = require('joi');

const VALID_CHANNELS = ['sms', 'email', 'whatsapp'];

/**
 * Schema for POST /api/outreach/send
 * Send a single outreach message to one lead.
 */
const sendSingleSchema = Joi.object({
  leadId: Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .required()
    .messages({
      'string.pattern.base': 'leadId must be a valid MongoDB ObjectId',
      'any.required': 'leadId is required',
    }),

  channel: Joi.string()
    .valid(...VALID_CHANNELS)
    .required()
    .messages({
      'any.only': 'channel must be one of: ' + VALID_CHANNELS.join(', '),
      'any.required': 'channel is required',
    }),

  message: Joi.string().trim().max(1600).optional().messages({
    'string.max': 'message must not exceed 1600 characters',
  }),
});

/**
 * Schema for POST /api/outreach/campaign
 * Create and launch a bulk outreach campaign.
 */
const campaignSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'string.min': 'Campaign name must be at least 2 characters',
    'string.max': 'Campaign name must not exceed 200 characters',
    'any.required': 'Campaign name is required',
  }),

  channels: Joi.array()
    .items(Joi.string().valid(...VALID_CHANNELS))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one channel is required',
      'any.required': 'channels array is required',
    }),

  targetCategories: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one target category is required',
      'any.required': 'targetCategories is required',
    }),

  targetCities: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one target city is required',
      'any.required': 'targetCities is required',
    }),

  messageTemplate: Joi.string().trim().max(1600).optional().messages({
    'string.max': 'messageTemplate must not exceed 1600 characters',
  }),

  useAI: Joi.boolean().optional().default(true),
});

module.exports = {
  sendSingleSchema,
  campaignSchema,
};
