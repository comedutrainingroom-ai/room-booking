const Setting = require('../models/Setting');
const { logAction } = require('../services/auditService');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private/Admin (public for demo)
const getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();

        // If no settings exist, create default
        if (!settings) {
            settings = await Setting.create({});
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();

        if (!settings) {
            settings = await Setting.create(req.body);
        } else {
            settings = await Setting.findByIdAndUpdate(settings._id, req.body, {
                new: true,
                runValidators: true
            });
        }

        res.status(200).json({
            success: true,
            data: settings
        });

        // Audit log
        if (req.user) {
            logAction({ action: 'settings:update', performedBy: req.user._id, targetType: 'settings', targetId: settings._id, details: `แก้ไขการตั้งค่าระบบ`, req });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
