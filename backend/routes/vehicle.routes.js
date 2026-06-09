const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const vehicleController = require("../controllers/vehicle.controller");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "police"),
  vehicleController.getVehicles
);

router.get(
  "/my",
  protect,
  authorizeRoles("owner", "admin"),
  vehicleController.getMyVehicles
);

router.get(
  "/verify/:plate",
  protect,
  authorizeRoles("admin", "police", "owner"),
  vehicleController.verifyVehicle
);

module.exports = router;