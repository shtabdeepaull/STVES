const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "police", "driver", "owner"],
      default: "driver",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "blacklisted"],
      default: "active",
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    nid: {
      type: String,
      trim: true,
      sparse: true,
    },

    badge: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    station: {
      type: String,
      trim: true,
    },

    rank: {
      type: String,
      trim: true,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema, "users");