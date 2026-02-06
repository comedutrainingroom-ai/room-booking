const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
    room: {
        type: mongoose.Schema.ObjectId,
        ref: 'Room',
        required: true
    },
    topic: {
        type: String,
        required: [true, 'Please add a topic']
    },
    note: {
        type: String,
        default: ''
    },
    user: {
        name: {
            type: String,
            required: [true, 'Please add a user name']
        },
        email: {
            type: String,
            required: [true, 'Please add an email']
        },
        phone: String,
        department: String
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    isImported: {
        type: Boolean,
        default: false
    }
});

// Prevent booking overlap logic could be added here or in controller

module.exports = mongoose.model('Booking', bookingSchema);
