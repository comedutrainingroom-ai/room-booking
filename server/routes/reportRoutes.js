const express = require('express');
const router = express.Router();
const {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus
} = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming this exists or similar



router.route('/')
    .post(protect, createReport)
    .get(protect, admin, getAllReports);

router.route('/my').get(protect, getMyReports);

router.route('/:id/status').put(protect, admin, updateReportStatus);

module.exports = router;
