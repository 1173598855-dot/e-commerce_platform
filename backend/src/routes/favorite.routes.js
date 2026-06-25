const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/', authenticateToken, favoriteController.favoriteProduct);
router.delete('/', authenticateToken, favoriteController.unfavoriteProduct);
router.get('/', authenticateToken, favoriteController.getFavorites);
router.get('/:product_id/status', authenticateToken, favoriteController.checkFavorite);

module.exports = router;
