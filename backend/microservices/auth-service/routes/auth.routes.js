const express = require('express');
const { health } = require('../controllers/auth.controller');
const {
  register,
  passwordLogin,
  sendCode,
  smsLogin,
  wxLogin,
  qqLogin,
  profile,
  refresh,
  verify,
  logout,
  updateProfile,
} = require('../controllers/auth.controller');

const router = express.Router();

router.get('/health', health);
router.post('/register', register);
router.post('/password-login', passwordLogin);
router.post('/send-code', sendCode);
router.post('/sms-login', smsLogin);
router.post('/wx-login', wxLogin);
router.post('/qq-login', qqLogin);
router.get('/profile', profile);
router.post('/refresh', refresh);
router.post('/verify', verify);
router.post('/logout', logout);
router.put('/profile', updateProfile);

module.exports = router;
