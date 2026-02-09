const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'กรุณากรอกอีเมลที่ถูกต้อง']
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
    isBanned: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);

