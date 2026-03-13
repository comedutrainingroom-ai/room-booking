const User = require('../models/User');
const { sendBanNotification, sendUnbanNotification } = require('../services/emailService');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-__v')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['student', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Role ไม่ถูกต้อง' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        res.status(200).json({
            success: true,
            data: user,
            message: `เปลี่ยน role เป็น ${role} แล้ว`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Ban/Unban user
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
const toggleBanUser = async (req, res) => {
    try {
        const { isBanned, reason } = req.body;

        // Prevent admin from banning themselves
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'ไม่สามารถแบนตัวเองได้' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBanned },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        // Send ban/unban notification email
        if (isBanned) {
            sendBanNotification(user, reason || null);
        } else {
            sendUnbanNotification(user);
        }

        res.status(200).json({
            success: true,
            data: user,
            message: isBanned ? 'แบนผู้ใช้แล้ว' : 'ปลดแบนผู้ใช้แล้ว'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'ไม่สามารถลบตัวเองได้' });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        res.status(200).json({
            success: true,
            message: 'ลบผู้ใช้แล้ว'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllUsers,
    updateUserRole,
    toggleBanUser,
    deleteUser
};
