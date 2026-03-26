const User = require('../models/User');
const admin = require('../config/firebaseAdmin');
const { logAction } = require('../services/auditService');
const {
    TOKEN_HEADER_NAME,
    createAdminPinToken,
    revokeAdminPinToken
} = require('../services/adminPinTokenService');
const {
    FIELD_LIMITS,
    PATTERNS,
    sanitizeOptionalSingleLineText,
    getValidationErrorResponse
} = require('../utils/inputValidation');

// Allowed email domains for KMUTNB
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || 'kmutnb.ac.th,email.kmutnb.ac.th').split(',');

const isAllowedEmail = (email) => {
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
};

// @desc    Sync Firebase User with MongoDB (Create or Update)
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, error: 'ID Token is required' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError.message);
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        let email = decodedToken.email;
        const name = decodedToken.name || decodedToken.display_name || '';
        const picture = decodedToken.picture || '';

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email not found in token' });
        }

        email = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email });

        if (!existingUser || existingUser.role !== 'admin') {
            if (!isAllowedEmail(email)) {
                return res.status(403).json({
                    success: false,
                    error: 'กรุณาใช้อีเมล @kmutnb.ac.th หรือ @email.kmutnb.ac.th เท่านั้น',
                    code: 'INVALID_EMAIL_DOMAIN'
                });
            }
        }

        const updateData = {
            name,
            picture
        };

        const setOnInsert = { role: 'student' };

        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: updateData,
                $setOnInsert: setOnInsert
            },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                error: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
                code: 'BANNED_USER'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

        logAction({
            action: 'user:login',
            performedBy: user._id,
            targetType: 'user',
            targetId: user._id,
            details: `เข้าสู่ระบบ: ${email}`,
            req
        });
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Login validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

        console.error('Google Login Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private (Protected by auth middleware)
const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Get Current User Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { name, phone, studentId, faculty } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (name !== undefined) {
            user.name = sanitizeOptionalSingleLineText(name, {
                fieldName: 'Name',
                maxLength: FIELD_LIMITS.USER_NAME,
                emptyValue: ''
            });
        }

        if (phone !== undefined) {
            user.phone = sanitizeOptionalSingleLineText(phone, {
                fieldName: 'Phone',
                maxLength: FIELD_LIMITS.USER_PHONE,
                pattern: PATTERNS.PHONE,
                emptyValue: ''
            });
        }

        if (studentId !== undefined) {
            user.studentId = sanitizeOptionalSingleLineText(studentId, {
                fieldName: 'Student ID',
                maxLength: FIELD_LIMITS.USER_STUDENT_ID,
                pattern: PATTERNS.STUDENT_ID,
                emptyValue: ''
            });
        }

        if (faculty !== undefined) {
            user.faculty = sanitizeOptionalSingleLineText(faculty, {
                fieldName: 'Faculty',
                maxLength: FIELD_LIMITS.USER_FACULTY,
                emptyValue: ''
            });
        }

        await user.save();

        res.status(200).json({ success: true, data: user });
        logAction({
            action: 'user:update_profile',
            performedBy: user._id,
            targetType: 'user',
            targetId: user._id,
            details: 'แก้ไขข้อมูลส่วนตัว',
            req
        });
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Profile validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Verify Admin PIN (2nd Factor)
// @route   POST /api/auth/verify-pin
// @access  Private (Admin only)
const verifyAdminPin = async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ success: false, error: 'PIN is required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });
        }

        const adminPin = process.env.ADMIN_PIN;
        if (!adminPin) {
            console.error('ADMIN_PIN environment variable is not set!');
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }

        const crypto = require('crypto');
        const pinBuffer = Buffer.from(pin);
        const adminPinBuffer = Buffer.from(adminPin);

        const pinMatch = pinBuffer.length === adminPinBuffer.length &&
            crypto.timingSafeEqual(pinBuffer, adminPinBuffer);

        if (!pinMatch) {
            return res.status(401).json({ success: false, error: 'PIN ไม่ถูกต้อง' });
        }

        const { token, expiresAt } = createAdminPinToken({
            userId: req.user._id,
            email: req.user.email
        });

        return res.status(200).json({
            success: true,
            message: 'PIN verified',
            data: {
                adminPinToken: token,
                expiresAt
            }
        });
    } catch (error) {
        console.error('Verify PIN Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Revoke the current Admin PIN session
// @route   POST /api/auth/logout-pin
// @access  Private (Admin only)
const logoutAdminPin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'ไม่อนุญาตให้เข้าถึง' });
        }

        const adminPinToken = req.headers[TOKEN_HEADER_NAME];

        if (adminPinToken) {
            revokeAdminPinToken(adminPinToken);
        }

        return res.status(200).json({
            success: true,
            message: 'Admin PIN session cleared'
        });
    } catch (error) {
        console.error('Logout PIN Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    googleLogin,
    getCurrentUser,
    updateProfile,
    verifyAdminPin,
    logoutAdminPin
};
