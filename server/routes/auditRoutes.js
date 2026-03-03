const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin only — view audit logs
router.route('/').get(protect, admin, getAuditLogs);

module.exports = router;
