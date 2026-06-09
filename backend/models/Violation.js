const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      index: true,
    },

    registrationNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
      index: true,
    },

    licenseNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },

    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    violationType: {
      type: String,
      required: true,
      trim: true,
    },

    violationCode: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    location: {
      address: String,
      city: String,
      district: String,
      lat: Number,
      lng: Number,
    },

    fineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    evidence: [
      {
        type: {
          type: String,
          enum: ["image", "video", "document", "note", "text"],
          default: "note",
        },
        url: String,
        description: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "dismissed", "paid", "unpaid"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial", "waived", "pending"],
      default: "unpaid",
      index: true,
    },

    paymentDate: Date,
    paidAt: Date,

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    adminReviewNote: String,
    reviewNote: String,
    reviewedAt: Date,
    adminReviewedAt: Date,

    safetySnapshot: {
      vehicleScore: Number,
      driverScore: Number,
      riskLevel: String,
      issues: [
        {
          code: String,
          message: String,
          severity: String,
          penalty: Number,
        },
      ],
    },

    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Violation ||
  mongoose.model("Violation", violationSchema, "violations");