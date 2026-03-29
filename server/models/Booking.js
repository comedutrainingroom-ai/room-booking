const mongoose = require('mongoose');
const { FIELD_LIMITS, PATTERNS } = require('../utils/inputValidation');

const bookingSchema = mongoose.Schema({
    room: {
        type: mongoose.Schema.ObjectId,
        ref: 'Room',
        required: true
    },
    topic: {
        type: String,
        required: [true, 'Please add a topic'],
        trim: true,
        maxlength: [FIELD_LIMITS.BOOKING_TOPIC, `Topic must be ${FIELD_LIMITS.BOOKING_TOPIC} characters or fewer`]
    },
    note: {
        type: String,
        default: '',
        trim: true,
        maxlength: [FIELD_LIMITS.BOOKING_NOTE, `Note must be ${FIELD_LIMITS.BOOKING_NOTE} characters or fewer`]
    },
    user: {
        name: {
            type: String,
            required: [true, 'Please add a user name'],
            trim: true,
            maxlength: [FIELD_LIMITS.USER_NAME, `User name must be ${FIELD_LIMITS.USER_NAME} characters or fewer`]
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            maxlength: [FIELD_LIMITS.USER_PHONE, `Phone must be ${FIELD_LIMITS.USER_PHONE} characters or fewer`],
            match: [PATTERNS.PHONE, 'Phone format is invalid']
        },
        department: {
            type: String,
            trim: true,
            maxlength: [FIELD_LIMITS.BOOKING_USER_DEPARTMENT, `Department must be ${FIELD_LIMITS.BOOKING_USER_DEPARTMENT} characters or fewer`]
        }
    },
    startTime: {
        type: Date,
        required: [true, 'Please add a start time']
    },
    endTime: {
        type: Date,
        required: [true, 'Please add an end time']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    cancelledByRole: {
        type: String,
        enum: ['student', 'admin']
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: [FIELD_LIMITS.BOOKING_NOTE, `Cancellation reason must be ${FIELD_LIMITS.BOOKING_NOTE} characters or fewer`]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderSentAt: {
        type: Date
    },
    reminderProcessingAt: {
        type: Date
    },
    isImported: {
        type: Boolean,
        default: false
    }
});

// Prevent booking overlap logic could be added here or in controller

module.exports = mongoose.model('Booking', bookingSchema);
