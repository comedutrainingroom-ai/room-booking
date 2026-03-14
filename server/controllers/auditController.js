const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs (paginated)
// @route   GET /api/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Optional filters
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.performedBy) filter.performedBy = req.query.performedBy;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('performedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: logs
        });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = { getAuditLogs };
