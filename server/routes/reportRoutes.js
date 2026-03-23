const express = require('express');
const router = express.Router();
const {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus,
    setRoomMaintenance
} = require('../controllers/reportController');
const { protect, admin, adminUnlocked } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createReport)
    .get(protect, admin, adminUnlocked, getAllReports);

router.route('/my').get(protect, getMyReports);

router.route('/:id/status').put(protect, admin, adminUnlocked, updateReportStatus);
router.route('/:id/maintenance').put(protect, admin, adminUnlocked, setRoomMaintenance);

module.exports = router;

