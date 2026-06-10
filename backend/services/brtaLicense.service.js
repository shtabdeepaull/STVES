const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaLicenseClass = require("../models/BrtaLicenseClass");
const BrtaBlacklistRecord = require("../models/BrtaBlacklistRecord");

const DrivingLicense = require("../models/DrivingLicense");
const Violation = require("../models/Violation");

const env = require("../config/env");
const { normalizeLicense, buildLicenseQR } = require("../utils/qr");
const { calculateLicenseSafetyScore } = require("./safetyScore.service");

const countUnpaidViolationsByLicense = async (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const appLicense = await DrivingLicense.findOne({
    licenseNumber: cleanLicense,
  }).lean();

  const licenseQuery = [
    { licenseNumber: cleanLicense },
    { driverLicenseNumber: cleanLicense },
    { "license.licenseNumber": cleanLicense },
  ];

  if (appLicense?._id) {
    licenseQuery.push({ license: appLicense._id });

    if (appLicense.driver) {
      licenseQuery.push({ driver: appLicense.driver });
    }
  }

  return Violation.countDocuments({
    $and: [
      {
        $or: licenseQuery,
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

const getLicenseRegistryBundle = async (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const license = await BrtaDrivingLicense.findOne({
    licenseNumber: cleanLicense,
  }).lean();

  if (!license) {
    return {
      found: false,
      licenseNumber: cleanLicense,
    };
  }

  const [driver, licenseClass, blacklistRecords] = await Promise.all([
    license.brtaDriverId
      ? BrtaDriver.findOne({ brtaDriverId: license.brtaDriverId }).lean()
      : null,

    license.licenseClass
      ? BrtaLicenseClass.findOne({
          classCode: String(license.licenseClass).toLowerCase(),
        }).lean()
      : null,

    BrtaBlacklistRecord.find({
      status: "active",
      $or: [
        {
          entityType: "license",
          licenseNumber: cleanLicense,
        },
        {
          entityType: "driver",
          brtaDriverId: license.brtaDriverId,
        },
      ],
    }).lean(),
  ]);

  return {
    found: true,
    licenseNumber: cleanLicense,
    license,
    driver,
    licenseClass,
    blacklistRecords,
  };
};

const verifyLicense = async ({ licenseNumber }) => {
  const cleanLicense = normalizeLicense(licenseNumber);

  const bundle = await getLicenseRegistryBundle(cleanLicense);

  if (!bundle.found) {
    return {
      found: false,
      licenseNumber: cleanLicense,
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
            code: "LICENSE_NOT_FOUND",
            message: "Driving license was not found in Mock BRTA Registry.",
            severity: "critical",
            penalty: 100,
          },
        ],
      },
    };
  }

  const unpaidViolationsCount = await countUnpaidViolationsByLicense(cleanLicense);

  const safety = calculateLicenseSafetyScore({
    license: bundle.license,
    driver: bundle.driver,
    blacklistRecords: bundle.blacklistRecords,
    unpaidViolationsCount,
  });

  const license = {
    ...bundle.license,
    qrCode: bundle.license.qrCode || buildLicenseQR(cleanLicense),
    driver: bundle.driver || null,
    licenseClassInfo: bundle.licenseClass || null,
    safetyScore: safety.score,
    complianceScore: safety.complianceScore,
    riskLevel: safety.riskLevel,
  };

  return {
    found: true,
    licenseNumber: cleanLicense,
    dataSource: "BRTA_MOCK",
    brtaProvider: env.brtaProviderName,
    checkedAt: new Date().toISOString(),

    license,
    driver: bundle.driver || null,
    licenseClass: bundle.licenseClass || null,

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

const getAllLicenses = async () => {
  const licenses = await BrtaDrivingLicense.find({}).sort({ createdAt: -1 }).lean();

  const result = [];

  for (const license of licenses) {
    const verified = await verifyLicense({
      licenseNumber: license.licenseNumber,
    });

    if (verified.found) {
      result.push(verified.license);
    }
  }

  return result;
};

const getMyLicenses = async (user) => {
  const result = [];

  if (user.nid) {
    const brtaDriver = await BrtaDriver.findOne({
      nid: user.nid,
    }).lean();

    if (brtaDriver?.brtaDriverId) {
      const licenses = await BrtaDrivingLicense.find({
        brtaDriverId: brtaDriver.brtaDriverId,
      }).lean();

      for (const license of licenses) {
        const verified = await verifyLicense({
          licenseNumber: license.licenseNumber,
        });

        if (verified.found) {
          result.push(verified.license);
        }
      }
    }
  }

  const appLicenses = await DrivingLicense.find({
    driver: user._id,
  }).lean();

  for (const appLicense of appLicenses) {
    const cleanLicense = appLicense.licenseNumber;

    if (!cleanLicense) continue;

    const exists = result.some(
      (item) => item.licenseNumber === String(cleanLicense).toUpperCase()
    );

    if (exists) continue;

    const verified = await verifyLicense({
      licenseNumber: cleanLicense,
    });

    if (verified.found) {
      result.push({
        ...verified.license,
        appLicenseId: appLicense._id,
      });
    }
  }

  return result;
};

module.exports = {
  verifyLicense,
  getAllLicenses,
  getMyLicenses,
};