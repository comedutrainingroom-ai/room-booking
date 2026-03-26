const express = require('express');
const router = express.Router();
const {
    getPublicSettings,
    getRuntimeSettings,
    getAdminSettings,
    updateSettings
} = require('../controllers/settingsController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

router.route('/')
    .get(getPublicSettings) // Public bootstrap config
    .put(protect, admin, adminUnlocked, updateSettings); // Admin only can update

router.get('/runtime', protect, getRuntimeSettings); // Authenticated runtime settings
router.get('/admin', protect, admin, adminUnlocked, getAdminSettings); // Full admin settings

module.exports = router;

