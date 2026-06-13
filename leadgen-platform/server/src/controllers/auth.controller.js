'use strict';

/**
 * auth.controller.js
 * HTTP handlers for authentication: register, login, logout, refreshToken, getMe.
 * Delegates business logic to AuthService.
 * The refresh token is stored / read from an httpOnly cookie named "refreshToken".
 */

const authService = require('../services/AuthService');
const logger = require('../config/logger');

// Cookie settings for the refresh token
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    logger.error('auth.controller.register error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    logger.error('auth.controller.login error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears the refresh token cookie.
 */
async function logout(req, res, next) {
  try {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    logger.error('auth.controller.logout error', { message: err.message });
    next(err);
  }
}

/**
 * POST /api/auth/refresh-token
 * Reads refresh token from httpOnly cookie first; falls back to request body.
 */
async function refreshToken(req, res, next) {
  try {
    const token =
      (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) ||
      req.body.refreshToken;

    if (!token) {
      const err = new Error('Refresh token is required');
      err.statusCode = 401;
      return next(err);
    }

    const result = await authService.refreshToken(token);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    logger.error('auth.controller.refreshToken error', { message: err.message });
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user from req.user (set by auth middleware).
 */
async function getMe(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Not authenticated');
      err.statusCode = 401;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (err) {
    logger.error('auth.controller.getMe error', { message: err.message });
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
};
