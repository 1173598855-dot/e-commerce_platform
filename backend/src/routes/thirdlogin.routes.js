const express = require('express');
const router = express.Router();
const thirdLoginController = require('../controllers/thirdlogin.controller');

router.post('/wx', thirdLoginController.wxLogin);
router.post('/qq', thirdLoginController.qqLogin);

module.exports = router;
