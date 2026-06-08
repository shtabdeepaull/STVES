const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ['car', 'bus', 'truck', 'motorcycle', 'cng', 'microbus', 'other'],
      required: true,
    },

    brand: String,
    model: String,
    year: Number,
    color: String,

    chassisNumber: { type: String, required: true, unique: true },
    engineNumber: { type: String, required: true, unique: true },

    registrationDate: Date,
    registrationExpiry: Date,
    fitnessExpiry: Date,
    taxTokenExpiry: Date,
    insuranceExpiry: Date,

    qrCode: String,

    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'blacklisted'],
      default: 'active',
    },

    safetyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);