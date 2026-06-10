const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const assignmentService = require("../services/assignment.service");

const createAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.createAssignment(req.body, req.user);

  return sendSuccess(
    res,
    result.alreadyExists ? 200 : 201,
    result.alreadyExists
      ? "Active assignment already exists."
      : "Assignment created successfully.",
    result
  );
});

const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user, req.query);

  return sendSuccess(res, 200, "Assignments fetched successfully.", {
    count: assignments.length,
    assignments,
  });
});

const getMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user, req.query);

  return sendSuccess(res, 200, "My assignments fetched successfully.", {
    count: assignments.length,
    assignments,
  });
});

const removeAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.removeAssignment({
    id: req.params.id,
    reason: req.body.reason,
    user: req.user,
  });

  return sendSuccess(res, 200, "Assignment removed successfully.", {
    assignment,
  });
});

const checkAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.checkAssignment({
    registrationNumber: req.params.registrationNumber,
    licenseNumber: req.params.licenseNumber,
  });

  return sendSuccess(res, 200, "Assignment authorization checked successfully.", {
    authorization: result,
  });
});

module.exports = {
  createAssignment,
  getAssignments,
  getMyAssignments,
  removeAssignment,
  checkAssignment,
};