const express = require("express");
const router = express.Router();
const logisticsController = require("../controllers/logistics.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.get("/:orderId", authenticateToken, logisticsController.getLogisticsTracking);

module.exports = router;
