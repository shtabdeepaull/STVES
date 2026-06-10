const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const brtaMockService = require("../services/brtaMock.service");
const logService = require("../services/log.service");

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
};