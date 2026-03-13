const User = require('../models/User');
const admin = require('../config/firebaseAdmin');
const { logAction } = require('../services/auditService');

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
                    error: 'กรุณาใช้อีเมล @kmutnb.ac.th หรือ @email.kmutnb.ac.th เท่านั้น',
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
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Check if user is banned
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

        // Audit log
        logAction({ action: 'user:login', performedBy: user._id, targetType: 'user', targetId: user._id, details: `เข้าสู่ระบบ: ${email}`, req });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private (Protected by auth middleware)
const getCurrentUser = async (req, res) => {
    try {
        // Use authenticated user from middleware
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Public (Protected by frontend usually)
const updateProfile = async (req, res) => {
    try {
        const { name, phone, studentId, faculty } = req.body;

        // Use authenticated user from middleware (not from request body)
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Update fields (only allow specific fields)
        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (studentId !== undefined) user.studentId = studentId;
        if (faculty !== undefined) user.faculty = faculty;

        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, error: error.message });
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

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });
        }

        // Compare with server-side PIN
        const adminPin = process.env.ADMIN_PIN;
        if (!adminPin) {
            console.error('ADMIN_PIN environment variable is not set!');
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }
        if (pin === adminPin) {
            return res.status(200).json({ success: true, message: 'PIN verified' });
        } else {
            return res.status(401).json({ success: false, error: 'PIN ไม่ถูกต้อง' });
        }
    } catch (error) {
        console.error('Verify PIN Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    googleLogin,
    getCurrentUser,
    updateProfile,
    verifyAdminPin
};
