const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdminSimple } = require('../middleware/admin.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 公开路由
router.get('/', productController.getProductList);
router.get('/hot', productController.getHotProducts);
router.get('/:id', productController.getProductDetail);

// 管理员路由 - 需要登录和管理员权限
router.post('/', authenticateToken, requireAdminSimple, upload.array('images', 5), productController.createProduct);
router.put('/:id', authenticateToken, requireAdminSimple, productController.updateProduct);
router.delete('/:id', authenticateToken, requireAdminSimple, productController.deleteProduct);

module.exports = router;
