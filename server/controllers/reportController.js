const mongoose = require('mongoose');
const Report = require('../models/Report');
const Room = require('../models/Room');
const { logAction } = require('../services/auditService');
const {
    emitReportCreatedNotification,
    emitReportUpdatedNotification
} = require('../services/adminNotificationService');
const {
    FIELD_LIMITS,
    sanitizeRequiredSingleLineText,
    sanitizeRequiredMultilineText,
    sanitizeEnumValue,
    getValidationErrorResponse
} = require('../utils/inputValidation');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private (Student/Admin)
const createReport = async (req, res) => {
    try {
        const { topic, description, urgency, roomId, images } = req.body;
        const sanitizedTopic = sanitizeRequiredSingleLineText(topic, {
            fieldName: 'Topic',
            maxLength: FIELD_LIMITS.REPORT_TOPIC
        });
        const sanitizedDescription = sanitizeRequiredMultilineText(description, {
            fieldName: 'Description',
            maxLength: FIELD_LIMITS.REPORT_DESCRIPTION
        });
        const sanitizedUrgency = sanitizeEnumValue(urgency, {
            fieldName: 'Urgency',
            allowedValues: ['normal', 'urgent', 'emergency'],
            defaultValue: 'normal'
        });

        if (images !== undefined && (!Array.isArray(images) || images.length > 0)) {
            return res.status(400).json({
                success: false,
                error: 'Report image uploads are not supported yet',
                code: 'UNSUPPORTED_REPORT_IMAGES'
            });
        }

        // Handle "other" or empty roomId
        let roomToSave = null;
        const normalizedRoomId = typeof roomId === 'string' ? roomId.trim() : roomId;
        if (normalizedRoomId && normalizedRoomId !== 'other') {
            if (!mongoose.isValidObjectId(normalizedRoomId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Selected room is invalid',
                    code: 'INVALID_ROOM'
                });
            }

            const room = await Room.findById(normalizedRoomId).select('_id');
            if (!room) {
                return res.status(404).json({
                    success: false,
                    error: 'Selected room was not found',
                    code: 'ROOM_NOT_FOUND'
                });
            }

            roomToSave = room._id;
        }

        const report = await Report.create({
            topic: sanitizedTopic,
            description: sanitizedDescription,
            urgency: sanitizedUrgency,
            room: roomToSave,
            reporter: req.user._id, // Assumes auth middleware sets req.user
            images: []
        });

        res.status(201).json({
            success: true,
            data: report
        });

        // Audit log
        logAction({ action: 'report:create', performedBy: req.user._id, targetType: 'report', targetId: report._id, details: `แจ้งปัญหา: ${report.topic}`, req });

        // Emit real-time notification to admin room
        const io = req.app.get('io');
        emitReportCreatedNotification(io, report);

    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Report validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

        console.error('Create Report Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get reports submitted by current user
// @route   GET /api/reports/my
// @access  Private
const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ reporter: req.user._id })
            .populate('room', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get all reports (Admin)
// @route   GET /api/reports
// @access  Private (Admin)
const getAllReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('reporter', 'name email picture studentId phone')
            .populate('room', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update report status
// @route   PUT /api/reports/:id/status
// @access  Private (Admin)
const updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;

        let report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        report.status = status;
        report.updatedAt = Date.now();
        await report.save();

        res.status(200).json({
            success: true,
            data: report
        });

        // Audit log
        logAction({ action: 'report:update_status', performedBy: req.user._id, targetType: 'report', targetId: report._id, details: `เปลี่ยนสถานะ: ${status}`, req });

        // Emit real-time notification
        const io = req.app.get('io');
        emitReportUpdatedNotification(io, report);

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Set room maintenance status (disable/enable room)
// @route   PUT /api/reports/:id/maintenance
// @access  Private (Admin)
const setRoomMaintenance = async (req, res) => {
    try {
        const { isActive } = req.body;

        let report = await Report.findById(req.params.id).populate('room');

        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        if (!report.room) {
            return res.status(400).json({ success: false, error: 'ไม่มีห้องที่เกี่ยวข้องกับรายงานนี้' });
        }

        // Update room status
        await Room.findByIdAndUpdate(report.room._id, { isActive });

        // Update report status
        report.status = !isActive ? 'in_progress' : 'resolved';
        report.updatedAt = Date.now();
        await report.save();

        // Re-fetch to get updated data
        report = await Report.findById(req.params.id)
            .populate('reporter', 'name email picture studentId phone')
            .populate('room', 'name isActive');

        res.status(200).json({
            success: true,
            data: report,
            message: isActive ? 'เปิดใช้งานห้องแล้ว' : 'ปิดห้องเพื่อซ่อมบำรุง'
        });

        // Audit log
        logAction({ action: 'report:set_maintenance', performedBy: req.user._id, targetType: 'room', targetId: report.room._id, details: isActive ? 'เปิดใช้งานห้อง' : 'ปิดห้องซ่อมบำรุง', req });
        const io = req.app.get('io');
        emitReportUpdatedNotification(io, report);
    } catch (error) {
        console.error('Set Maintenance Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get report notification summary (Admin)
// @route   GET /api/reports/notification-summary
// @access  Private (Admin)
const getReportNotificationSummary = async (req, res) => {
    try {
        const pendingCount = await Report.countDocuments({ status: 'pending' });

        res.status(200).json({
            success: true,
            data: {
                pendingCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    createReport,
    getMyReports,
    getAllReports,
    getReportNotificationSummary,
    updateReportStatus,
    setRoomMaintenance
};
