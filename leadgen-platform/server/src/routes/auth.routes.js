'use strict';

/**
 * auth.routes.js
 *
 * POST  /register       – create a new user account   (authLimiter, validate)
 * POST  /login          – authenticate and receive tokens  (authLimiter)
 * POST  /logout         – clear the httpOnly cookie
 * POST  /refresh-token  – issue a new access token from a refresh token
 * GET   /me             – return the current user's profile  (auth)
 */

const express        = require('express');
const Joi            = require('joi');
const authService    = require('../services/AuthService');
const authMiddleware = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const validate       = require('../middleware/validate.middleware');
const logger         = require('../config/logger');

const router = express.Router();

// ─── Joi schemas ──────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ─── Cookie helper ────────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly:  true,
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  'strict',
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /register
 * Body: { name, email, password }
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.register(name, email, password);

      res.cookie('token', accessToken, COOKIE_OPTIONS);
      res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS });

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        data: { user, accessToken },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /login
 * Body: { email, password }
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);

      res.cookie('token', accessToken, COOKIE_OPTIONS);
      res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS });

      logger.info('auth.routes: user logged in', { userId: user.id });

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: { user, accessToken },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /logout
 * Clears the httpOnly auth cookies.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * POST /refresh-token
 * Body: { refreshToken }   OR   cookie: refreshToken
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  async (req, res, next) => {
    try {
      const token = req.body.refreshToken
        || (req.cookies && req.cookies.refreshToken);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No refresh token provided.',
        });
      }

      const { accessToken } = await authService.refreshToken(token);

      res.cookie('token', accessToken, COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: 'Access token refreshed.',
        data: { accessToken },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /me
 * Returns the authenticated user's profile.
 */
router.get(
  '/me',
  authMiddleware,
  async (req, res, next) => {
    try {
      const User = require('../models/User.model');
      const user = await User.findById(req.user.id)
        .select('-password -__v')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
