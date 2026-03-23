const express = require('express');
const router = express.Router();
const { getStats, getMonthlyData, getRoomUsage, getYearlyData, exportData } = require('../controllers/dashboardController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

// All dashboard routes are protected and admin-only
router.get('/stats', protect, admin, adminUnlocked, getStats);
router.get('/monthly', protect, admin, adminUnlocked, getMonthlyData);
router.get('/room-usage', protect, admin, adminUnlocked, getRoomUsage);
router.get('/yearly', protect, admin, adminUnlocked, getYearlyData);
router.get('/export', protect, admin, adminUnlocked, exportData);

module.exports = router;
