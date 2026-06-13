'use strict';

const mongoose = require('mongoose');

const scrapedQuerySchema = new mongoose.Schema(
  {
    source: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    page: {
      type: Number,
      default: 1,
    },
    lastScrapedAt: {
      type: Date,
    },
    leadCount: {
      type: Number,
      default: 0,
    },
    exhausted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on source + city + category + page
scrapedQuerySchema.index({ source: 1, city: 1, category: 1, page: 1 }, { unique: true });

const ScrapedQuery = mongoose.model('ScrapedQuery', scrapedQuerySchema);

module.exports = ScrapedQuery;
