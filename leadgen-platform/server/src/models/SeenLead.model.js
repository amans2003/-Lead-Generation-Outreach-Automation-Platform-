'use strict';

const mongoose = require('mongoose');

const seenLeadSchema = new mongoose.Schema(
  {
    phoneHash: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    emailHash: {
      type: String,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

const SeenLead = mongoose.model('SeenLead', seenLeadSchema);

module.exports = SeenLead;
