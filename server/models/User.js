const mongoose = require('mongoose');
const { FIELD_LIMITS, PATTERNS } = require('../utils/inputValidation');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'กรุณากรอกอีเมลที่ถูกต้อง']
    },
    name: {
        type: String,
        trim: true,
        maxlength: [FIELD_LIMITS.USER_NAME, `Name must be ${FIELD_LIMITS.USER_NAME} characters or fewer`],
        default: ''
    },
    picture: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    studentId: {
        type: String,
        trim: true,
        maxlength: [FIELD_LIMITS.USER_STUDENT_ID, `Student ID must be ${FIELD_LIMITS.USER_STUDENT_ID} characters or fewer`],
        match: [PATTERNS.STUDENT_ID, 'Student ID format is invalid'],
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [FIELD_LIMITS.USER_PHONE, `Phone must be ${FIELD_LIMITS.USER_PHONE} characters or fewer`],
        match: [PATTERNS.PHONE, 'Phone format is invalid'],
        default: ''
    },
    faculty: {
        type: String,
        trim: true,
        maxlength: [FIELD_LIMITS.USER_FACULTY, `Faculty must be ${FIELD_LIMITS.USER_FACULTY} characters or fewer`],
        default: ''
    },
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

