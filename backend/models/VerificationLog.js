const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema(
  {
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    searchType: {
      type: String,
      enum: ['plate', 'license', 'qr_vehicle', 'qr_license'],
      required: true,
    },

    searchValue: {
      type: String,
      required: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DrivingLicense',
    },

    result: {
      type: String,
      enum: ['valid', 'invalid', 'warning', 'blacklisted'],
      required: true,
    },

    issues: [String],

    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationLog', verificationLogSchema);