const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const Vehicle = require("../models/Vehicle");
const DrivingLicense = require("../models/DrivingLicense");
const User = require("../models/User");

const BrtaVehicle = require("../models/BrtaVehicle");
const BrtaOwner = require("../models/BrtaOwner");
const BrtaDriver = require("../models/BrtaDriver");
const BrtaDrivingLicense = require("../models/BrtaDrivingLicense");
const BrtaDriverVehicleAuthorization = require("../models/BrtaDriverVehicleAuthorization");

const AppError = require("../utils/AppError");
const { normalizePlate, normalizeLicense } = require("../utils/qr");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const populateAssignment = (query) => {
  return query
    .populate("vehicle", "registrationNumber brand model color vehicleType owner")
    .populate("driver", "name email role phone nid")
    .populate("license", "licenseNumber holderName licenseClass status")
    .populate("owner", "name email role phone nid")
    .populate("assignedBy", "name email role")
    .populate("removeInfo.removedBy", "name email role");
};

const resolveVehicle = async ({ vehicle, registrationNumber }) => {
  let appVehicle = null;
  let plate = registrationNumber ? normalizePlate(registrationNumber) : "";

  if (vehicle && isObjectId(vehicle)) {
    appVehicle = await Vehicle.findById(vehicle).lean();

    if (!appVehicle) {
      throw new AppError("Selected vehicle was not found.", 404);
    }

    plate = normalizePlate(appVehicle.registrationNumber);
  }

  if (!appVehicle && plate) {
    appVehicle = await Vehicle.findOne({ registrationNumber: plate }).lean();
  }

  if (!plate) {
    throw new AppError("Vehicle registration number is required.", 400);
  }

  const brtaVehicle = await BrtaVehicle.findOne({
    registrationNumber: plate,
  }).lean();

  if (!appVehicle && !brtaVehicle) {
    throw new AppError("Vehicle not found in app or Mock BRTA Registry.", 404);
  }

  return {
    appVehicle,
    brtaVehicle,
    registrationNumber: plate,
  };
};

const resolveLicenseAndDriver = async ({ driver, license, licenseNumber }) => {
  let appDriver = null;
  let appLicense = null;
  let brtaLicense = null;
  let brtaDriver = null;

  let cleanLicense = licenseNumber ? normalizeLicense(licenseNumber) : "";

  if (driver && isObjectId(driver)) {
    appDriver = await User.findById(driver).lean();

    if (!appDriver) {
      throw new AppError("Selected driver was not found.", 404);
    }

    if (appDriver.role !== "driver") {
      throw new AppError("Selected user is not a driver.", 400);
    }
  }

  if (license && isObjectId(license)) {
    appLicense = await DrivingLicense.findById(license).lean();

    if (!appLicense) {
      throw new AppError("Selected license was not found.", 404);
    }

    cleanLicense = normalizeLicense(appLicense.licenseNumber);

    if (!appDriver && appLicense.driver) {
      appDriver = await User.findById(appLicense.driver).lean();
    }
  }

  if (!appLicense && cleanLicense) {
    appLicense = await DrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();

    if (appLicense?.driver && !appDriver) {
      appDriver = await User.findById(appLicense.driver).lean();
    }
  }

  if (!cleanLicense && appDriver?._id) {
    appLicense = await DrivingLicense.findOne({
      driver: appDriver._id,
    }).lean();

    if (appLicense?.licenseNumber) {
      cleanLicense = normalizeLicense(appLicense.licenseNumber);
    }
  }

  if (cleanLicense) {
    brtaLicense = await BrtaDrivingLicense.findOne({
      licenseNumber: cleanLicense,
    }).lean();

    if (brtaLicense?.brtaDriverId) {
      brtaDriver = await BrtaDriver.findOne({
        brtaDriverId: brtaLicense.brtaDriverId,
      }).lean();
    }
  }

  if (!cleanLicense) {
    throw new AppError("Driver license number is required.", 400);
  }

  if (!appLicense && !brtaLicense) {
    throw new AppError("License not found in app or Mock BRTA Registry.", 404);
  }

  return {
    appDriver,
    appLicense,
    brtaDriver,
    brtaLicense,
    licenseNumber: cleanLicense,
  };
};

const ensureOwnerPermission = async ({ user, appVehicle, brtaVehicle }) => {
  if (user.role === "admin") return;

  if (user.role !== "owner") {
    throw new AppError("Only admin or owner can create assignment.", 403);
  }

  if (appVehicle?.owner && String(appVehicle.owner) !== String(user._id)) {
    throw new AppError("You are not the owner of this vehicle.", 403);
  }

  if (!appVehicle && brtaVehicle?.brtaOwnerId && user.nid) {
    const brtaOwner = await BrtaOwner.findOne({
      brtaOwnerId: brtaVehicle.brtaOwnerId,
      nid: user.nid,
    }).lean();

    if (!brtaOwner) {
      throw new AppError("You are not the BRTA owner of this vehicle.", 403);
    }
  }
};

const createAssignment = async (payload, user) => {
  const { vehicle, registrationNumber, driver, license, licenseNumber, startDate, endDate, notes } =
    payload;

  const vehicleInfo = await resolveVehicle({ vehicle, registrationNumber });

  const licenseInfo = await resolveLicenseAndDriver({
    driver,
    license,
    licenseNumber,
  });

  await ensureOwnerPermission({
    user,
    appVehicle: vehicleInfo.appVehicle,
    brtaVehicle: vehicleInfo.brtaVehicle,
  });

  const owner =
    vehicleInfo.appVehicle?.owner ||
    (user.role === "owner" ? user._id : undefined);

  const duplicateQuery = {
    status: "active",
    $or: [
      {
        registrationNumber: vehicleInfo.registrationNumber,
        licenseNumber: licenseInfo.licenseNumber,
      },
    ],
  };

  if (vehicleInfo.appVehicle?._id && licenseInfo.appDriver?._id) {
    duplicateQuery.$or.push({
      vehicle: vehicleInfo.appVehicle._id,
      driver: licenseInfo.appDriver._id,
    });
  }

  const existingAssignment = await Assignment.findOne(duplicateQuery);

  if (existingAssignment) {
    return {
      assignment: await populateAssignment(
        Assignment.findById(existingAssignment._id)
      ).lean(),
      alreadyExists: true,
    };
  }

  const assignment = await Assignment.create({
    vehicle: vehicleInfo.appVehicle?._id || undefined,
    registrationNumber: vehicleInfo.registrationNumber,

    driver: licenseInfo.appDriver?._id || undefined,

    license: licenseInfo.appLicense?._id || undefined,
    licenseNumber: licenseInfo.licenseNumber,

    owner,
    assignedBy: user._id,

    status: "active",
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : undefined,
    notes,
  });

  if (licenseInfo.brtaLicense?.brtaDriverId) {
    await BrtaDriverVehicleAuthorization.updateOne(
      {
        registrationNumber: vehicleInfo.registrationNumber,
        licenseNumber: licenseInfo.licenseNumber,
      },
      {
        $set: {
          registrationNumber: vehicleInfo.registrationNumber,
          licenseNumber: licenseInfo.licenseNumber,
          brtaDriverId: licenseInfo.brtaLicense.brtaDriverId,
          authorizationType: "assigned_driver",
          status: "active",
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const populated = await populateAssignment(Assignment.findById(assignment._id)).lean();

  return {
    assignment: populated,
    alreadyExists: false,
  };
};

const buildAssignmentQueryForRole = async (user) => {
  if (user.role === "admin") return {};

  if (user.role === "owner") {
    const appVehicles = await Vehicle.find({ owner: user._id }).lean();

    const vehicleIds = appVehicles.map((item) => item._id);
    const plates = appVehicles
      .map((item) => item.registrationNumber)
      .filter(Boolean)
      .map(normalizePlate);

    return {
      $or: [
        { owner: user._id },
        { vehicle: { $in: vehicleIds } },
        { registrationNumber: { $in: plates } },
      ],
    };
  }

  if (user.role === "driver") {
    const appLicenses = await DrivingLicense.find({ driver: user._id }).lean();

    const licenseIds = appLicenses.map((item) => item._id);
    const licenseNumbers = appLicenses
      .map((item) => item.licenseNumber)
      .filter(Boolean)
      .map(normalizeLicense);

    return {
      $or: [
        { driver: user._id },
        { license: { $in: licenseIds } },
        { licenseNumber: { $in: licenseNumbers } },
      ],
    };
  }

  if (user.role === "police") {
    return {
      status: "active",
    };
  }

  return { _id: null };
};

const getAssignments = async (user, filters = {}) => {
  const roleQuery = await buildAssignmentQueryForRole(user);

  const query = {
    ...roleQuery,
  };

  if (filters.status) {
    query.status = String(filters.status).toLowerCase();
  }

  if (filters.registrationNumber) {
    query.registrationNumber = normalizePlate(filters.registrationNumber);
  }

  if (filters.licenseNumber) {
    query.licenseNumber = normalizeLicense(filters.licenseNumber);
  }

  const assignments = await populateAssignment(
    Assignment.find(query).sort({ createdAt: -1 })
  ).lean();

  return assignments;
};

const removeAssignment = async ({ id, reason, user }) => {
  if (!isObjectId(id)) {
    throw new AppError("Invalid assignment id.", 400);
  }

  const assignment = await Assignment.findById(id).lean();

  if (!assignment) {
    throw new AppError("Assignment not found.", 404);
  }

  if (user.role === "owner") {
    const appVehicle = assignment.vehicle
      ? await Vehicle.findById(assignment.vehicle).lean()
      : null;

    const isOwnerByAssignment =
      assignment.owner && String(assignment.owner) === String(user._id);

    const isOwnerByVehicle =
      appVehicle?.owner && String(appVehicle.owner) === String(user._id);

    if (!isOwnerByAssignment && !isOwnerByVehicle) {
      throw new AppError("You are not allowed to remove this assignment.", 403);
    }
  }

  const updatedAssignment = await populateAssignment(
    Assignment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "removed",
          removeInfo: {
            removedBy: user._id,
            removedAt: new Date(),
            reason: reason || "Assignment removed.",
          },
        },
      },
      {
        new: true,
        runValidators: false,
      }
    )
  ).lean();

  if (assignment.registrationNumber && assignment.licenseNumber) {
    await BrtaDriverVehicleAuthorization.updateOne(
      {
        registrationNumber: assignment.registrationNumber,
        licenseNumber: assignment.licenseNumber,
        status: "active",
      },
      {
        $set: {
          status: "revoked",
          updatedAt: new Date(),
        },
      }
    );
  }

  return updatedAssignment;
};

const checkAssignment = async ({ registrationNumber, licenseNumber }) => {
  let plate = "";
  let cleanLicense = "";

  // First param can be vehicle ObjectId or registration number
  if (isObjectId(registrationNumber)) {
    const appVehicle = await Vehicle.findById(registrationNumber).lean();

    if (appVehicle?.registrationNumber) {
      plate = normalizePlate(appVehicle.registrationNumber);
    }
  } else {
    plate = normalizePlate(registrationNumber);
  }

  // Second param can be license ObjectId, driver ObjectId, or license number
  if (isObjectId(licenseNumber)) {
    const appLicenseById = await DrivingLicense.findById(licenseNumber).lean();

    if (appLicenseById?.licenseNumber) {
      cleanLicense = normalizeLicense(appLicenseById.licenseNumber);
    } else {
      const appLicenseByDriver = await DrivingLicense.findOne({
        driver: licenseNumber,
      }).lean();

      if (appLicenseByDriver?.licenseNumber) {
        cleanLicense = normalizeLicense(appLicenseByDriver.licenseNumber);
      }
    }
  } else {
    cleanLicense = normalizeLicense(licenseNumber);
  }

  if (!plate || !cleanLicense) {
    throw new AppError("Registration number and license number are required.", 400);
  }

  const now = new Date();

  const appAssignment = await Assignment.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } },
    ],
  }).lean();

  if (appAssignment) {
    return {
      checked: true,
      authorized: true,
      source: "STVES_ASSIGNMENT",
      registrationNumber: plate,
      licenseNumber: cleanLicense,
      message: "Driver is authorized by STVES assignment.",
      assignment: appAssignment,
    };
  }

  const brtaAuthorization = await BrtaDriverVehicleAuthorization.findOne({
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    status: "active",
  }).lean();

  if (brtaAuthorization) {
    if (brtaAuthorization.endDate && new Date(brtaAuthorization.endDate) < now) {
      return {
        checked: true,
        authorized: false,
        source: "BRTA_MOCK",
        registrationNumber: plate,
        licenseNumber: cleanLicense,
        message: "BRTA authorization is expired.",
        authorization: brtaAuthorization,
      };
    }

    return {
      checked: true,
      authorized: true,
      source: "BRTA_MOCK",
      registrationNumber: plate,
      licenseNumber: cleanLicense,
      message: "Driver is authorized by Mock BRTA Registry.",
      authorization: brtaAuthorization,
    };
  }

  return {
    checked: true,
    authorized: false,
    source: "NONE",
    registrationNumber: plate,
    licenseNumber: cleanLicense,
    message: "No active authorization found for this driver and vehicle.",
  };
};

module.exports = {
  createAssignment,
  getAssignments,
  removeAssignment,
  checkAssignment,
};