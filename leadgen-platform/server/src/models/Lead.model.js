'use strict';

const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    altPhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      index: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'restaurant',
        'retail',
        'salon',
        'gym',
        'clinic',
        'hotel',
        'school',
        'real_estate',
        'automobile',
        'electronics',
        'grocery',
        'pharmacy',
        'clothing',
        'jewellery',
        'hardware',
        'travel',
        'photography',
        'event',
        'coaching',
        'other',
      ],
      index: true,
    },
    source: {
      type: String,
      enum: ['justdial', 'sulekha', 'google_maps', 'indiamart', 'tradeindia', 'manual', 'other'],
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'not_interested', 'converted', 'invalid'],
      default: 'new',
      index: true,
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    outreachAttempts: {
      type: Number,
      default: 0,
    },
    lastOutreachAt: {
      type: Date,
    },
    lastResponseAt: {
      type: Date,
    },
    lastResponseText: {
      type: String,
    },
    outreachLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OutreachLog',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    scrapedAt: {
      type: Date,
    },
    scrapeDate: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
