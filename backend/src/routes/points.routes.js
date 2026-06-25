const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/points.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, pointsController.getPoints);
router.post('/add', authenticateToken, pointsController.addPoints);
router.get('/logs', authenticateToken, pointsController.getPointsLogs);
router.post('/consume', authenticateToken, pointsController.consumePoints);

module.exports = router;
