const Report = require('../models/Report');
const Room = require('../models/Room');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private (Student/Admin)
const createReport = async (req, res) => {
    try {
        const { topic, description, urgency, roomId, images } = req.body;

        // Handle "other" or empty roomId
        let roomToSave = null;
        if (roomId && roomId !== 'other') {
            roomToSave = roomId;
        }

        const report = await Report.create({
            topic,
            description,
            urgency,
            room: roomToSave,
            reporter: req.user._id, // Assumes auth middleware sets req.user
            images: images || []
        });

        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Create Report Error:', error);
        res.status(500).json({ success: false, error: error.message });
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
        await report.save();

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus
};
