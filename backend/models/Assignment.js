const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    registrationNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
    },

    licenseNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "removed"],
      default: "active",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: Date,

    notes: {
      type: String,
      trim: true,
    },

    removeInfo: {
      removedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      removedAt: Date,
      reason: String,
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ vehicle: 1 });
assignmentSchema.index({ driver: 1 });
assignmentSchema.index({ license: 1 });
assignmentSchema.index({ owner: 1 });
assignmentSchema.index({ registrationNumber: 1 });
assignmentSchema.index({ licenseNumber: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema, "assignments");