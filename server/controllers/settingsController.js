const Setting = require('../models/Setting');
const { logAction } = require('../services/auditService');

const buildPublicSettings = (settings) => ({
    systemName: settings.systemName,
    contactEmail: settings.contactEmail,
    themeColor: settings.themeColor,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
    maxBookingHours: settings.maxBookingHours,
    maxBookingDays: settings.maxBookingDays,
    requireApproval: settings.requireApproval,
    weekendBooking: settings.weekendBooking,
    loginGuide: settings.loginGuide
});

const buildRuntimeSettings = (settings) => ({
    ...buildPublicSettings(settings),
    maintenanceMode: settings.maintenanceMode
});

const getOrCreateSettings = async () => {
    let settings = await Setting.findOne();

    if (!settings) {
        settings = await Setting.create({});
    }

    return settings;
};

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public
const getPublicSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();

        res.status(200).json({
            success: true,
            data: buildPublicSettings(settings)
        });
    } catch (error) {
        console.error('Get Public Settings Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get runtime settings for authenticated users
// @route   GET /api/settings/runtime
// @access  Private
const getRuntimeSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();

        res.status(200).json({
            success: true,
            data: buildRuntimeSettings(settings)
        });
    } catch (error) {
        console.error('Get Runtime Settings Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get full system settings
// @route   GET /api/settings/admin
// @access  Private/Admin
const getAdminSettings = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get Admin Settings Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();

        // Explicit field selection — prevents mass assignment
        const {
            systemName,
            contactEmail,
            themeColor,
            openTime,
            closeTime,
            maxBookingHours,
            maxBookingDays,
            weekendBooking,
            requireApproval,
            maintenanceMode,
            loginGuide
        } = req.body;
        const updateData = {
            systemName,
            contactEmail,
            themeColor,
            openTime,
            closeTime,
            maxBookingHours,
            maxBookingDays,
            weekendBooking,
            requireApproval,
            maintenanceMode,
            loginGuide
        };

        if (!settings) {
            settings = await Setting.create(updateData);
        } else {
            settings = await Setting.findByIdAndUpdate(settings._id, updateData, {
                returnDocument: 'after',
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
        console.error('Update Settings Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getPublicSettings,
    getRuntimeSettings,
    getAdminSettings,
    updateSettings
};
