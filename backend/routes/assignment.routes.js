const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const assignmentController = require("../controllers/assignment.controller");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "owner"),
  assignmentController.createAssignment
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "owner", "police"),
  assignmentController.getAssignments
);

router.get(
  "/my",
  protect,
  authorizeRoles("admin", "owner", "driver"),
  assignmentController.getMyAssignments
);

router.get(
  "/check/:registrationNumber/:licenseNumber",
  protect,
  authorizeRoles("admin", "owner", "police", "driver"),
  assignmentController.checkAssignment
);

router.patch(
  "/:id/remove",
  protect,
  authorizeRoles("admin", "owner"),
  assignmentController.removeAssignment
);

module.exports = router;