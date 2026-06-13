'use strict';

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    channels: [
      {
        type: String,
        enum: ['sms', 'email', 'whatsapp'],
      },
    ],
    targetCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    targetCities: [
      {
        type: String,
        trim: true,
      },
    ],
    messageTemplate: {
      type: String,
    },
    useAI: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
    stats: {
      sent: {
        type: Number,
        default: 0,
      },
      delivered: {
        type: Number,
        default: 0,
      },
      responses: {
        type: Number,
        default: 0,
      },
      goodLeads: {
        type: Number,
        default: 0,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
