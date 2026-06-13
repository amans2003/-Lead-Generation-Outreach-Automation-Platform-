'use strict';

/**
 * AuthService.js
 * Handles user registration, login, and JWT token management.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const env = require('../config/env');
const logger = require('../config/logger');

class AuthService {
  /**
   * Register a new user.
   *
   * @param {string} name
   * @param {string} email
   * @param {string} password  - plain-text; hashed by the User pre-save hook
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
   */
  async register(name, email, password) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      throw err;
    }

    const user = await User.create({ name, email, password });

    const tokens = this.generateTokens(user._id.toString());

    logger.info('AuthService.register: new user created', { userId: user._id, email });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Authenticate an existing user.
   *
   * @param {string} email
   * @param {string} password  - plain-text
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
   */
  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Account is deactivated');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    // Update last login timestamp (fire and forget)
    user.lastLogin = new Date();
    user.save().catch((e) => logger.error('Failed to update lastLogin', { error: e.message }));

    const tokens = this.generateTokens(user._id.toString());

    logger.info('AuthService.login: user authenticated', { userId: user._id });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Verify a refresh token and issue a new access token.
   *
   * @param {string} refreshToken
   * @returns {Promise<{ accessToken: string }>}
   */
  async refreshToken(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(payload.userId).select('_id isActive');
    if (!user || !user.isActive) {
      const err = new Error('User not found or deactivated');
      err.statusCode = 401;
      throw err;
    }

    const accessToken = jwt.sign(
      { userId: user._id.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return { accessToken };
  }

  /**
   * Generate an access token + refresh token pair.
   *
   * @param {string} userId
   * @returns {{ accessToken: string, refreshToken: string }}
   */
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
