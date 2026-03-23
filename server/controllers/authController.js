const User = require('../models/User');
const admin = require('../config/firebaseAdmin');
const { logAction } = require('../services/auditService');
const { createAdminPinToken } = require('../services/adminPinTokenService');

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

        // Verify Firebase ID Token (server-side verification)
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

        // Extract verified user info from token
        let email = decodedToken.email;
        const name = decodedToken.name || decodedToken.display_name || '';
        const picture = decodedToken.picture || '';

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email not found in token' });
        }

        // Normalize email to lowercase
        email = email.toLowerCase().trim();

        // Check if user exists (to allow existing admins)
        const existingUser = await User.findOne({ email });

        // If new user or not admin, validate email domain
        if (!existingUser || existingUser.role !== 'admin') {
            if (!isAllowedEmail(email)) {
                return res.status(403).json({
                    success: false,
                    error: 'à¸à¸£à¸¸à¸“à¸²à¹ƒà¸Šà¹‰à¸­à¸µà¹€à¸¡à¸¥ @kmutnb.ac.th à¸«à¸£à¸·à¸­ @email.kmutnb.ac.th à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™',
                    code: 'INVALID_EMAIL_DOMAIN'
                });
            }
        }

        // Prepare update data
        const updateData = {
            name,
            picture,
        };

        // For role='student', we only set it on insert (don't overwrite if they were manually promoted)
        const setOnInsert = { role: 'student' };

        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: updateData,
                $setOnInsert: setOnInsert
            },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                error: 'à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¸„à¸¸à¸“à¸–à¸¹à¸à¸£à¸°à¸‡à¸±à¸šà¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ à¸à¸£à¸¸à¸“à¸²à¸•à¸´à¸”à¸•à¹ˆà¸­à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸š',
                code: 'BANNED_USER'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

        // Audit log
        logAction({ action: 'user:login', performedBy: user._id, targetType: 'user', targetId: user._id, details: `à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸š: ${email}`, req });

    } catch (error) {
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

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (studentId !== undefined) user.studentId = studentId;
        if (faculty !== undefined) user.faculty = faculty;

        await user.save();

        res.status(200).json({ success: true, data: user });
        logAction({ action: 'user:update_profile', performedBy: user._id, targetType: 'user', targetId: user._id, details: 'à¹à¸à¹‰à¹„à¸‚à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸•à¸±à¸§', req });
    } catch (error) {
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
            return res.status(403).json({ success: false, error: 'à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸‚à¹‰à¸²à¸–à¸¶à¸‡' });
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
            return res.status(401).json({ success: false, error: 'PIN à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' });
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

module.exports = {
    googleLogin,
    getCurrentUser,
    updateProfile,
    verifyAdminPin
};
