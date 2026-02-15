const express = require('express');
const router = express.Router();
const {
  getGoogleAuthURL,
  googleCallback,
  getMe,
  updateProfile,
  logout,
  refreshGoogleToken,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validation');

// Public routes
router.get('/google', getGoogleAuthURL);
router.get('/google/callback', googleCallback);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, validateUserUpdate, updateProfile);
router.post('/logout', protect, logout);
router.post('/refresh-token', protect, authorize('faculty'), refreshGoogleToken);

module.exports = router;
