const mongoose = require("mongoose");

const Violation = require("../models/Violation");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");

const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");

const AppError = require("../utils/AppError");
const generateCaseId = require("../utils/generateCaseId");
const { normalizePlate, normalizeLicense } = require("../utils/qr");

const brtaMockService = require("./brtaMock.service");
const brtaLicenseService = require("./brtaLicense.service");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const buildViolationQueryForRole = async (user) => {
  if (user.role === "admin") {
    return {};
  }

  if (user.role === "police") {
    return {
      officer: user._id,
    };
  }

  if (user.role === "driver") {
    const appLicenses = await DrivingLicense.find({
      driver: user._id,
    }).lean();

    const licenseIds = appLicenses.map((item) => item._id);
    const licenseNumbers = appLicenses
      .map((item) => item.licenseNumber)
      .filter(Boolean)
      .map(normalizeLicense);

    if (user.nid) {
      const brtaDriver = await BrtaDriver.findOne({
        nid: user.nid,
      }).lean();

      if (brtaDriver?.brtaDriverId) {
        const brtaLicenses = await BrtaDrivingLicense.find({
          brtaDriverId: brtaDriver.brtaDriverId,
        }).lean();

        for (const item of brtaLicenses) {
          if (item.licenseNumber) {
            licenseNumbers.push(normalizeLicense(item.licenseNumber));
          }
        }
      }
    }

    return {
      $or: [
        { driver: user._id },
        { license: { $in: licenseIds } },
        { licenseNumber: { $in: licenseNumbers } },
      ],
    };
  }

  if (user.role === "owner") {
    const appVehicles = await Vehicle.find({
      owner: user._id,
    }).lean();

    const vehicleIds = appVehicles.map((item) => item._id);
    const registrationNumbers = appVehicles
      .map((item) => item.registrationNumber)
      .filter(Boolean)
      .map(normalizePlate);

    if (user.nid) {
      const brtaOwner = await BrtaOwner.findOne({
        nid: user.nid,
      }).lean();

      if (brtaOwner?.brtaOwnerId) {
        const brtaVehicles = await BrtaVehicle.find({
          brtaOwnerId: brtaOwner.brtaOwnerId,
        }).lean();

        for (const item of brtaVehicles) {
          if (item.registrationNumber) {
            registrationNumbers.push(normalizePlate(item.registrationNumber));
          }
        }
      }
    }

    return {
      $or: [
        { vehicle: { $in: vehicleIds } },
        { registrationNumber: { $in: registrationNumbers } },
      ],
    };
  }

  return {
    _id: null,
  };
};

const normalizeStatusUpdate = (status) => {
  const value = String(status || "").toLowerCase();

  const allowed = ["pending", "approved", "dismissed", "paid", "unpaid"];

  if (!allowed.includes(value)) {
    throw new AppError(
      "Invalid status. Allowed: pending, approved, dismissed, paid, unpaid.",
      400
    );
  }

  return value;
};

const createViolation = async (payload, officer) => {
  const {
    vehicle,
    registrationNumber,
    driver,
    license,
    licenseNumber,
    violationType,
    violationCode,
    description,
    fineAmount,
    location,
    evidence,
  } = payload;

  if (!violationType) {
    throw new AppError("Violation type is required.", 400);
  }

  if (fineAmount === undefined || fineAmount === null || Number(fineAmount) < 0) {
    throw new AppError("Valid fine amount is required.", 400);
  }

  let appVehicle = null;
  let finalRegistrationNumber = registrationNumber
    ? normalizePlate(registrationNumber)
    : "";

  if (vehicle && isObjectId(vehicle)) {
    appVehicle = await Vehicle.findById(vehicle).lean();

    if (!appVehicle) {
      throw new AppError("Selected app vehicle was not found.", 404);
    }

    finalRegistrationNumber = normalizePlate(appVehicle.registrationNumber);
  }

  if (!appVehicle && finalRegistrationNumber) {
    appVehicle = await Vehicle.findOne({
      registrationNumber: finalRegistrationNumber,
    }).lean();
  }

  if (!finalRegistrationNumber) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  let appLicense = null;
  let finalLicenseNumber = licenseNumber ? normalizeLicense(licenseNumber) : "";

  if (license && isObjectId(license)) {
    appLicense = await DrivingLicense.findById(license).lean();

    if (appLicense?.licenseNumber) {
      finalLicenseNumber = normalizeLicense(appLicense.licenseNumber);
    }
  }

  if (!appLicense && finalLicenseNumber) {
    appLicense = await DrivingLicense.findOne({
      licenseNumber: finalLicenseNumber,
    }).lean();
  }

  let finalDriver = driver && isObjectId(driver) ? driver : null;

  if (!finalDriver && appLicense?.driver) {
    finalDriver = appLicense.driver;
  }

  const caseId = await generateCaseId();

  let vehicleVerification = null;
  let licenseVerification = null;

  try {
    vehicleVerification = await brtaMockService.verifyVehicle({
      registrationNumber: finalRegistrationNumber,
      licenseNumber: finalLicenseNumber,
    });
  } catch (_) {
    vehicleVerification = null;
  }

  try {
    if (finalLicenseNumber) {
      licenseVerification = await brtaLicenseService.verifyLicense({
        licenseNumber: finalLicenseNumber,
      });
    }
  } catch (_) {
    licenseVerification = null;
  }

  const safetySnapshot = {
    vehicleScore:
      vehicleVerification?.safetyScore ??
      vehicleVerification?.verification?.safetyScore ??
      null,

    driverScore:
      licenseVerification?.safetyScore ??
      licenseVerification?.verification?.safetyScore ??
      null,

    riskLevel:
      vehicleVerification?.riskLevel ||
      licenseVerification?.riskLevel ||
      vehicleVerification?.verification?.riskLevel ||
      licenseVerification?.verification?.riskLevel ||
      "Unknown Risk",

    issues: [
      ...(vehicleVerification?.issues ||
        vehicleVerification?.verification?.issues ||
        []),
      ...(licenseVerification?.issues ||
        licenseVerification?.verification?.issues ||
        []),
    ],
  };

  const violation = await Violation.create({
    caseId,

    vehicle: appVehicle?._id || undefined,
    registrationNumber: finalRegistrationNumber,

    driver: finalDriver || undefined,

    license: appLicense?._id || undefined,
    licenseNumber: finalLicenseNumber || undefined,

    officer: officer._id,

    violationType,
    violationCode,
    description,

    fineAmount: Number(fineAmount),
    currency: "BDT",

    location: location || {},
    evidence: Array.isArray(evidence) ? evidence : [],

    status: "pending",
    paymentStatus: "unpaid",

    safetySnapshot,
    issuedAt: new Date(),
  });

  return violation;
};

const getViolations = async ({ user, filters = {} }) => {
  const roleQuery = await buildViolationQueryForRole(user);

  const query = {
    ...roleQuery,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.registrationNumber) {
    query.registrationNumber = normalizePlate(filters.registrationNumber);
  }

  if (filters.licenseNumber) {
    query.licenseNumber = normalizeLicense(filters.licenseNumber);
  }

  const violations = await Violation.find(query)
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return violations;
};

const getViolationById = async (id, user) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation id.", 400);
  }

  const roleQuery = await buildViolationQueryForRole(user);

  const violation = await Violation.findOne({
    _id: id,
    ...roleQuery,
  })
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email")
    .lean();

  if (!violation) {
    throw new AppError("Violation not found.", 404);
  }

  return violation;
};

const updateViolationStatus = async ({ id, status, note, admin }) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid violation id.", 400);
  }

  const normalizedStatus = normalizeStatusUpdate(status);

  const update = {
    status: normalizedStatus,
    adminReviewedBy: admin._id,
    adminReviewNote: note || "",
    reviewNote: note || "",
    reviewedAt: new Date(),
    adminReviewedAt: new Date(),
  };

  if (normalizedStatus === "paid") {
    update.paymentStatus = "paid";
    update.paymentDate = new Date();
    update.paidAt = new Date();
  }

  if (normalizedStatus === "dismissed") {
    update.paymentStatus = "waived";
  }

  const violation = await Violation.findByIdAndUpdate(id, update, {
    new: true,
  })
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .populate("adminReviewedBy", "name email");

  if (!violation) {
    throw new AppError("Violation not found.", 404);
  }

  return violation;
};

const getVehicleViolations = async (registrationNumber, user) => {
  const plate = normalizePlate(registrationNumber);

  const roleQuery = await buildViolationQueryForRole(user);

  const appVehicle = await Vehicle.findOne({
    registrationNumber: plate,
  }).lean();

  const query = {
    ...roleQuery,
    $or: [
      { registrationNumber: plate },
      ...(appVehicle?._id ? [{ vehicle: appVehicle._id }] : []),
    ],
  };

  const violations = await Violation.find(query)
    .populate("vehicle", "registrationNumber brand model color vehicleType")
    .populate("driver", "name email role phone")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("officer", "name email badge station")
    .sort({ createdAt: -1 })
    .lean();

  return violations;
};

module.exports = {
  createViolation,
  getViolations,
  getViolationById,
  updateViolationStatus,
  getVehicleViolations,
};