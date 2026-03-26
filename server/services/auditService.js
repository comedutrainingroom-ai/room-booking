const AuditLog = require('../models/AuditLog');

const MAX_AUDIT_DETAILS_LENGTH = 500;
const MAX_AUDIT_IP_LENGTH = 100;

const normalizeAuditDetails = (details) => String(details || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_AUDIT_DETAILS_LENGTH);

const extractClientIp = (req) => {
    if (!req) {
        return '';
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : String(forwardedFor || req.ip || '').split(',')[0];

    return String(rawIp || '')
        .trim()
        .slice(0, MAX_AUDIT_IP_LENGTH);
};

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
    AuditLog.create({
        action,
        performedBy,
        targetType,
        targetId,
        details: normalizeAuditDetails(details),
        ipAddress: extractClientIp(req)
    }).catch((err) => {
        console.error('[AuditLog] Failed to write:', err.message);
    });
};

module.exports = { logAction };
