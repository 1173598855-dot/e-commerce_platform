const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/history/save', authenticateToken, searchController.saveSearchHistory);
router.get('/history', authenticateToken, searchController.getSearchHistory);
router.delete('/history', authenticateToken, searchController.clearSearchHistory);
router.get('/hot', searchController.getHotSearches);
router.get('/suggestions', searchController.getSearchSuggestions);
router.post('/behavior', authenticateToken, searchController.recordSearchBehavior);

module.exports = router;
