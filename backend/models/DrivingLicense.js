const mongoose = require('mongoose');

const drivingLicenseSchema = new mongoose.Schema(
  {
    licenseNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    holderName: { type: String, required: true },
    nid: { type: String, required: true },

    dateOfBirth: Date,

    licenseClass: {
      type: String,
      enum: ['motorcycle', 'light', 'medium', 'heavy', 'professional'],
      required: true,
    },

    issueDate: Date,
    expiryDate: Date,

    issuingAuthority: {
      type: String,
      default: 'BRTA',
    },

    qrCode: String,

    status: {
      type: String,
      enum: ['valid', 'expired', 'suspended', 'blacklisted'],
      default: 'valid',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DrivingLicense', drivingLicenseSchema);