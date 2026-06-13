'use strict';

const mongoose = require('mongoose');

const scraperJobSchema = new mongoose.Schema(
  {
    jobDate: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'partial'],
      default: 'running',
    },
    targetCount: {
      type: Number,
      default: 0,
    },
    scrapedCount: {
      type: Number,
      default: 0,
    },
    newCount: {
      type: Number,
      default: 0,
    },
    duplicateCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    sourceStats: {
      type: Map,
      of: Number,
      default: {},
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    logs: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ScraperJob = mongoose.model('ScraperJob', scraperJobSchema);

module.exports = ScraperJob;
