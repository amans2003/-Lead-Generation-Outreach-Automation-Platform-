'use strict';

/**
 * Joi Request Body Validation Middleware Factory
 *
 * Usage:
 *   const validate = require('./validate.middleware');
 *   const { createLeadSchema } = require('../validators/lead.validator');
 *
 *   router.post('/leads', validate(createLeadSchema), createLeadController);
 *
 * On failure : responds 400 with { success: false, message, errors: [...] }
 * On success : strips unknown keys (by default) and calls next()
 */

/**
 * @param {import('joi').Schema} schema - A Joi schema to validate req.body against
 * @param {import('joi').ValidationOptions} [options] - Optional Joi validation options
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, options = {}) => {
  if (!schema || typeof schema.validate !== 'function') {
    throw new TypeError('[validate.middleware] A valid Joi schema must be provided.');
  }

  const joiOptions = {
    abortEarly: false,   // collect ALL errors, not just the first
    allowUnknown: false, // reject unexpected keys
    stripUnknown: true,  // remove unknown keys from the validated value
    ...options,
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, joiOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please check the provided data.',
        errors,
      });
    }

    // Replace req.body with the sanitized / coerced value from Joi
    req.body = value;
    return next();
  };
};

module.exports = validate;
