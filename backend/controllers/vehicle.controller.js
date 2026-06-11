const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const brtaMockService = require("../services/brtaMock.service");
const logService = require("../services/log.service");
const Vehicle = require("../models/Vehicle");
const { buildVehicleQR, normalizePlate } = require("../utils/qr");



const createVehicle = asyncHandler(async (req, res) => {
  const payload = req.body;

  const registrationNumber = normalizePlate(payload.registrationNumber);

  if (!registrationNumber) {
    throw new AppError("Registration number is required.", 400);
  }

  const owner = req.user.role === "owner" ? req.user._id : payload.owner;

  if (!owner) {
    throw new AppError("Vehicle owner is required.", 400);
  }

  const existingVehicle = await Vehicle.findOne({ registrationNumber });

  if (existingVehicle) {
    throw new AppError("Vehicle already exists with this registration number.", 409);
  }

  const vehicle = await Vehicle.create({
    ...payload,
    registrationNumber,
    owner,
    qrCode: payload.qrCode || buildVehicleQR(registrationNumber),
  });

  return sendSuccess(res, 201, "Vehicle created successfully.", {
    vehicle,
  });
});

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw new AppError("Vehicle not found.", 404);
  }

  if (
    req.user.role === "owner" &&
    vehicle.owner &&
    String(vehicle.owner) !== String(req.user._id)
  ) {
    throw new AppError("You are not allowed to update this vehicle.", 403);
  }

  const payload = { ...req.body };

  if (payload.registrationNumber) {
    payload.registrationNumber = normalizePlate(payload.registrationNumber);
    payload.qrCode = payload.qrCode || buildVehicleQR(payload.registrationNumber);
  }

  const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  }).populate("owner", "name email phone role");

  return sendSuccess(res, 200, "Vehicle updated successfully.", {
    vehicle: updatedVehicle,
  });
});

const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await brtaMockService.getAllVehicles();

  return sendSuccess(res, 200, "Vehicles fetched successfully.", {
    count: vehicles.length,
    vehicles,
  });
});

const getMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await brtaMockService.getOwnerVehicles(req.user);

  return sendSuccess(res, 200, "Owner vehicles fetched successfully.", {
    count: vehicles.length,
    vehicles,
  });
});




const verifyVehicle = asyncHandler(async (req, res) => {
  const registrationNumber = req.params.plate || req.params.registrationNumber;

  const licenseNumber =
    req.query.licenseNumber ||
    req.query.driverLicense ||
    req.query.driverLicenseNumber ||
    "";

  const result = await brtaMockService.verifyVehicle({
    registrationNumber,
    licenseNumber,
  });

  if (!result.found) {
    throw new AppError("Vehicle not found in Mock BRTA Registry.", 404, [
      result.verification,
    ]);
  }

  await logService.createVerificationLog({
  req,
  user: req.user,
  searchType: "vehicle",
  searchValue: registrationNumber,
  registrationNumber: result.registrationNumber,
  result: result.verification?.result,
  dataSource: result.dataSource,
  brtaProvider: result.brtaProvider,
  verification: result.verification,
  issues: result.issues,
});

  return sendSuccess(
    res,
    200,
    result.verification.isCompliant
      ? "Vehicle verified successfully."
      : "Vehicle verified with compliance issues.",
    result
  );
});

module.exports = {
  getVehicles,
  getMyVehicles,
  verifyVehicle,
  createVehicle,
  updateVehicle,
};