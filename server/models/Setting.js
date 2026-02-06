const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    systemName: {
        type: String,
        default: 'ระบบจองห้องประชุมออนไลน์'
    },
    contactEmail: {
        type: String,
        default: 'admin@example.com'
    },
    themeColor: {
        type: String,
        default: '#16a34a'
    },
    maxBookingDays: {
        type: Number,
        default: 30
    },
    maxBookingHours: {
        type: Number,
        default: 4
    },
    requireApproval: {
        type: Boolean,
        default: true
    },
    weekendBooking: {
        type: Boolean,
        default: false
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    openTime: {
        type: String,
        default: '08:00'
    },
    closeTime: {
        type: String,
        default: '20:00'
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
