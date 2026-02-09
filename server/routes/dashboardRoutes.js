const express = require('express');
const router = express.Router();
const { getStats, getMonthlyData, getRoomUsage, getYearlyData, exportData } = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

// All dashboard routes are protected and admin-only
router.get('/stats', protect, admin, getStats);
router.get('/monthly', protect, admin, getMonthlyData);
router.get('/room-usage', protect, admin, getRoomUsage);
router.get('/yearly', protect, admin, getYearlyData);
router.get('/export', protect, admin, exportData);

module.exports = router;
