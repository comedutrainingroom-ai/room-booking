const express = require('express');
const router = express.Router();
const { googleLogin, getCurrentUser, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/google', googleLogin); // Public - login endpoint
router.get('/me', protect, getCurrentUser); // Protected - requires login
router.put('/profile', protect, updateProfile); // Protected - requires login

module.exports = router;

