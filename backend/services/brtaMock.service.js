const BrtaOwner = require("../models/BrtaOwner");
const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaVehicleDocument = require("../models/BrtaVehicleDocument");
const BrtaBlacklistRecord = require("../models/BrtaBlacklistRecord");
const BrtaDriverVehicleAuthorization = require("../models/BrtaDriverVehicleAuthorization");

const Vehicle = require("../models/Vehicle");
const Violation = require("../models/Violation");

const env = require("../config/env");
const { normalizePlate, normalizeLicense, buildVehicleQR } = require("../utils/qr");
const { calculateVehicleSafetyScore } = require("./safetyScore.service");

const toPlain = (doc) => {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
};

const countUnpaidViolationsByPlate = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const appVehicle = await Vehicle.findOne({
    registrationNumber: plate,
  }).lean();

  const plateQuery = [
    { registrationNumber: plate },
    { vehicleRegistrationNumber: plate },
    { "vehicle.registrationNumber": plate },
  ];

  if (appVehicle?._id) {
    plateQuery.push({ vehicle: appVehicle._id });
  }

  return Violation.countDocuments({
    $and: [
      {
        $or: plateQuery,
      },
      {
        status: {
          $ne: "dismissed",
        },
      },
      {
        $or: [
          { paymentStatus: { $in: ["unpaid", "pending", "partial"] } },
          { status: { $in: ["pending", "approved", "unpaid"] } },
          { paid: false },
        ],
      },
    ],
  });
};

const getVehicleRegistryBundle = async (registrationNumber) => {
  const plate = normalizePlate(registrationNumber);

  const vehicle = await BrtaVehicle.findOne({
    registrationNumber: plate,
  }).lean();

  if (!vehicle) {
    return {
      found: false,
      registrationNumber: plate,
    };
  }

  const [owner, documents, blacklistRecords] = await Promise.all([
    vehicle.brtaOwnerId
      ? BrtaOwner.findOne({ brtaOwnerId: vehicle.brtaOwnerId }).lean()
      : null,

    BrtaVehicleDocument.findOne({
      registrationNumber: plate,
    }).lean(),

    BrtaBlacklistRecord.find({
      entityType: "vehicle",
      registrationNumber: plate,
      status: "active",
    }).lean(),
  ]);

  return {
    found: true,
    registrationNumber: plate,
    vehicle,
    owner,
    documents,
    blacklistRecords,
  };
};

const verifyDriverAuthorization = async ({ registrationNumber, licenseNumber }) => {
  const plate = normalizePlate(registrationNumber);
  const cleanLicense = normalizeLicense(licenseNumber);

  if (!cleanLicense) {
    return {
      checked: false,
      authorized: false,
      message: "Driver license was not provided for authorization check.",
    };
  }

  const authorization = await BrtaDriverVehicleAuthorization.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
  }).lean();

  if (!authorization) {
    return {
      checked: true,
      authorized: false,
      licenseNumber: cleanLicense,
      message: "Driver is not authorized for this vehicle.",
    };
  }

  const now = new Date();

  if (authorization.endDate && new Date(authorization.endDate) < now) {
    return {
      checked: true,
      authorized: false,
      licenseNumber: cleanLicense,
      authorization,
      message: "Driver authorization is expired.",
    };
  }

  return {
    checked: true,
    authorized: true,
    licenseNumber: cleanLicense,
    authorization,
    message: "Driver is authorized for this vehicle.",
  };
};

const verifyVehicle = async ({ registrationNumber, licenseNumber }) => {
  const plate = normalizePlate(registrationNumber);

  const bundle = await getVehicleRegistryBundle(plate);

  if (!bundle.found) {
    return {
      found: false,
      registrationNumber: plate,
      dataSource: "BRTA_MOCK",
      brtaProvider: env.brtaProviderName,
      checkedAt: new Date().toISOString(),
      verification: {
        result: "not_found",
        isCompliant: false,
        safetyScore: 0,
        complianceScore: 0,
        riskLevel: "Critical Risk",
        issues: [
          {
            code: "VEHICLE_NOT_FOUND",
            message: "Vehicle was not found in Mock BRTA Registry.",
            severity: "critical",
            penalty: 100,
          },
        ],
      },
    };
  }

  const unpaidViolationsCount = await countUnpaidViolationsByPlate(plate);

  const safety = calculateVehicleSafetyScore({
    vehicle: bundle.vehicle,
    documents: bundle.documents,
    blacklistRecords: bundle.blacklistRecords,
    unpaidViolationsCount,
  });

  const driverAuthorization = await verifyDriverAuthorization({
    registrationNumber: plate,
    licenseNumber,
  });

  const vehicle = {
    ...bundle.vehicle,
    qrCode: bundle.vehicle.qrCode || buildVehicleQR(plate),
    documents: bundle.documents || null,
    owner: bundle.owner || null,
    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
  };

  return {
    found: true,
    registrationNumber: plate,
    dataSource: "BRTA_MOCK",
    brtaProvider: env.brtaProviderName,
    checkedAt: new Date().toISOString(),

    vehicle,
    owner: bundle.owner || null,
    documents: bundle.documents || null,
    driverAuthorization,

    verification: {
      result: safety.isCompliant ? "valid" : "warning",
      isCompliant: safety.isCompliant,
      safetyScore: safety.score,
      complianceScore: safety.complianceScore,
      riskLevel: safety.riskLevel,
      issues: safety.issues,
      unpaidViolationsCount,
    },

    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
    issues: safety.issues,
  };
};

const getAllVehicles = async () => {
  const vehicles = await BrtaVehicle.find({}).sort({ createdAt: -1 }).lean();

  const result = [];

  for (const vehicle of vehicles) {
    const verified = await verifyVehicle({
      registrationNumber: vehicle.registrationNumber,
    });

    result.push(verified.vehicle);
  }

  return result;
};

const getOwnerVehicles = async (user) => {
  const result = [];

  // Option 1: STVES app vehicle owner relation
  const appVehicles = await Vehicle.find({
    owner: user._id,
  }).lean();

  for (const appVehicle of appVehicles) {
    const plate = appVehicle.registrationNumber || appVehicle.plateNumber;

    if (!plate) continue;

    const verified = await verifyVehicle({
      registrationNumber: plate,
    });

    if (verified.found) {
      result.push({
        ...verified.vehicle,
        appVehicleId: appVehicle._id,
      });
    }
  }

  // Option 2: BRTA owner relation by NID
  if (user.nid) {
    const brtaOwner = await BrtaOwner.findOne({
      nid: user.nid,
    }).lean();

    if (brtaOwner?.brtaOwnerId) {
      const brtaVehicles = await BrtaVehicle.find({
        brtaOwnerId: brtaOwner.brtaOwnerId,
      }).lean();

      for (const vehicle of brtaVehicles) {
        const alreadyExists = result.some(
          (item) => item.registrationNumber === vehicle.registrationNumber
        );

        if (alreadyExists) continue;

        const verified = await verifyVehicle({
          registrationNumber: vehicle.registrationNumber,
        });

        if (verified.found) {
          result.push(verified.vehicle);
        }
      }
    }
  }

  return result;
};

module.exports = {
  verifyVehicle,
  getAllVehicles,
  getOwnerVehicles,
};