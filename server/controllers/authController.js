const User = require('../models/User');

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
        let { email, name, picture } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
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

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Public (Protected by frontend usually)
const getCurrentUser = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, error: 'Email required' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });

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
        const { email, name, phone, studentId, faculty } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (studentId) user.studentId = studentId;
        if (faculty) user.faculty = faculty;

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
        const adminPin = process.env.ADMIN_PIN || '22885693';
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
