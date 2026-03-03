const AuditLog = require('../models/AuditLog');

/**
 * Write an audit log entry (fire-and-forget, never blocks the request)
 * @param {Object} options
 * @param {string} options.action - Action name (e.g. 'booking:approve')
 * @param {string} options.performedBy - User ID who performed the action
 * @param {string} [options.targetType] - Target resource type ('booking', 'report', etc.)
 * @param {string} [options.targetId] - Target resource ID
 * @param {string} [options.details] - Human-readable description
 * @param {Object} [options.req] - Express request object (for IP)
 */
const logAction = ({ action, performedBy, targetType = null, targetId = null, details = '', req = null }) => {
    // Fire-and-forget — don't await, don't block the request
    AuditLog.create({
        action,
        performedBy,
        targetType,
        targetId,
        details,
        ipAddress: req ? (req.headers['x-forwarded-for'] || req.ip || '') : ''
    }).catch(err => {
        console.error('[AuditLog] Failed to write:', err.message);
    });
};

module.exports = { logAction };
