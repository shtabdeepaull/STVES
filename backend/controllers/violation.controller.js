const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const violationService = require("../services/violation.service");

const createViolation = asyncHandler(async (req, res) => {
  const violation = await violationService.createViolation(req.body, req.user);

  return sendSuccess(res, 201, "E-Challan created successfully.", {
    violation,
  });
});

const getViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getViolations({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "Violations fetched successfully.", {
    count: violations.length,
    violations,
  });
});

const getMyViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getViolations({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "My violations fetched successfully.", {
    count: violations.length,
    violations,
  });
});

const getViolationById = asyncHandler(async (req, res) => {
  const violation = await violationService.getViolationById(
    req.params.id,
    req.user
  );

  return sendSuccess(res, 200, "Violation fetched successfully.", {
    violation,
  });
});

const updateViolationStatus = asyncHandler(async (req, res) => {
  const violation = await violationService.updateViolationStatus({
    id: req.params.id,
    status: req.body.status,
    note: req.body.note || req.body.reviewNote,
    admin: req.user,
  });

  return sendSuccess(res, 200, "Violation status updated successfully.", {
    violation,
  });
});

const getVehicleViolations = asyncHandler(async (req, res) => {
  const registrationNumber =
    req.params.registrationNumber || req.params.plate || req.params.vehicleId;

  const violations = await violationService.getVehicleViolations(
    registrationNumber,
    req.user
  );

  return sendSuccess(res, 200, "Vehicle violations fetched successfully.", {
    count: violations.length,
    violations,
  });
});

module.exports = {
  createViolation,
  getViolations,
  getMyViolations,
  getViolationById,
  updateViolationStatus,
  getVehicleViolations,
};