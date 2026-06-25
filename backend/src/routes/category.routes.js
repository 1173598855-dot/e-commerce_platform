const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', categoryController.getCategoryList);
router.get('/:id', categoryController.getCategoryDetail);
router.post('/', authenticateToken, categoryController.createCategory);
router.put('/:id', authenticateToken, categoryController.updateCategory);

module.exports = router;
