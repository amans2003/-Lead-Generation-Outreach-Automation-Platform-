'use strict';

// ─── 1. Load and validate environment variables FIRST ────────────────────────
// env.js calls dotenv.config() and throws if any required variable is missing.
const env = require('./config/env');

// ─── 2. Core deps ─────────────────────────────────────────────────────────────
const http         = require('http');
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');

// ─── 3. Config & infrastructure ──────────────────────────────────────────────
const logger             = require('./config/logger');
const { connectDB }      = require('./config/database');
// Import Redis client so the connection is established at boot time
require('./config/redis');

// ─── 4. Middleware ────────────────────────────────────────────────────────────
const requestLogger  = require('./middleware/requestLogger.middleware');
const errorHandler   = require('./middleware/errorHandler.middleware');

// ─── 5. Routes ────────────────────────────────────────────────────────────────
const apiRouter = require('./routes/index');

// ─── 6. Services that need to be started at boot ─────────────────────────────
const WhatsAppService  = require('./services/outreach/WhatsAppService');
const scraperWorker    = require('./services/queue/workers/scraper.worker');   // starts BullMQ worker
const outreachWorker   = require('./services/queue/workers/outreach.worker');  // starts BullMQ worker
const ScraperOrchestrator = require('./services/scraper/ScraperOrchestrator');
const { startDailyScrapeJob, stopDailyScrapeJob } = require('./jobs/dailyScrapeJob');

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow Socket.io to function (relaxed CSP in development)
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// In development, accept any localhost origin (Vite may use a different port).
const corsOrigin = env.NODE_ENV === 'production'
  ? env.CLIENT_URL
  : (origin, cb) => {
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    };

app.use(
  cors({
    origin:      corsOrigin,
    credentials: true,                // allow cookies to be sent cross-origin
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Cookie parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Request logger ────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.method + ' ' + req.originalUrl,
  });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server + Socket.io
// ─────────────────────────────────────────────────────────────────────────────

const httpServer = http.createServer(app);

// Initialise Socket.io
const { Server: SocketIOServer } = require('socket.io');
const io = new SocketIOServer(httpServer, {
  cors: {
    origin:      env.CLIENT_URL,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make `io` globally accessible so workers & orchestrators can emit events
// without creating circular dependencies.
global.io = io;

// ScraperOrchestrator uses global.io for Socket.io events (set above).
// No explicit injection needed — the orchestrator reads global.io at emit time.

io.on('connection', (socket) => {
  logger.info('Socket.io: client connected', { socketId: socket.id });

  socket.on('disconnect', (reason) => {
    logger.info('Socket.io: client disconnected', { socketId: socket.id, reason });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boot sequence
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected');

    // 2. Start HTTP server
    const PORT = env.PORT || 5000;
    await new Promise((resolve, reject) => {
      httpServer.listen(PORT, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    logger.info('Server listening on port ' + PORT);
    logger.info('Environment: ' + env.NODE_ENV);
    logger.info('Client URL:  ' + env.CLIENT_URL);

    // 3. Initialise WhatsApp (non-blocking — QR code appears in logs)
    WhatsAppService.initialize()
      .then(() => logger.info('WhatsAppService: client READY'))
      .catch((err) => logger.warn('WhatsAppService: failed to initialise', { error: err.message }));

    // 4. BullMQ workers are started by requiring the worker modules above.
    //    Log their readiness.
    scraperWorker.on('ready', () => logger.info('BullMQ scraper worker ready'));
    outreachWorker.on('ready', () => logger.info('BullMQ outreach worker ready'));

    // 5. Start daily cron job
    startDailyScrapeJob();
    logger.info('Daily scrape cron job scheduled: ' + env.SCRAPER_SCHEDULE_CRON);

  } catch (err) {
    logger.error('Fatal error during server startup', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────

async function gracefulShutdown(signal) {
  logger.info('Graceful shutdown initiated', { signal });

  // Stop cron job
  stopDailyScrapeJob();

  // Close BullMQ workers
  try {
    await Promise.all([
      scraperWorker.close(),
      outreachWorker.close(),
    ]);
    logger.info('BullMQ workers closed');
  } catch (err) {
    logger.warn('Error closing BullMQ workers', { error: err.message });
  }

  // Close HTTP server (stop accepting new connections)
  httpServer.close((err) => {
    if (err) {
      logger.error('Error closing HTTP server', { error: err.message });
      process.exit(1);
    } else {
      logger.info('HTTP server closed');
      process.exit(0);
    }
  });

  // Force exit after 15 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out – forcing exit');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections so they don't silently swallow errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack:  reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

startServer();

module.exports = app; // exported for testing
