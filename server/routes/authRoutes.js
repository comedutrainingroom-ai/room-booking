const express = require('express');
const router = express.Router();
const { googleLogin, getCurrentUser, updateProfile, verifyAdminPin } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/google', googleLogin); // Public - login endpoint
router.get('/me', protect, getCurrentUser); // Protected - requires login
router.put('/profile', protect, updateProfile); // Protected - requires login
router.post('/verify-pin', protect, admin, verifyAdminPin); // Admin only - verify 2nd factor PIN

module.exports = router;

