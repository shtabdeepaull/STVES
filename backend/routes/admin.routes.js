const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/dashboard", adminController.getDashboard);

router.get("/users", adminController.getUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:id", adminController.updateUser);

router.get("/vehicles", adminController.getVehicles);
router.get("/licenses", adminController.getLicenses);
router.get("/cases", adminController.getCases);
router.get("/assignments", adminController.getAssignments);

module.exports = router;