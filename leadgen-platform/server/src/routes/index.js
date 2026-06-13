'use strict';

/**
 * routes/index.js
 *
 * Master router — mounts every feature router under /api/v1/.
 *
 *   /api/v1/auth          auth.routes.js
 *   /api/v1/leads         leads.routes.js
 *   /api/v1/scraper       scraper.routes.js
 *   /api/v1/outreach      outreach.routes.js
 *   /api/v1/campaigns     campaign.routes.js
 *   /api/v1/analytics     analytics.routes.js
 */

const express    = require('express');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

const authRouter      = require('./auth.routes');
const leadsRouter     = require('./leads.routes');
const scraperRouter   = require('./scraper.routes');
const outreachRouter  = require('./outreach.routes');
const campaignRouter  = require('./campaign.routes');
const analyticsRouter = require('./analytics.routes');

const router = express.Router();

// Apply the general API rate limiter to every /api/v1/* endpoint.
// Individual feature routers may additionally apply stricter limiters
// (e.g. authLimiter, scraperLimiter) on specific routes.
router.use(apiLimiter);

// ─── Health-check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is healthy.',
    timestamp: new Date().toISOString(),
    version: 'v1',
  });
});

// ─── Feature routers ──────────────────────────────────────────────────────────
router.use('/auth',       authRouter);
router.use('/leads',      leadsRouter);
router.use('/scraper',    scraperRouter);
router.use('/outreach',   outreachRouter);
router.use('/campaigns',  campaignRouter);
router.use('/analytics',  analyticsRouter);

module.exports = router;
