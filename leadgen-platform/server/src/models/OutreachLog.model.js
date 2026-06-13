'use strict';

const mongoose = require('mongoose');

const outreachLogSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    channel: {
      type: String,
      enum: ['sms', 'email', 'whatsapp'],
      required: [true, 'Channel is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'responded'],
      default: 'pending',
    },
    response: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
    twilioSid: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const OutreachLog = mongoose.model('OutreachLog', outreachLogSchema);

module.exports = OutreachLog;
