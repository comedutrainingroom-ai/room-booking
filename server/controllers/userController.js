const User = require('../models/User');
const { sendAdminContactEmail, sendBanNotification, sendUnbanNotification } = require('../services/emailService');
const { logAction } = require('../services/auditService');
const { revokeAdminPinSessionsForUser } = require('../services/adminPinTokenService');
const {
    FIELD_LIMITS,
    getValidationErrorResponse,
    sanitizeRequiredMultilineText,
    sanitizeRequiredSingleLineText
} = require('../utils/inputValidation');

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
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
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
            { returnDocument: 'after', runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        res.status(200).json({
            success: true,
            data: user,
            message: `เปลี่ยน role เป็น ${role} แล้ว`
        });

        if (role !== 'admin') {
            revokeAdminPinSessionsForUser(user._id);
        }

        // Audit log
        logAction({ action: 'user:update_role', performedBy: req.user._id, targetType: 'user', targetId: user._id, details: `เปลี่ยนสิทธิ์ผู้ใช้ ${user.email} เป็น ${role}`, req });
    } catch (error) {
        console.error('Update User Role Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
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
            { returnDocument: 'after', runValidators: true }
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

        if (isBanned) {
            revokeAdminPinSessionsForUser(user._id);
        }

        // Audit log
        logAction({ action: isBanned ? 'user:ban' : 'user:unban', performedBy: req.user._id, targetType: 'user', targetId: user._id, details: isBanned ? `แบนผู้ใช้ ${user.email} เหตุผล: ${reason || 'ไม่ได้ระบุ'}` : `ปลดแบนผู้ใช้ ${user.email}`, req });
    } catch (error) {
        console.error('Toggle Ban Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
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

        revokeAdminPinSessionsForUser(user._id);

        // Audit log
        logAction({ action: 'user:delete', performedBy: req.user._id, targetType: 'user', targetId: req.params.id, details: `ลบผู้ใช้ ${user.email}`, req });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Contact a user by email
// @route   POST /api/users/:id/contact
// @access  Private/Admin
const contactUser = async (req, res) => {
    try {
        const subject = sanitizeRequiredSingleLineText(req.body?.subject, {
            fieldName: 'Email subject',
            maxLength: FIELD_LIMITS.ADMIN_CONTACT_SUBJECT
        });
        const message = sanitizeRequiredMultilineText(req.body?.message, {
            fieldName: 'Email message',
            maxLength: FIELD_LIMITS.ADMIN_CONTACT_MESSAGE
        });

        const user = await User.findById(req.params.id).select('-__v');

        if (!user) {
            return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        const deliveryResult = await sendAdminContactEmail({
            recipient: user,
            adminUser: req.user,
            subject,
            message
        });

        if (!deliveryResult?.success) {
            const statusCode = deliveryResult?.code === 'EMAIL_NOT_CONFIGURED' ? 503 : 500;
            return res.status(statusCode).json({
                success: false,
                error: 'ไม่สามารถส่งอีเมลได้ในขณะนี้',
                code: deliveryResult?.code || 'EMAIL_SEND_FAILED'
            });
        }

        res.status(200).json({
            success: true,
            message: 'ส่งอีเมลติดต่อผู้ใช้เรียบร้อยแล้ว'
        });

        logAction({
            action: 'user:contact',
            performedBy: req.user._id,
            targetType: 'user',
            targetId: user._id,
            details: `ส่งอีเมลติดต่อ ${user.email} หัวข้อ: ${subject}`,
            req
        });
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Contact validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

        console.error('Contact User Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getAllUsers,
    updateUserRole,
    toggleBanUser,
    deleteUser,
    contactUser
};
