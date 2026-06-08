const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DrivingLicense',
    },

    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    violationType: { type: String, required: true },
    violationCode: String,
    description: String,

    location: {
      address: String,
      city: String,
      lat: Number,
      lng: Number,
    },

    fineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    evidence: [
      {
        type: {
          type: String,
          enum: ['image', 'document', 'note'],
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'approved', 'dismissed', 'paid', 'unpaid'],
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'waived'],
      default: 'unpaid',
    },

    paymentDate: Date,

    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    adminReviewNote: String,
    reviewedAt: Date,

    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Violation', violationSchema);