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
            reporter: req.user._id,
            images: []
        });

        res.status(201).json({
            success: true,
            data: report
        });

        logAction({
            action: 'report:create',
            performedBy: req.user._id,
            targetType: 'report',
            targetId: report._id,
            details: `แจ้งปัญหา: ${report.topic}`,
            req
        });

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
        const status = sanitizeEnumValue(req.body?.status, {
            fieldName: 'Status',
            allowedValues: ['pending', 'in_progress', 'resolved', 'rejected']
        });

        let report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        report.status = status;
        report.updatedAt = Date.now();
        await report.save();

        report = await Report.findById(req.params.id)
            .populate('reporter', 'name email picture studentId phone')
            .populate('room', 'name');

        res.status(200).json({
            success: true,
            data: report
        });

        logAction({
            action: 'report:update_status',
            performedBy: req.user._id,
            targetType: 'report',
            targetId: report._id,
            details: `เปลี่ยนสถานะ: ${status}`,
            req
        });

        const io = req.app.get('io');
        emitReportUpdatedNotification(io, report);
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Report validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

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
    updateReportStatus
};
