const express = require("express");
const router = express.Router();
const videoController = require("../controllers/video.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.get("/", videoController.getVideoList);
router.post("/like", authenticateToken, videoController.likeVideo);

module.exports = router;
