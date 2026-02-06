const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: [true, 'Please add a topic']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
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
        type: [String],
        default: []
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
