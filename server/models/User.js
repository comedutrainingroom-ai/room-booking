const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: String,
    picture: String,
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    studentId: String,
    phone: String,
    faculty: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
