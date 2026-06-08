// ============================================================
// STVES Backend - server.js
// Smart Traffic Verification and Enforcement System
// Node.js + Express + MongoDB + JWT
// ============================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

// ============================================================
// Middlewares
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Environment
// ============================================================

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "stves_secret_key_change_later";

if (!MONGO_URI) {
  console.error("MONGO_URI / MONGODB_URI missing in .env file");
  process.exit(1);
}

// ============================================================
// MongoDB Connection
// ============================================================

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });


// ============================================================
// QR Utility Helpers
// Prevents duplicate QR prefixes and parses STVES QR values
// ============================================================
const QR_TYPES = {
  VEHICLE: "STVES-VEH",
  LICENSE: "STVES-LIC",
};

const normalizeVehicleQR = (value = "") => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    return raw;
  }

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    return raw;
  }

  return `${QR_TYPES.VEHICLE}:${raw}`;
};

const normalizeLicenseQR = (value = "") => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    return raw;
  }

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    return raw;
  }

  return `${QR_TYPES.LICENSE}:${raw}`;
};

const parseSTVESQR = (value = "") => {
  const raw = decodeURIComponent(String(value || "").trim());

  if (!raw) {
    return {
      valid: false,
      type: null,
      value: "",
      message: "QR value is empty.",
    };
  }

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    const plate = raw.replace(`${QR_TYPES.VEHICLE}:`, "").trim();

    return {
      valid: Boolean(plate),
      type: "vehicle",
      value: plate,
      plate,
      raw,
      message: plate ? "Vehicle QR parsed." : "Vehicle QR value is empty.",
    };
  }

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    const licenseNumber = raw.replace(`${QR_TYPES.LICENSE}:`, "").trim();

    return {
      valid: Boolean(licenseNumber),
      type: "license",
      value: licenseNumber,
      licenseNumber,
      raw,
      message: licenseNumber
        ? "License QR parsed."
        : "License QR value is empty.",
    };
  }

  return {
    valid: false,
    type: null,
    value: raw,
    raw,
    message: "Invalid STVES QR format.",
  };
};

// ============================================================
// Helpers
// ============================================================


const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);



const normalizePlate = (value = "") => {
  return String(value).trim().toUpperCase().replace(/\s+/g, "");
};

// ============================================================
// Safety / Compliance Score Engine
// Used by vehicle and license verification
// ============================================================

const getNestedValue = (obj, path) => {
  return path.split(".").reduce((acc, key) => {
    if (!acc) return undefined;
    return acc[key];
  }, obj);
};

const getFirstValue = (obj, paths = []) => {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
};

const parseSafeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const isDateExpired = (value) => {
  const date = parseSafeDate(value);
  if (!date) return false;

  return date < new Date();
};

const daysUntilDate = (value) => {
  const date = parseSafeDate(value);
  if (!date) return null;

  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const buildIssue = ({ code, message, severity = "warning", penalty = 0 }) => {
  return {
    code,
    message,
    severity,
    penalty,
  };
};

const getRiskLevel = (score) => {
  if (score >= 85) return "Low Risk";
  if (score >= 65) return "Medium Risk";
  if (score >= 40) return "High Risk";
  return "Critical Risk";
};

const normalizeEntityStatus = (status) => {
  return String(status || "").trim().toLowerCase();
};

const countUnpaidViolationsByQuery = async (query) => {
  try {
    return await Violation.countDocuments({
      ...query,
      status: { $ne: "dismissed" },
      $or: [
        { paymentStatus: { $exists: false } },
        { paymentStatus: { $ne: "paid" } },
        { status: { $in: ["pending", "approved", "unpaid"] } },
      ],
    });
  } catch (error) {
    console.error("Unpaid violation count failed:", error.message);
    return 0;
  }
};

const calculateVehicleSafetyScore = async (vehicleInput) => {
  const vehicle =
    typeof vehicleInput.toObject === "function"
      ? vehicleInput.toObject()
      : vehicleInput;

  let score = 100;
  const issues = [];

  const status = normalizeEntityStatus(vehicle.status);

  if (status === "blacklisted") {
    return {
      score: 0,
      level: "Critical Risk",
      result: "invalid",
      isCompliant: false,
      issues: [
        buildIssue({
          code: "VEHICLE_BLACKLISTED",
          message: "Vehicle is blacklisted.",
          severity: "critical",
          penalty: 100,
        }),
      ],
    };
  }

  if (status === "suspended") {
    score -= 45;
    issues.push(
      buildIssue({
        code: "VEHICLE_SUSPENDED",
        message: "Vehicle is suspended.",
        severity: "critical",
        penalty: 45,
      })
    );
  }

  if (status && !["active", "valid"].includes(status)) {
    score -= 25;
    issues.push(
      buildIssue({
        code: "VEHICLE_NOT_ACTIVE",
        message: `Vehicle status is ${vehicle.status}.`,
        severity: "error",
        penalty: 25,
      })
    );
  }

  const expiryChecks = [
    {
      label: "Registration",
      code: "REGISTRATION_EXPIRED",
      soonCode: "REGISTRATION_EXPIRING_SOON",
      penalty: 25,
      value: getFirstValue(vehicle, [
        "registrationExpiry",
        "registrationExpireDate",
        "registrationValidUntil",
        "documents.registrationExpiry",
      ]),
    },
    {
      label: "Fitness certificate",
      code: "FITNESS_EXPIRED",
      soonCode: "FITNESS_EXPIRING_SOON",
      penalty: 25,
      value: getFirstValue(vehicle, [
        "fitnessExpiry",
        "fitnessExpireDate",
        "fitnessValidUntil",
        "documents.fitnessExpiry",
      ]),
    },
    {
      label: "Tax token",
      code: "TAX_TOKEN_EXPIRED",
      soonCode: "TAX_TOKEN_EXPIRING_SOON",
      penalty: 20,
      value: getFirstValue(vehicle, [
        "taxTokenExpiry",
        "taxTokenExpireDate",
        "taxTokenValidUntil",
        "documents.taxTokenExpiry",
      ]),
    },
    {
      label: "Route permit",
      code: "ROUTE_PERMIT_EXPIRED",
      soonCode: "ROUTE_PERMIT_EXPIRING_SOON",
      penalty: 15,
      value: getFirstValue(vehicle, [
        "routePermitExpiry",
        "routePermitExpireDate",
        "routePermitValidUntil",
        "documents.routePermitExpiry",
      ]),
    },
    {
      label: "Insurance",
      code: "INSURANCE_EXPIRED",
      soonCode: "INSURANCE_EXPIRING_SOON",
      penalty: 10,
      value: getFirstValue(vehicle, [
        "insuranceExpiry",
        "insuranceExpireDate",
        "insuranceValidUntil",
        "documents.insuranceExpiry",
      ]),
    },
  ];

  expiryChecks.forEach((item) => {
    if (!item.value) return;

    if (isDateExpired(item.value)) {
      score -= item.penalty;
      issues.push(
        buildIssue({
          code: item.code,
          message: `${item.label} has expired.`,
          severity: "error",
          penalty: item.penalty,
        })
      );
      return;
    }

    const daysLeft = daysUntilDate(item.value);

    if (daysLeft !== null && daysLeft <= 30) {
      score -= 5;
      issues.push(
        buildIssue({
          code: item.soonCode,
          message: `${item.label} will expire in ${daysLeft} day(s).`,
          severity: "warning",
          penalty: 5,
        })
      );
    }
  });

  if (vehicle._id) {
    const unpaidCount = await countUnpaidViolationsByQuery({
      vehicle: vehicle._id,
    });

    if (unpaidCount > 0) {
      const penalty = Math.min(unpaidCount * 10, 30);
      score -= penalty;

      issues.push(
        buildIssue({
          code: "UNPAID_VIOLATIONS",
          message: `${unpaidCount} unpaid violation(s) found for this vehicle.`,
          severity: unpaidCount >= 3 ? "error" : "warning",
          penalty,
        })
      );
    }
  }

  score = Math.max(0, Math.min(100, score));

  const hasCriticalIssue = issues.some((issue) => issue.severity === "critical");
  const isCompliant = score >= 70 && !hasCriticalIssue;

  return {
    score,
    level: getRiskLevel(score),
    result: isCompliant ? "valid" : "invalid",
    isCompliant,
    issues,
  };
};

const calculateLicenseSafetyScore = async (licenseInput) => {
  const license =
    typeof licenseInput.toObject === "function"
      ? licenseInput.toObject()
      : licenseInput;

  let score = 100;
  const issues = [];

  const status = normalizeEntityStatus(license.status);

  if (status === "blacklisted") {
    return {
      score: 0,
      level: "Critical Risk",
      result: "invalid",
      isCompliant: false,
      issues: [
        buildIssue({
          code: "LICENSE_BLACKLISTED",
          message: "License is blacklisted.",
          severity: "critical",
          penalty: 100,
        }),
      ],
    };
  }

  if (status === "suspended") {
    score -= 50;
    issues.push(
      buildIssue({
        code: "LICENSE_SUSPENDED",
        message: "License is suspended.",
        severity: "critical",
        penalty: 50,
      })
    );
  }

  if (status && !["active", "valid"].includes(status)) {
    score -= 30;
    issues.push(
      buildIssue({
        code: "LICENSE_NOT_ACTIVE",
        message: `License status is ${license.status}.`,
        severity: "error",
        penalty: 30,
      })
    );
  }

  const expiryDate = getFirstValue(license, [
    "expiryDate",
    "expireDate",
    "validUntil",
    "documents.expiryDate",
  ]);

  if (expiryDate) {
    if (isDateExpired(expiryDate)) {
      score -= 50;
      issues.push(
        buildIssue({
          code: "LICENSE_EXPIRED",
          message: "License has expired.",
          severity: "critical",
          penalty: 50,
        })
      );
    } else {
      const daysLeft = daysUntilDate(expiryDate);

      if (daysLeft !== null && daysLeft <= 30) {
        score -= 5;
        issues.push(
          buildIssue({
            code: "LICENSE_EXPIRING_SOON",
            message: `License will expire in ${daysLeft} day(s).`,
            severity: "warning",
            penalty: 5,
          })
        );
      }
    }
  }

  const driverId = license.driver?._id || license.driver;

  if (driverId) {
    const unpaidCount = await countUnpaidViolationsByQuery({
      driver: driverId,
    });

    if (unpaidCount > 0) {
      const penalty = Math.min(unpaidCount * 10, 30);
      score -= penalty;

      issues.push(
        buildIssue({
          code: "DRIVER_UNPAID_VIOLATIONS",
          message: `${unpaidCount} unpaid violation(s) found for this driver.`,
          severity: unpaidCount >= 3 ? "error" : "warning",
          penalty,
        })
      );
    }
  }

  score = Math.max(0, Math.min(100, score));

  const hasCriticalIssue = issues.some((issue) => issue.severity === "critical");
  const isCompliant = score >= 70 && !hasCriticalIssue;

  return {
    score,
    level: getRiskLevel(score),
    result: isCompliant ? "valid" : "invalid",
    isCompliant,
    issues,
  };
};

const normalizeText = (value = "") => {
  return String(value).trim();
};

const normalizeLicenseNumber = (value = "") => {
  return String(value)
    .replace(/^STVES-LIC:/i, "")
    .trim()
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
};

const normalizeLicenseKey = (value = "") => {
  return String(value)
    .replace(/^STVES-LIC:/i, "")
    .trim()
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/[^A-Z0-9]/g, "");
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const sanitizeUser = (user) => {
  if (!user) return null;

  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;

  return {
    ...obj,
    id: obj._id,
  };
};

const violationDefaults = {
  "Expired Driving License": {
    code: "LIC_EXP",
    fine: 5000,
    description: "Expired driving license detected during roadside inspection.",
  },
  "Expired Vehicle Registration": {
    code: "REG_EXP",
    fine: 10000,
    description:
      "Expired vehicle registration detected during roadside inspection.",
  },
  "Expired Fitness Certificate": {
    code: "FIT_EXP",
    fine: 7000,
    description:
      "Expired fitness certificate detected during roadside inspection.",
  },
  "Expired Tax Token": {
    code: "TAX_EXP",
    fine: 3000,
    description:
      "Expired Tax Token. Tax token verification failed during roadside inspection.",
  },
  "Expired Insurance": {
    code: "INS_EXP",
    fine: 5000,
    description: "Expired vehicle insurance detected during roadside inspection.",
  },
  "Driving Without License": {
    code: "NO_LIC",
    fine: 25000,
    description: "Driver was found driving without a valid license.",
  },
  "Unauthorized Driver": {
    code: "UNAUTH_DRIVER",
    fine: 15000,
    description: "Driver is not authorized for this vehicle.",
  },
  "Expired Route Permit": {
    code: "ROUTE_EXP",
    fine: 8000,
    description: "Expired route permit detected during roadside inspection.",
  },
  Overloading: {
    code: "OVERLOAD",
    fine: 10000,
    description: "Vehicle overloading violation detected.",
  },
  "Traffic Signal Violation": {
    code: "SIGNAL",
    fine: 5000,
    description: "Traffic signal violation detected.",
  },
  Speeding: {
    code: "SPEED",
    fine: 5000,
    description: "Speed limit violation detected.",
  },
  "Reckless Driving": {
    code: "RECKLESS",
    fine: 20000,
    description: "Reckless driving violation detected.",
  },
  "Illegal Parking": {
    code: "PARKING",
    fine: 2000,
    description: "Illegal parking violation detected.",
  },
  "No Helmet": {
    code: "NO_HELMET",
    fine: 1000,
    description: "No helmet violation detected.",
  },
  "No Seatbelt": {
    code: "NO_SEATBELT",
    fine: 1000,
    description: "No seatbelt violation detected.",
  },
  "Blacklisted Vehicle": {
    code: "BLACKLISTED",
    fine: 50000,
    description: "Blacklisted vehicle detected.",
  },
};

// ============================================================
// Schemas & Models
// ============================================================

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "police", "driver", "owner"],
      default: "driver",
    },
    phone: { type: String, default: "" },
    nid: { type: String, default: "" },
    badge: {
                type: String,
                trim: true,
                default: undefined,
              },
              station: {
                type: String,
                trim: true,
                default: undefined,
              },
    status: {
      type: String,
      enum: ["active", "suspended", "blacklisted"],
      default: "active",
    },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleType: { type: String, default: "car" },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, default: "" },
    chassisNumber: { type: String, default: "" },
    engineNumber: { type: String, default: "" },
    registrationDate: { type: Date },
    registrationExpiry: { type: Date },
    fitnessExpiry: { type: Date },
    taxTokenExpiry: { type: Date },
    insuranceExpiry: { type: Date },
    routePermitExpiry: { type: Date },
    qrCode: { type: String },
    status: {
      type: String,
      enum: ["active", "suspended", "blacklisted"],
      default: "active",
    },
    safetyScore: { type: Number, default: 100, min: 0, max: 100 },
  },
  { timestamps: true }
);

const licenseSchema = new mongoose.Schema(
  {
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    holderName: { type: String, required: true },
    nid: { type: String, required: true },
    dateOfBirth: { type: Date },
    licenseClass: { type: String, default: "light" },
    bloodGroup: { type: String, default: "" },
    address: { type: String, default: "" },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    issuingAuthority: { type: String, default: "BRTA" },
    qrCode: { type: String },
    status: {
      type: String,
      enum: ["valid", "expired", "suspended", "blacklisted"],
      default: "valid",
    },
  },
  { timestamps: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    assignedFrom: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const violationSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    license: { type: mongoose.Schema.Types.ObjectId, ref: "License" },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    violationType: { type: String, required: true },
    violationCode: { type: String, default: "" },
    description: { type: String, default: "" },
    fineAmount: { type: Number, required: true, default: 0 },
    location: {
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      lat: { type: Number },
      lng: { type: Number },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "dismissed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    issuedAt: { type: Date, default: Date.now },
    evidence: { type: Array, default: [] },
    adminReviewNote: { type: String, default: "" },
    adminReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

const verificationLogSchema = new mongoose.Schema(
  {
    officer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    searchType: {
      type: String,
      enum: ["plate", "license", "qr"],
      required: true,
    },
    searchValue: { type: String, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    license: { type: mongoose.Schema.Types.ObjectId, ref: "License" },
    result: {
      type: String,
      enum: ["valid", "warning", "invalid"],
      default: "valid",
    },
    issues: { type: Array, default: [] },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Vehicle =
  mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);

// IMPORTANT FIX:
// MongoDB Atlas e tomar license data "drivinglicenses" collection e ase.
// Tai model er 3rd argument diye exact collection bind kora holo.
const License =
  mongoose.models.License ||
  mongoose.model("License", licenseSchema, "drivinglicenses");

const Assignment =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema, "assignments");

const Violation =
  mongoose.models.Violation || mongoose.model("Violation", violationSchema);

const VerificationLog =
  mongoose.models.VerificationLog ||
  mongoose.model("VerificationLog", verificationLogSchema);

// ============================================================
// More Helpers after Models
// ============================================================

const formatCaseId = async () => {
  const year = new Date().getFullYear();
  const count = await Violation.countDocuments();
  let next = count + 1;

  while (true) {
    const caseId = `EC-${year}-${String(next).padStart(6, "0")}`;
    const exists = await Violation.findOne({ caseId });
    if (!exists) return caseId;
    next += 1;
  }
};

const getPopulatedViolation = async (id) => {
  return Violation.findById(id)
    .populate("vehicle")
    .populate("driver", "name email role phone nid status")
    .populate("license")
    .populate("officer", "name email role badge station")
    .populate("adminReviewedBy", "name email role");
};

const buildVehicleVerification = (vehicle, driverAuthorization = null) => {
  const issues = [];
  const today = new Date();

  const checkDate = (label, dateValue) => {
    if (!dateValue) return;
    const date = new Date(dateValue);
    if (!Number.isNaN(date.getTime()) && date < today) {
      issues.push(`${label} expired`);
    }
  };

  if (!vehicle) {
    return {
      result: "invalid",
      issues: ["Vehicle not found"],
    };
  }

  if (vehicle.status === "suspended") issues.push("Vehicle is suspended");
  if (vehicle.status === "blacklisted") issues.push("Vehicle is blacklisted");

  checkDate("Registration", vehicle.registrationExpiry);
  checkDate("Fitness certificate", vehicle.fitnessExpiry);
  checkDate("Tax token", vehicle.taxTokenExpiry);
  checkDate("Insurance", vehicle.insuranceExpiry);
  checkDate("Route permit", vehicle.routePermitExpiry);

  if (
    driverAuthorization &&
    driverAuthorization.checked &&
    !driverAuthorization.authorized
  ) {
    issues.push("Driver is not authorized for this vehicle");
  }

  return {
    result: issues.length > 0 ? "warning" : "valid",
    issues,
  };
};

const buildLicenseVerification = (license) => {
  const issues = [];
  const today = new Date();

  if (!license) {
    return {
      result: "invalid",
      issues: ["License not found"],
    };
  }

  const status = String(license.status || "").toLowerCase();

  if (status && !["valid", "active"].includes(status)) {
    issues.push(`License status is ${license.status}`);
  }

  if (license.expiryDate) {
    const expiry = new Date(license.expiryDate);
    if (!Number.isNaN(expiry.getTime()) && expiry < today) {
      issues.push("Driving license expired");
    }
  }

  return {
    result: issues.length > 0 ? "warning" : "valid",
    issues,
  };
};

// ============================================================
// Auth Middleware
// ============================================================

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Token missing.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User not found.",
      });
    }

    if (user.status !== "active") {
    return res.status(403).json({
      success: false,
      message: `Account is ${user.status}. Please contact admin.`,
    });
  }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid token.",
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission.",
      });
    }

    next();
  };
};

// ============================================================
// Health Routes
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "STVES API is running.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server healthy.",
    time: new Date(),
  });
});

// Debug route
app.get("/api/db-test", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    const [
      users,
      vehicles,
      drivinglicenses,
      assignments,
      violations,
      verificationlogs,
    ] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      License.countDocuments(),
      Assignment.countDocuments(),
      Violation.countDocuments(),
      VerificationLog.countDocuments(),
    ]);

    return res.json({
      success: true,
      database: mongoose.connection.name,
      collections: collections.map((c) => c.name),
      counts: {
        users,
        vehicles,
        drivinglicenses,
        assignments,
        violations,
        verificationlogs,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "DB test failed.",
      error: error.message,
    });
  }
});

// ============================================================
// Auth Routes
// ============================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, nid, badge, station } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanRole = role || "driver";

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userPayload = {
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: cleanRole,
      phone: phone || "",
      nid: nid || "",
      status: "active",
    };

    // Only police users should store badge/station.
    // Owner/Admin/Driver er jonno blank badge/station save korbo na.
    if (cleanRole === "police") {
      if (badge) userPayload.badge = badge;
      if (station) userPayload.station = station;
    }

    const user = await User.create(userPayload);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact admin.`,
      });
    }

    // IMPORTANT: user.save() use korbo na.
    // Karon old blank badge/station unique index thakle login crash korte pare.
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    const token = generateToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        ...safeUser,
        id: safeUser._id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
    });
  }
});

app.get("/api/auth/me", protect, async (req, res) => {
  return res.json({
    success: true,
    user: sanitizeUser(req.user),
  });
});

// ============================================================
// Admin / Users Routes
// ============================================================

app.get("/api/admin/users", protect, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
});

app.get("/api/users", protect, requireRole("admin", "owner"), async (req, res) => {
  try {
    const filter =
      req.user.role === "owner" ? { role: "driver", status: "active" } : {};

    const users = await User.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
});

const updateUserStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!["active", "suspended", "blacklisted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      message: "User status updated successfully.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
      error: error.message,
    });
  }
};

app.patch(
  "/api/admin/users/:id/status",
  protect,
  requireRole("admin"),
  updateUserStatusHandler
);

app.patch(
  "/api/users/:id/status",
  protect,
  requireRole("admin"),
  updateUserStatusHandler
);

// ============================================================
// Vehicle Routes
// ============================================================

app.post("/api/vehicles", protect, requireRole("admin", "owner"), async (req, res) => {
  try {
    const {
      registrationNumber,
      owner,
      vehicleType,
      brand,
      model,
      year,
      color,
      chassisNumber,
      engineNumber,
      registrationDate,
      registrationExpiry,
      fitnessExpiry,
      taxTokenExpiry,
      insuranceExpiry,
      routePermitExpiry,
      status,
    } = req.body;

    const finalOwner = req.user.role === "owner" ? req.user._id : owner;

    if (!registrationNumber || !finalOwner || !brand || !model || !year) {
      return res.status(400).json({
        success: false,
        message:
          "registrationNumber, owner, brand, model, and year are required.",
      });
    }

    if (!isValidObjectId(finalOwner)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner ID.",
      });
    }

    const normalizedRegistration = normalizePlate(registrationNumber);

    const exists = await Vehicle.findOne({
      registrationNumber: normalizedRegistration,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Vehicle already exists.",
      });
    }

    const vehicle = await Vehicle.create({
      registrationNumber: normalizedRegistration,
      owner: finalOwner,
      vehicleType: vehicleType || "car",
      brand,
      model,
      year,
      color,
      chassisNumber,
      engineNumber,
      registrationDate,
      registrationExpiry,
      fitnessExpiry,
      taxTokenExpiry,
      insuranceExpiry,
      routePermitExpiry,
      status: status || "active",
      safetyScore: 100,
      qrCode: normalizeVehicleQR(registrationNumber),
    });

    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "owner",
      "name email role phone nid status"
    );

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully.",
      vehicle: populatedVehicle,
    });
  } catch (error) {
    console.error("Vehicle registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Vehicle registration failed.",
      error: error.message,
    });
  }
});


app.get("/api/vehicles", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const { status, owner, q } = req.query;

    const query = {};

    if (status && ["active", "suspended", "blacklisted"].includes(status)) {
      query.status = status;
    }

    if (owner && isValidObjectId(owner)) {
      query.owner = owner;
    }

    if (q) {
      const search = normalizePlate(q);
      query.$or = [
        { registrationNumber: { $regex: search, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { model: { $regex: q, $options: "i" } },
      ];
    }

    const vehicles = await Vehicle.find(query)
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Vehicles fetched successfully.",
      data: vehicles,
      vehicles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicles.",
      error: error.message,
    });
  }
});

app.get("/api/vehicles/verify/:registrationNumber", protect, async (req, res) => {
  try {
    const rawPlate = decodeURIComponent(req.params.registrationNumber || "");
    const plate = normalizePlate(rawPlate);
    const driverId =
      req.query.driverId || req.query.driver || req.query.driverid || null;

    const vehicle = await Vehicle.findOne({ registrationNumber: plate }).populate(
      "owner",
      "name email role phone nid status"
    );

    if (!vehicle) {
      await VerificationLog.create({
        officer: req.user._id,
        searchType: "plate",
        searchValue: plate,
        result: "invalid",
        issues: ["Vehicle not found"],
      });

      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
        verification: {
          result: "invalid",
          issues: ["Vehicle not found"],
        },
      });
    }

    const activeAssignments = await Assignment.find({
      vehicle: vehicle._id,
      status: "active",
    })
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const authorizedDrivers = activeAssignments
      .filter((item) => item.driver)
      .map((item) => item.driver);

    let driverAuthorization = null;
    let driverForLog = null;

    if (driverId) {
      const matched = authorizedDrivers.find(
        (driver) => String(driver._id) === String(driverId)
      );

      driverAuthorization = {
        checked: true,
        authorized: Boolean(matched),
        message: matched
          ? "Driver is authorized for this vehicle."
          : "Driver is not authorized for this vehicle.",
        driver: matched || null,
      };

      driverForLog = matched ? matched._id : driverId;
    }

    const baseVerification = buildVehicleVerification(
  vehicle,
  driverAuthorization
);

const compliance = await calculateVehicleSafetyScore(vehicle);

const vehicleData =
  typeof vehicle.toObject === "function" ? vehicle.toObject() : vehicle;

vehicleData.safetyScore = compliance.score;
vehicleData.complianceScore = compliance.score;
vehicleData.riskLevel = compliance.level;

const baseIssues = Array.isArray(baseVerification.issues)
  ? baseVerification.issues
  : [];

const complianceIssues = Array.isArray(compliance.issues)
  ? compliance.issues
  : [];

const mergedIssues = [
  ...complianceIssues,
  ...baseIssues.map((issue) =>
    typeof issue === "string"
      ? {
          code: "BASE_VERIFICATION_ISSUE",
          message: issue,
          severity: "warning",
          penalty: 0,
        }
      : issue
  ),
];

const isBaseValid = baseVerification.result === "valid";

const verification = {
  ...baseVerification,
  result: compliance.isCompliant && isBaseValid ? "valid" : "invalid",
  isCompliant: compliance.isCompliant && isBaseValid,
  score: compliance.score,
  safetyScore: compliance.score,
  complianceScore: compliance.score,
  riskLevel: compliance.level,
  issues: mergedIssues,
};

await VerificationLog.create({
  officer: req.user._id,
  searchType: "plate",
  searchValue: plate,
  vehicle: vehicle._id,
  driver:
    driverForLog && isValidObjectId(driverForLog) ? driverForLog : undefined,
  result: verification.result,
  issues: verification.issues.map((issue) =>
    typeof issue === "string" ? issue : issue.message
  ),
});

return res.json({
  success: true,
  message: verification.isCompliant
    ? "Vehicle verified successfully."
    : "Vehicle verified with compliance issues.",
  vehicle: vehicleData,
  owner: vehicleData.owner || null,
  authorizedDrivers,
  driverAuthorization,
  verification,
  safetyScore: compliance.score,
  complianceScore: compliance.score,
  riskLevel: compliance.level,
  issues: mergedIssues,
});
  } catch (error) {
    console.error("Vehicle verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "Vehicle verification failed.",
      error: error.message,
    });
  }
});

app.get("/api/vehicles/my", protect, requireRole("owner"), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id })
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const vehiclesWithScore = await Promise.all(
      vehicles.map(async (vehicle) => {
        const compliance = await calculateVehicleSafetyScore(vehicle);

        const vehicleData =
          typeof vehicle.toObject === "function"
            ? vehicle.toObject()
            : vehicle;

        return {
          ...vehicleData,
          safetyScore: compliance.score,
          complianceScore: compliance.score,
          riskLevel: compliance.level,
          verification: {
            result: compliance.result,
            isCompliant: compliance.isCompliant,
            score: compliance.score,
            safetyScore: compliance.score,
            complianceScore: compliance.score,
            riskLevel: compliance.level,
            issues: compliance.issues,
          },
          issues: compliance.issues,
        };
      })
    );

    return res.json({
      success: true,
      message: "My vehicles fetched successfully.",
      data: vehiclesWithScore,
      vehicles: vehiclesWithScore,
    });
  } catch (error) {
    console.error("Fetch my vehicles failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch my vehicles.",
      error: error.message,
    });
  }
});
app.patch("/api/vehicles/:id/status", protect, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID.",
      });
    }

    if (!["active", "suspended", "blacklisted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle status.",
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("owner", "name email role phone nid status");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    return res.json({
      success: true,
      message: "Vehicle status updated successfully.",
      vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update vehicle status.",
      error: error.message,
    });
  }
});

// ============================================================
// License Routes
// ============================================================

app.post("/api/licenses", protect, requireRole("admin"), async (req, res) => {
  try {
    const {
      licenseNumber,
      driver,
      holderName,
      nid,
      dateOfBirth,
      licenseClass,
      bloodGroup,
      address,
      issueDate,
      expiryDate,
      issuingAuthority,
      status,
    } = req.body;

    if (!licenseNumber || !driver || !holderName || !nid) {
      return res.status(400).json({
        success: false,
        message: "licenseNumber, driver, holderName, and nid are required.",
      });
    }

    if (!isValidObjectId(driver)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID.",
      });
    }

    const normalized = normalizeLicenseNumber(licenseNumber);

    const exists = await License.findOne({ licenseNumber: normalized });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "License already exists.",
      });
    }

    const license = await License.create({
      licenseNumber: normalized,
      driver,
      holderName,
      nid,
      dateOfBirth,
      licenseClass: licenseClass || "light",
      bloodGroup: bloodGroup || "",
      address: address || "",
      issueDate,
      expiryDate,
      issuingAuthority: issuingAuthority || "BRTA",
      status: status || "valid",
      qrCode: `STVES-LIC:${normalized}`,
    });

    const populatedLicense = await License.findById(license._id).populate(
      "driver",
      "name email role phone nid status"
    );

    return res.status(201).json({
      success: true,
      message: "License registered successfully.",
      license: populatedLicense,
    });
  } catch (error) {
    console.error("License registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "License registration failed.",
      error: error.message,
    });
  }
});

app.get("/api/licenses", protect, async (req, res) => {
  try {
    const licenses = await License.find()
      .populate("driver", "name email role phone nid status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      licenses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch licenses.",
      error: error.message,
    });
  }
});


app.get("/api/licenses/my", protect, requireRole("driver"), async (req, res) => {
  try {
    const licenses = await License.find({ driver: req.user._id })
      .populate("driver", "name email role phone nid status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "My licenses fetched successfully.",
      data: licenses,
      licenses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my licenses.",
      error: error.message,
    });
  }
});

app.get("/api/licenses/verify/:licenseNumber", protect, async (req, res) => {
  try {
    const rawLicenseNumber = decodeURIComponent(
      req.params.licenseNumber || ""
    ).trim();

    const searchKey = normalizeLicenseKey(rawLicenseNumber);

    if (!searchKey) {
      return res.status(400).json({
        success: false,
        message: "License number is required.",
        verification: {
          result: "invalid",
          issues: ["License number is required"],
        },
      });
    }

    const allLicenses = await License.find({})
      .populate("driver", "name email role phone nid status")
      .lean();

    const license = allLicenses.find((item) => {
      return (
        normalizeLicenseKey(item.licenseNumber) === searchKey ||
        normalizeLicenseKey(item.qrCode) === searchKey
      );
    });

    if (!license) {
      await VerificationLog.create({
        officer: req.user._id,
        searchType: "license",
        searchValue: rawLicenseNumber,
        result: "invalid",
        issues: ["License not found"],
      });

      return res.status(404).json({
        success: false,
        message: "License not found.",
        searchedValue: rawLicenseNumber,
        verification: {
          result: "invalid",
          issues: ["License not found"],
        },
      });
    }

    const baseVerification = buildLicenseVerification(license);
    const compliance = await calculateLicenseSafetyScore(license);

    const licenseData = {
      ...license,
      safetyScore: compliance.score,
      complianceScore: compliance.score,
      riskLevel: compliance.level,
    };

    const driverId = license.driver?._id || license.driver;

    const activeAssignments = driverId
      ? await Assignment.find({
          driver: driverId,
          status: "active",
        })
          .populate("vehicle")
          .lean()
      : [];

    const authorizedVehicles = activeAssignments
      .map((assignment) => assignment.vehicle)
      .filter(Boolean);

    const baseIssues = Array.isArray(baseVerification.issues)
      ? baseVerification.issues
      : [];

    const complianceIssues = Array.isArray(compliance.issues)
      ? compliance.issues
      : [];

    const mergedIssues = [
      ...complianceIssues,
      ...baseIssues.map((issue) =>
        typeof issue === "string"
          ? {
              code: "BASE_LICENSE_VERIFICATION_ISSUE",
              message: issue,
              severity: "warning",
              penalty: 0,
            }
          : issue
      ),
    ];

    const isBaseValid = baseVerification.result === "valid";

    const verification = {
      ...baseVerification,
      result: compliance.isCompliant && isBaseValid ? "valid" : "invalid",
      isCompliant: compliance.isCompliant && isBaseValid,
      score: compliance.score,
      safetyScore: compliance.score,
      complianceScore: compliance.score,
      riskLevel: compliance.level,
      issues: mergedIssues,
    };

    await VerificationLog.create({
      officer: req.user._id,
      searchType: "license",
      searchValue: license.licenseNumber,
      driver: driverId && isValidObjectId(driverId) ? driverId : undefined,
      license: license._id,
      result: verification.result,
      issues: verification.issues.map((issue) =>
        typeof issue === "string" ? issue : issue.message
      ),
    });

    return res.status(200).json({
      success: true,
      message: verification.isCompliant
        ? "License verified successfully."
        : "License verified with compliance issues.",
      license: licenseData,
      driver: licenseData.driver || null,
      authorizedVehicles,
      verification,
      safetyScore: compliance.score,
      complianceScore: compliance.score,
      riskLevel: compliance.level,
      issues: mergedIssues,
    });
  } catch (error) {
    console.error("License verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "License verification failed.",
      error: error.message,
    });
  }
});
// ============================================================
// Assignment Routes
// ============================================================

// ============================================================
// Assignment Routes
// ============================================================

app.post("/api/assignments", protect, requireRole("admin", "owner"), async (req, res) => {
  try {
    const { vehicle, driver } = req.body;

    if (!vehicle || !driver) {
      return res.status(400).json({
        success: false,
        message: "vehicle and driver are required.",
      });
    }

    if (!isValidObjectId(vehicle) || !isValidObjectId(driver)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle or driver ID.",
      });
    }

    const vehicleDoc = await Vehicle.findById(vehicle);

    if (!vehicleDoc) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    // Owner sudhu nijer vehicle e driver assign korte parbe
    if (
      req.user.role === "owner" &&
      String(vehicleDoc.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can assign drivers only to your own vehicles.",
      });
    }

    const driverDoc = await User.findById(driver);

    if (!driverDoc) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    if (driverDoc.role !== "driver" || driverDoc.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active driver accounts can be assigned.",
      });
    }

    const existing = await Assignment.findOne({
      vehicle,
      driver,
      status: "active",
    });

    if (existing) {
      const populatedExisting = await Assignment.findById(existing._id)
        .populate("vehicle")
        .populate("driver", "name email role phone nid status")
        .populate("owner", "name email role phone nid status");

      const existingDriverId =
        populatedExisting.driver?._id || populatedExisting.driver;

      const existingDriverLicense = existingDriverId
        ? await License.findOne({ driver: existingDriverId }).select(
            "licenseNumber holderName licenseClass status expiryDate qrCode"
          )
        : null;

      const responseExisting = {
        ...populatedExisting.toObject(),
        license: existingDriverLicense,
        driverLicense: existingDriverLicense,
      };

      return res.status(200).json({
        success: true,
        message: "Assignment already active.",
        assignment: responseExisting,
      });
    }

    const assignment = await Assignment.create({
      vehicle,
      driver,
      owner: vehicleDoc.owner,
      status: "active",
      assignedFrom: new Date(),
    });

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status");

    const populatedDriverId =
      populatedAssignment.driver?._id || populatedAssignment.driver;

    const driverLicense = populatedDriverId
      ? await License.findOne({ driver: populatedDriverId }).select(
          "licenseNumber holderName licenseClass status expiryDate qrCode"
        )
      : null;

    const responseAssignment = {
      ...populatedAssignment.toObject(),
      license: driverLicense,
      driverLicense,
    };

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      assignment: responseAssignment,
    });
  } catch (error) {
    console.error("Assignment creation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Assignment creation failed.",
      error: error.message,
    });
  }
});


app.get("/api/assignments", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const { status = "active", vehicle, driver, owner } = req.query;

    const query = {};

    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    if (vehicle && isValidObjectId(vehicle)) {
      query.vehicle = vehicle;
    }

    if (driver && isValidObjectId(driver)) {
      query.driver = driver;
    }

    if (owner && isValidObjectId(owner)) {
      query.owner = owner;
    }

    const assignments = await Assignment.find(query)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const obj = assignment.toObject();
        const driverId = obj.driver?._id || obj.driver;

        const license = driverId
          ? await License.findOne({ driver: driverId }).select(
              "licenseNumber holderName licenseClass status expiryDate qrCode"
            )
          : null;

        return {
          ...obj,
          license,
          driverLicense: license,
        };
      })
    );

    return res.json({
      success: true,
      message: "Assignments fetched successfully.",
      data: enrichedAssignments,
      assignments: enrichedAssignments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assignments.",
      error: error.message,
    });
  }
});

app.get("/api/assignments/my", protect, requireRole("owner"), async (req, res) => {
  try {
    const ownerVehicles = await Vehicle.find({ owner: req.user._id }).select("_id");

    const vehicleIds = ownerVehicles.map((v) => v._id);

    const assignments = await Assignment.find({
      vehicle: { $in: vehicleIds },
      status: "active",
    })
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const obj = assignment.toObject();

        const driverId = obj.driver?._id || obj.driver;

        const license = driverId
          ? await License.findOne({ driver: driverId }).select(
              "licenseNumber holderName licenseClass status expiryDate qrCode"
            )
          : null;

        return {
          ...obj,
          license,
          driverLicense: license,
        };
      })
    );

    return res.json({
      success: true,
      assignments: enrichedAssignments,
      assignment: enrichedAssignments,
    });
  } catch (error) {
    console.error("Get owner assignments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner assignments.",
      error: error.message,
    });
  }
});

app.put("/api/assignments/:id/remove", protect, requireRole("admin", "owner"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    // Owner sudhu nijer assignment remove korte parbe
    if (
      req.user.role === "owner" &&
      String(assignment.owner) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can remove assignments only from your own vehicles.",
      });
    }

    assignment.status = "inactive";
    await assignment.save();

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status");

    return res.json({
      success: true,
      message: "Driver removed successfully.",
      assignment: populatedAssignment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove assignment.",
      error: error.message,
    });
  }
});

app.get("/api/assignments/check/:vehicleId/:driverId", protect, async (req, res) => {
  try {
    const { vehicleId, driverId } = req.params;

    if (!isValidObjectId(vehicleId) || !isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle or driver ID.",
      });
    }

    const assignments = await Assignment.find({
      vehicle: vehicleId,
      status: "active",
    })
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const authorizedDrivers = assignments
      .filter((item) => item.driver)
      .map((item) => item.driver);

    const matchedDriver = authorizedDrivers.find(
      (driver) => String(driver._id) === String(driverId)
    );

    const authorized = Boolean(matchedDriver);

    return res.json({
      success: true,
      message: authorized
        ? "Driver is authorized for this vehicle."
        : "Driver is not authorized for this vehicle.",
      checked: true,
      authorized,
      vehicleId,
      driverId,
      driverAuthorization: {
        checked: true,
        authorized,
        message: authorized
          ? "Driver is authorized for this vehicle."
          : "Driver is not authorized for this vehicle.",
        driver: matchedDriver || null,
      },
      assignments,
      authorizedDrivers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Assignment authorization check failed.",
      error: error.message,
    });
  }
});

app.get("/api/assignments/check/:vehicleId", protect, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!isValidObjectId(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID.",
      });
    }

    const assignments = await Assignment.find({
      vehicle: vehicleId,
      status: "active",
    })
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    const authorizedDrivers = assignments
      .filter((item) => item.driver)
      .map((item) => item.driver);

    return res.status(200).json({
      success: true,
      message:
        assignments.length > 0
          ? "Active assignment found."
          : "No active assignment found for this vehicle.",
      vehicleId,
      assignments,
      authorizedDrivers,
    });
  } catch (error) {
    console.error("Assignment check failed:", error);
    return res.status(500).json({
      success: false,
      message: "Assignment check failed.",
      error: error.message,
    });
  }
});

app.get("/api/assignments/driver/:driverId", protect, async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID.",
      });
    }

    const assignments = await Assignment.find({
      driver: driverId,
      status: "active",
    })
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("owner", "name email role phone nid status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      assignments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch driver assignments.",
      error: error.message,
    });
  }
});

// ============================================================
// Violation / E-Challan Routes
// ============================================================

app.post("/api/violations", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    let {
      vehicle,
      registrationNumber,
      plateNumber,
      driver,
      license,
      violationType,
      violationTypes,
      violationCode,
      description,
      fineAmount,
      location,
      evidence,
    } = req.body;

    let vehicleDoc = null;

    if (vehicle && isValidObjectId(vehicle)) {
      vehicleDoc = await Vehicle.findById(vehicle);
    } else {
      const plate = registrationNumber || plateNumber || vehicle;
      if (plate) {
        vehicleDoc = await Vehicle.findOne({
          registrationNumber: normalizePlate(plate),
        });
      }
    }

    if (!vehicleDoc) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    if (!driver) {
      const activeAssignment = await Assignment.findOne({
        vehicle: vehicleDoc._id,
        status: "active",
      }).sort({ createdAt: -1 });

      if (activeAssignment) driver = activeAssignment.driver;
    }

    if (!license && driver && isValidObjectId(driver)) {
      const licenseDoc = await License.findOne({ driver }).sort({
        createdAt: -1,
      });

      if (licenseDoc) license = licenseDoc._id;
    }

    if (Array.isArray(violationTypes) && violationTypes.length > 0) {
      violationType = violationTypes.join(", ");
    }

    if (!violationType) {
      return res.status(400).json({
        success: false,
        message: "violationType is required.",
      });
    }

    const defaults = violationDefaults[violationType] || {};

    if (!violationCode) violationCode = defaults.code || "V-000";
    if (!description) {
      description =
        defaults.description ||
        `${violationType} detected during roadside inspection.`;
    }
    if (!fineAmount) fineAmount = defaults.fine || 0;

    const caseId = await formatCaseId();

    const violation = await Violation.create({
      caseId,
      vehicle: vehicleDoc._id,
      driver: driver && isValidObjectId(driver) ? driver : undefined,
      license: license && isValidObjectId(license) ? license : undefined,
      officer: req.user._id,
      violationType,
      violationCode,
      description,
      fineAmount: Number(fineAmount),
      location: {
        address: location?.address || location || "",
        city: location?.city || "",
        lat: location?.lat,
        lng: location?.lng,
      },
      status: "pending",
      paymentStatus: "unpaid",
      issuedAt: new Date(),
      evidence: evidence || [],
    });

    const populatedViolation = await getPopulatedViolation(violation._id);

    return res.status(201).json({
      success: true,
      message: "E-Challan created successfully.",
      violation: populatedViolation,
    });
  } catch (error) {
    console.error("Violation creation failed:", error);
    return res.status(500).json({
      success: false,
      message: "E-Challan creation failed.",
      error: error.message,
    });
  }
});

app.get("/api/violations", protect, async (req, res) => {
  try {
    const { status, paymentStatus, officer } = req.query;
    const query = {};

    if (status && ["pending", "approved", "dismissed"].includes(status)) {
      query.status = status;
    }

    if (paymentStatus && ["paid", "unpaid"].includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (officer && isValidObjectId(officer)) {
      query.officer = officer;
    }

    const violations = await Violation.find(query)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .populate("officer", "name email role badge station")
      .populate("adminReviewedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      violations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch violations.",
      error: error.message,
    });
  }
});

app.get("/api/violations/my", protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "admin") {
      query = {};
    } else if (req.user.role === "police") {
      query = { officer: req.user._id };
    } else if (req.user.role === "driver") {
      query = { driver: req.user._id };
    } else if (req.user.role === "owner") {
      const ownerVehicles = await Vehicle.find({ owner: req.user._id }).select("_id");
      const vehicleIds = ownerVehicles.map((vehicle) => vehicle._id);
      query = { vehicle: { $in: vehicleIds } };
    } else {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission.",
      });
    }

    const violations = await Violation.find(query)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .populate("officer", "name email role badge station")
      .populate("adminReviewedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "My violations fetched successfully.",
      data: violations,
      violations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my violations.",
      error: error.message,
    });
  }
});


app.get("/api/violations/vehicle/:vehicleId", protect, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!isValidObjectId(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID.",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    let query = { vehicle: vehicleId };

    if (req.user.role === "owner") {
      if (String(vehicle.owner) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You can view violations only for your own vehicles.",
        });
      }
    } else if (req.user.role === "driver") {
      query.driver = req.user._id;
    } else if (!["admin", "police"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission.",
      });
    }

    const violations = await Violation.find(query)
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .populate("officer", "name email role badge station")
      .populate("adminReviewedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Vehicle violations fetched successfully.",
      data: violations,
      violations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vehicle violations.",
      error: error.message,
    });
  }
});

app.get("/api/violations/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid violation ID.",
      });
    }

    const violation = await getPopulatedViolation(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: "Violation not found.",
      });
    }

    return res.json({
      success: true,
      violation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch violation.",
      error: error.message,
    });
  }
});

app.put("/api/violations/:id/review", protect, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReviewNote } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid violation ID.",
      });
    }

    if (!["approved", "dismissed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or dismissed.",
      });
    }

    const violation = await Violation.findByIdAndUpdate(
      id,
      {
        status,
        adminReviewNote: adminReviewNote || "",
        adminReviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: "Violation not found.",
      });
    }

    const populatedViolation = await getPopulatedViolation(violation._id);

    return res.json({
      success: true,
      message: `Case ${status} successfully.`,
      violation: populatedViolation,
    });
  } catch (error) {
    console.error("Case review failed:", error);
    return res.status(500).json({
      success: false,
      message: "Case review failed.",
      error: error.message,
    });
  }
});

app.put("/api/violations/:id/payment", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid violation ID.",
      });
    }

    if (!["paid", "unpaid"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "paymentStatus must be paid or unpaid.",
      });
    }

    const violation = await Violation.findByIdAndUpdate(
      id,
      {
        paymentStatus,
        paymentDate: paymentStatus === "paid" ? new Date() : null,
      },
      { new: true }
    );

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: "Violation not found.",
      });
    }

    const populatedViolation = await getPopulatedViolation(violation._id);

    return res.json({
      success: true,
      message: "Payment status updated successfully.",
      violation: populatedViolation,
    });
  } catch (error) {
    console.error("Payment update failed:", error);
    return res.status(500).json({
      success: false,
      message: "Payment update failed.",
      error: error.message,
    });
  }
});

// ============================================================
// QR Verification Route
// ============================================================

app.get("/api/qr/verify/:qrValue", async (req, res) => {
  try {
    const parsed = parseSTVESQR(req.params.qrValue);

    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        message: parsed.message || "Invalid QR code.",
      });
    }

    // ========================================================
    // Vehicle QR Verification
    // ========================================================
    if (parsed.type === "vehicle") {
      const registrationNumber = normalizePlate(parsed.value);

      const vehicle = await Vehicle.findOne({ registrationNumber })
        .populate("owner", "name email role phone nid status")
        .lean();

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found.",
          type: "vehicle",
          data: {
            valid: false,
            registrationNumber,
            safetyScore: 0,
            complianceScore: 0,
            riskLevel: "Critical Risk",
            issues: [
              {
                code: "VEHICLE_NOT_FOUND",
                message: "Vehicle not found.",
                severity: "critical",
                penalty: 100,
              },
            ],
          },
        });
      }

      const compliance = await calculateVehicleSafetyScore(vehicle);

      return res.json({
        success: true,
        message: "Vehicle QR verified successfully.",
        type: "vehicle",
        data: {
          valid: compliance.isCompliant,
          registrationNumber: vehicle.registrationNumber,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          status: vehicle.status,
          safetyScore: compliance.score,
          complianceScore: compliance.score,
          riskLevel: compliance.level,
          issues: compliance.issues,
          qrCode: normalizeVehicleQR(vehicle.qrCode || vehicle.registrationNumber),
        },
      });
    }

    // ========================================================
    // License QR Verification
    // ========================================================
    if (parsed.type === "license") {
      const searchKey = normalizeLicenseKey(parsed.value);

      const allLicenses = await License.find({})
        .populate("driver", "name email role phone nid status")
        .lean();

      const license = allLicenses.find((item) => {
        return (
          normalizeLicenseKey(item.licenseNumber) === searchKey ||
          normalizeLicenseKey(item.qrCode) === searchKey
        );
      });

      if (!license) {
        return res.status(404).json({
          success: false,
          message: "License not found.",
          type: "license",
          data: {
            valid: false,
            licenseNumber: parsed.value,
            safetyScore: 0,
            complianceScore: 0,
            riskLevel: "Critical Risk",
            issues: [
              {
                code: "LICENSE_NOT_FOUND",
                message: "License not found.",
                severity: "critical",
                penalty: 100,
              },
            ],
          },
        });
      }

      const compliance = await calculateLicenseSafetyScore(license);

      const statusValue = String(license.status || "").toLowerCase();
      const statusValid = ["active", "valid"].includes(statusValue);

      return res.json({
        success: true,
        message: "License QR verified successfully.",
        type: "license",
        data: {
          valid: compliance.isCompliant && statusValid,
          licenseNumber: license.licenseNumber,
          holderName:
            license.holderName ||
            license.name ||
            license.driver?.name ||
            "Hidden",
          licenseClass: license.licenseClass || license.licenseType,
          status: license.status,
          expiryDate: license.expiryDate,
          safetyScore: compliance.score,
          complianceScore: compliance.score,
          riskLevel: compliance.level,
          issues: compliance.issues,
          qrCode: normalizeLicenseQR(license.qrCode || license.licenseNumber),
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unsupported QR type.",
    });
  } catch (error) {
    console.error("QR verification failed:", error);

    return res.status(500).json({
      success: false,
      message: "QR verification failed.",
      error: error.message,
    });
  }
});

// ============================================================
// Verification Logs
// ============================================================

app.get("/api/verification-logs/my", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { officer: req.user._id };

    const logs = await VerificationLog.find(query)
      .populate("officer", "name email role badge station")
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "My verification logs fetched successfully.",
      data: logs,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my verification logs.",
      error: error.message,
    });
  }
});


app.get("/api/verification-logs", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const logs = await VerificationLog.find()
      .populate("officer", "name email role badge station")
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification logs.",
      error: error.message,
    });
  }
});

// ============================================================
// Analytics
// ============================================================

app.get("/api/analytics/logs", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const logs = await VerificationLog.find()
      .populate("officer", "name email role badge station")
      .populate("vehicle")
      .populate("driver", "name email role phone nid status")
      .populate("license")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      message: "Activity logs fetched successfully.",
      data: logs,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs.",
      error: error.message,
    });
  }
});


app.get("/api/analytics/stats", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const [
      totalUsers,
      totalVehicles,
      totalLicenses,
      totalViolations,
      pendingCases,
      approvedCases,
      dismissedCases,
      paidCases,
      unpaidCases,
      activeAssignments,
      totalVerificationLogs,
      fineAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      License.countDocuments(),
      Violation.countDocuments(),
      Violation.countDocuments({ status: "pending" }),
      Violation.countDocuments({ status: "approved" }),
      Violation.countDocuments({ status: "dismissed" }),
      Violation.countDocuments({ paymentStatus: "paid" }),
      Violation.countDocuments({ paymentStatus: "unpaid" }),
      Assignment.countDocuments({ status: "active" }),
      VerificationLog.countDocuments(),
      Violation.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$fineAmount" },
          },
        },
      ]),
    ]);

    const totalFines = fineAgg.length > 0 ? fineAgg[0].total : 0;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalVehicles,
        totalLicenses,
        totalViolations,
        pendingCases,
        approvedCases,
        dismissedCases,
        paidCases,
        unpaidCases,
        activeAssignments,
        totalVerificationLogs,
        totalFines,
      },
    });
  } catch (error) {
    console.error("Analytics failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics.",
      error: error.message,
    });
  }
});

app.get("/api/analytics/details", protect, requireRole("admin", "police"), async (req, res) => {
  try {
    const [violationsByType, vehicleStatus, userRoles] = await Promise.all([
      Violation.aggregate([
        {
          $group: {
            _id: "$violationType",
            count: { $sum: 1 },
            totalFine: { $sum: "$fineAmount" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Vehicle.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      details: {
        violationsByType,
        vehicleStatus,
        userRoles,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics details.",
      error: error.message,
    });
  }
});

// ============================================================
// Update Driving License Status - Admin Only
// PATCH /api/licenses/:id/status
// ============================================================
app.patch("/api/licenses/:id/status", protect, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["valid", "expired", "suspended", "blacklisted"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid license ID.",
      });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: valid, expired, suspended, blacklisted.",
      });
    }

    const license = await License.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate("driver", "name email role phone nid status");

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "License status updated successfully.",
      license,
    });
  } catch (error) {
    console.error("Update license status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update license status.",
      error: error.message,
    });
  }
});

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ============================================================
// Server Start
// ============================================================

app.listen(PORT, () => {
  console.log(`STVES server running on port ${PORT}`);
});