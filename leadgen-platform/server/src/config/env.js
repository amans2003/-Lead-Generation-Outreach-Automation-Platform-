'use strict';

require('dotenv').config();
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().default(5000),

  // Client
  CLIENT_URL: Joi.string().uri().required(),

  // Database
  MONGODB_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Anthropic / AI
  ANTHROPIC_API_KEY: Joi.string().required(),

  // Twilio / SMS
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_PHONE_NUMBER: Joi.string().required(),

  // Email / Gmail OAuth
  EMAIL_SERVICE: Joi.string().default('gmail'),
  EMAIL_USER: Joi.string().email().required(),
  GMAIL_CLIENT_ID: Joi.string().required(),
  GMAIL_CLIENT_SECRET: Joi.string().required(),
  GMAIL_REFRESH_TOKEN: Joi.string().required(),

  // WhatsApp
  WHATSAPP_SESSION_PATH: Joi.string().default('./whatsapp-session'),
  WHATSAPP_HEADLESS: Joi.boolean().truthy('true').falsy('false').default(true),

  // Scraper
  SCRAPER_DAILY_TARGET: Joi.number().integer().default(500),
  SCRAPER_BATCH_SIZE: Joi.number().integer().default(50),
  SCRAPER_DELAY_MIN_MS: Joi.number().integer().default(1000),
  SCRAPER_DELAY_MAX_MS: Joi.number().integer().default(3000),
  SCRAPER_CONCURRENT_TABS: Joi.number().integer().default(3),
  SCRAPER_HEADLESS: Joi.boolean().truthy('true').falsy('false').default(true),
  SCRAPER_SCHEDULE_CRON: Joi.string().default('0 2 * * *'),
  SCRAPER_TARGET_CITIES: Joi.string().default('Mumbai,Delhi,Bangalore'),

  // Bloom filter
  BLOOM_FILTER_CAPACITY: Joi.number().integer().default(1000000),
  BLOOM_FILTER_ERROR_RATE: Joi.number().default(0.01),

  // Outreach rate limits
  OUTREACH_SMS_PER_HOUR: Joi.number().integer().default(50),
  OUTREACH_EMAIL_PER_HOUR: Joi.number().integer().default(100),
  OUTREACH_WHATSAPP_PER_HOUR: Joi.number().integer().default(30),
  OUTREACH_DELAY_BETWEEN_MS: Joi.number().integer().default(2000),

  // Lead scoring thresholds
  LEAD_SCORE_GOOD_THRESHOLD: Joi.number().default(70),
  LEAD_SCORE_SKIP_THRESHOLD: Joi.number().default(30),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_DIR: Joi.string().default('logs'),
}).unknown(true);

const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  const missing = error.details.map((d) => `  - ${d.message}`).join('\n');
  throw new Error(`Environment validation failed:\n${missing}`);
}

module.exports = {
  NODE_ENV: validatedEnv.NODE_ENV,
  PORT: validatedEnv.PORT,

  CLIENT_URL: validatedEnv.CLIENT_URL,

  MONGODB_URI: validatedEnv.MONGODB_URI,
  REDIS_URL: validatedEnv.REDIS_URL,

  JWT_SECRET: validatedEnv.JWT_SECRET,
  JWT_EXPIRES_IN: validatedEnv.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: validatedEnv.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: validatedEnv.JWT_REFRESH_EXPIRES_IN,

  ANTHROPIC_API_KEY: validatedEnv.ANTHROPIC_API_KEY,

  TWILIO_ACCOUNT_SID: validatedEnv.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: validatedEnv.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: validatedEnv.TWILIO_PHONE_NUMBER,

  EMAIL_SERVICE: validatedEnv.EMAIL_SERVICE,
  EMAIL_USER: validatedEnv.EMAIL_USER,
  GMAIL_CLIENT_ID: validatedEnv.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: validatedEnv.GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: validatedEnv.GMAIL_REFRESH_TOKEN,

  WHATSAPP_SESSION_PATH: validatedEnv.WHATSAPP_SESSION_PATH,
  WHATSAPP_HEADLESS: validatedEnv.WHATSAPP_HEADLESS,

  SCRAPER_DAILY_TARGET: validatedEnv.SCRAPER_DAILY_TARGET,
  SCRAPER_BATCH_SIZE: validatedEnv.SCRAPER_BATCH_SIZE,
  SCRAPER_DELAY_MIN_MS: validatedEnv.SCRAPER_DELAY_MIN_MS,
  SCRAPER_DELAY_MAX_MS: validatedEnv.SCRAPER_DELAY_MAX_MS,
  SCRAPER_CONCURRENT_TABS: validatedEnv.SCRAPER_CONCURRENT_TABS,
  SCRAPER_HEADLESS: validatedEnv.SCRAPER_HEADLESS,
  SCRAPER_SCHEDULE_CRON: validatedEnv.SCRAPER_SCHEDULE_CRON,
  SCRAPER_TARGET_CITIES: validatedEnv.SCRAPER_TARGET_CITIES
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean),

  BLOOM_FILTER_CAPACITY: validatedEnv.BLOOM_FILTER_CAPACITY,
  BLOOM_FILTER_ERROR_RATE: validatedEnv.BLOOM_FILTER_ERROR_RATE,

  OUTREACH_SMS_PER_HOUR: validatedEnv.OUTREACH_SMS_PER_HOUR,
  OUTREACH_EMAIL_PER_HOUR: validatedEnv.OUTREACH_EMAIL_PER_HOUR,
  OUTREACH_WHATSAPP_PER_HOUR: validatedEnv.OUTREACH_WHATSAPP_PER_HOUR,
  OUTREACH_DELAY_BETWEEN_MS: validatedEnv.OUTREACH_DELAY_BETWEEN_MS,

  LEAD_SCORE_GOOD_THRESHOLD: validatedEnv.LEAD_SCORE_GOOD_THRESHOLD,
  LEAD_SCORE_SKIP_THRESHOLD: validatedEnv.LEAD_SCORE_SKIP_THRESHOLD,

  LOG_LEVEL: validatedEnv.LOG_LEVEL,
  LOG_DIR: validatedEnv.LOG_DIR,
};
