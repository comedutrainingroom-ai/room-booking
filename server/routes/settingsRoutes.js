const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getSettings) // Public - anyone can read settings
    .put(protect, admin, updateSettings); // Admin only can update

module.exports = router;

