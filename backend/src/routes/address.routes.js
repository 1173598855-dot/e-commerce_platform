const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, addressController.getAddressList);
router.post('/', authenticateToken, addressController.addAddress);
router.put('/:id', authenticateToken, addressController.updateAddress);
router.delete('/:id', authenticateToken, addressController.deleteAddress);
router.get('/default', authenticateToken, addressController.getDefaultAddress);

module.exports = router;
