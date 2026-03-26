const mongoose = require('mongoose');
const { FIELD_LIMITS } = require('../utils/inputValidation');

const reportSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: [true, 'Please add a topic'],
        trim: true,
        maxlength: [FIELD_LIMITS.REPORT_TOPIC, `Topic must be ${FIELD_LIMITS.REPORT_TOPIC} characters or fewer`]
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: [FIELD_LIMITS.REPORT_DESCRIPTION, `Description must be ${FIELD_LIMITS.REPORT_DESCRIPTION} characters or fewer`]
    },
    urgency: {
        type: String,
        enum: ['normal', 'urgent', 'emergency'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'rejected'],
        default: 'pending'
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: false // Optional, can be a general building issue
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    images: {
        type: [{
            type: String,
            trim: true,
            maxlength: [300, 'Image reference must be 300 characters or fewer']
        }],
        default: [],
        validate: {
            validator: (value) => Array.isArray(value) && value.length <= 5,
            message: 'A report can contain at most 5 images'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});



module.exports = mongoose.model('Report', reportSchema);
