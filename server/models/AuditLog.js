const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'user:login',
            'booking:create', 'booking:approve', 'booking:reject', 'booking:cancel',
            'booking:modify', 'booking:delete', 'booking:import', 'booking:delete_imported',
            'report:create', 'report:update_status', 'report:set_maintenance',
            'settings:update',
            'user:update_profile', 'user:ban', 'user:unban'
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: ['booking', 'report', 'user', 'settings', 'room', null],
        default: null
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    details: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-expire logs after 90 days (optional, saves storage)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
