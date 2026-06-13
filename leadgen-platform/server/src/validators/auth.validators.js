'use strict';

/**
 * auth.validators.js
 * Joi validation schemas for authentication routes.
 */

const Joi = require('joi');

/**
 * Schema for POST /api/auth/register
 * Fields: name (string, required), email (valid email, required), password (min 8 chars, required)
 */
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),

  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  }),
});

/**
 * Schema for POST /api/auth/login
 * Fields: email (valid email, required), password (required)
 */
const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

/**
 * Schema for POST /api/auth/refresh-token
 * Fields: refreshToken (string, required — can also be read from cookie by the controller)
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
};
