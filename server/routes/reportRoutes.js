const express = require('express');
const router = express.Router();
const {
    createReport,
    getMyReports,
    getAllReports,
    getReportNotificationSummary,
    updateReportStatus
} = require('../controllers/reportController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createReport)
    .get(protect, admin, adminUnlocked, getAllReports);

router.get('/notification-summary', protect, admin, getReportNotificationSummary);
router.route('/my').get(protect, getMyReports);

router.route('/:id/status').put(protect, admin, adminUnlocked, updateReportStatus);

module.exports = router;

