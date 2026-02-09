const Booking = require('../models/Booking');
const { sendBookingCreated, sendBookingApproved, sendBookingModified, sendBookingReminder, sendBookingCancelled } = require('../services/emailService');
const { checkRoomAvailability, validateBookingTime, isUrgentBooking } = require('../services/bookingService');

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Public
const getBookings = async (req, res) => {
    try {
        let query;

        // Copy req.query
        const reqQuery = { ...req.query };

        // Fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit'];

        // Loop over removeFields and delete them from reqQuery
        removeFields.forEach(param => delete reqQuery[param]);

        // Support filtering by email (map 'email' query param to 'user.email' path in DB)
        if (reqQuery.email) {
            reqQuery['user.email'] = reqQuery.email;
            delete reqQuery.email;
        }

        // Create query string
        let queryStr = JSON.stringify(reqQuery);

        // Finding resource
        query = Booking.find(JSON.parse(queryStr)).populate({
            path: 'room',
            select: 'name capacity'
        });

        // Executing query
        const bookings = await query;

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private (logged in users)
const createBooking = async (req, res) => {
    try {
        const { room, startTime, endTime } = req.body;

        // Validate start time
        const timeValidation = validateBookingTime(startTime);
        if (!timeValidation.valid) {
            return res.status(400).json({ success: false, error: timeValidation.error });
        }

        // Check for availability
        const isAvailable = await checkRoomAvailability(room, startTime, endTime);
        if (!isAvailable) {
            return res.status(400).json({ success: false, error: 'ห้องนี้ถูกจองแล้วในช่วงเวลาดังกล่าว' });
        }

        let booking = await Booking.create(req.body);

        // Populate room details for email
        booking = await booking.populate('room');

        // Send Email Notification
        await sendBookingCreated(booking);

        // Check for urgent booking (starts within 1 hour)
        if (isUrgentBooking(startTime)) {
            console.log(`Urgent booking detected: ${booking._id}. Sending immediate reminder.`);
            await sendBookingReminder(booking);
            // Mark as reminded so cron doesn't send duplicate
            booking.reminderSent = true;
            await booking.save();
        }

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update a booking (Approve/Reject/Modify Time)
// @route   PUT /api/bookings/:id
// @access  Private (students can cancel own, admin can do all)
const updateBooking = async (req, res) => {
    try {
        const originalBooking = await Booking.findById(req.params.id);
        if (!originalBooking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        // Authorization check
        const isOwner = originalBooking.user.email === req.user.email;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์แก้ไขการจองนี้' });
        }

        // Students can only cancel their own pending bookings
        if (!isAdmin) {
            if (req.body.status !== 'cancelled') {
                return res.status(403).json({ success: false, error: 'นักศึกษาสามารถยกเลิกการจองได้เท่านั้น' });
            }
            if (originalBooking.status !== 'pending') {
                return res.status(403).json({ success: false, error: 'สามารถยกเลิกได้เฉพาะการจองที่รออนุมัติเท่านั้น' });
            }
        }

        const oldStartTime = originalBooking.startTime;
        const oldEndTime = originalBooking.endTime;

        // Check for time modification and availability
        if (req.body.startTime || req.body.endTime) {
            const newStartTime = req.body.startTime || oldStartTime;
            const newEndTime = req.body.endTime || oldEndTime;

            // Validate time (if start time changed)
            if (req.body.startTime) {
                const timeValidation = validateBookingTime(newStartTime);
                if (!timeValidation.valid) {
                    return res.status(400).json({ success: false, error: timeValidation.error });
                }
            }

            // Check availability (exclude current booking)
            const isAvailable = await checkRoomAvailability(
                req.body.room || originalBooking.room,
                newStartTime,
                newEndTime,
                req.params.id
            );

            if (!isAvailable) {
                return res.status(400).json({ success: false, error: 'ห้องนี้ถูกจองแล้วในช่วงเวลาดังกล่าว' });
            }
        }

        let booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('room');



        // Send Email if Cancelled
        if (req.body.status === 'cancelled' && originalBooking.status !== 'cancelled') {
            await sendBookingCancelled(booking);
        }

        // Send Email if Approved
        if (req.body.status === 'approved' && originalBooking.status !== 'approved') {
            await sendBookingApproved(booking);
        }

        // Send Email if Time was Modified (and not just status change)
        const timeChanged = (req.body.startTime && new Date(req.body.startTime).getTime() !== new Date(oldStartTime).getTime()) ||
            (req.body.endTime && new Date(req.body.endTime).getTime() !== new Date(oldEndTime).getTime());

        if (timeChanged) {
            await sendBookingModified(booking, oldStartTime, oldEndTime);
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Public
const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        await booking.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};



// @desc    Import bookings from Excel
// @route   POST /api/bookings/import
// @access  Private (Admin only)
const importBookings = async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ success: false, error: 'Please upload an Excel file' });
        }

        let xlsx;
        try {
            xlsx = require('xlsx');
        } catch (e) {
            console.error('Failed to load xlsx module:', e);
            return res.status(500).json({ success: false, error: 'Server Error: xlsx dependency missing. Please restart server.' });
        }

        const Room = require('../models/Room');

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);


        let semesterStart = req.body.startDate ? new Date(req.body.startDate) : new Date();
        let semesterEnd = req.body.endDate ? new Date(req.body.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 4));

        // Helper to map Day string to index (0=Sun, 1=Mon, ..., 6=Sat)
        const getDayIndex = (dayStr) => {
            if (!dayStr) return -1;
            const d = dayStr.toLowerCase().trim();
            console.log(`Mapping day: '${dayStr}' -> '${d}'`);
            const days = {
                'sunday': 0, 'sun': 0, 'อาทิตย์': 0, 'อา': 0,
                'monday': 1, 'mon': 1, 'จันทร์': 1, 'จ': 1,
                'tuesday': 2, 'tue': 2, 'อังคาร': 2, 'อ': 2,
                'wednesday': 3, 'wed': 3, 'พุธ': 3, 'พ': 3,
                'thursday': 4, 'thu': 4, 'พฤหัส': 4, 'พฤหัสบดี': 4, 'พฤ': 4,
                'friday': 5, 'fri': 5, 'ศุกร์': 5, 'ศ': 5,
                'saturday': 6, 'sat': 6, 'เสาร์': 6, 'ส': 6
            };
            return days[d] !== undefined ? days[d] : -1;
        };

        const bookingsToCreate = [];
        let errors = [];

        // 1. Pre-fetch all rooms to optimize (optional, but good for speed)
        // For simplicity, we stick to findOne inside loop or cache if needed.
        // Let's use a simple map for speed if possible, but findOne is safer for exact match.

        for (const [index, row] of data.entries()) {
            const rowNum = index + 2;
            const normalizedRow = {};
            Object.keys(row).forEach(key => normalizedRow[key.toLowerCase()] = row[key]);

            const roomName = normalizedRow['room'];
            const dayStr = normalizedRow['day']; // 'Monday'
            const dateStr = normalizedRow['date']; // Optional: Specific Date fallback
            const startTimeStr = normalizedRow['starttime']; // HH:mm
            const endTimeStr = normalizedRow['endtime']; // HH:mm
            const subject = normalizedRow['subject'] || 'Class';
            const teacher = normalizedRow['teacher'] || 'Unknown';

            if (!roomName || (!dayStr && !dateStr) || !startTimeStr || !endTimeStr) {
                errors.push(`Row ${rowNum}: Missing required fields`);
                continue;
            }

            const room = await Room.findOne({ name: roomName });
            if (!room) {
                errors.push(`Row ${rowNum}: Room '${roomName}' not found`);
                continue;
            }

            // Helper to parse time from Excel (handle both "09:00" string and 0.375 number)
            const parseExcelTime = (val) => {
                if (!val) return null;

                // If it's a number (Excel fraction of day), e.g., 0.5 = 12:00
                if (typeof val === 'number') {
                    const totalSeconds = Math.round(val * 24 * 60 * 60);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    return { h: hours, m: minutes };
                }

                // If it's a string "HH:mm"
                if (typeof val === 'string') {
                    const parts = val.split(':');
                    if (parts.length >= 2) {
                        return { h: parseInt(parts[0]), m: parseInt(parts[1]) };
                    }
                }
                return null;
            };

            const startObj = parseExcelTime(startTimeStr);
            const endObj = parseExcelTime(endTimeStr);

            if (!startObj || !endObj) {
                console.error(`Row ${rowNum}: Invalid time format. Start: ${startTimeStr}, End: ${endTimeStr}`);
                errors.push(`Row ${rowNum}: Invalid time format (${startTimeStr} - ${endTimeStr})`);
                continue;
            }

            // Determine Start/End Times on a dummy date first to validate time format
            const timeParams = (dateObj) => {
                // Return new Date objects combining dateObjYYYY-MM-DD and timeStr
                const y = dateObj.getFullYear();
                const m = dateObj.getMonth();
                const d = dateObj.getDate();
                const s = new Date(y, m, d, startObj.h, startObj.m);
                const e = new Date(y, m, d, endObj.h, endObj.m);
                return { s, e };
            };

            // CASE 1: Recurring Day
            if (dayStr) {
                const targetDayIndex = getDayIndex(dayStr);
                if (targetDayIndex === -1) {
                    errors.push(`Row ${rowNum}: Invalid day '${dayStr}'`);
                    continue;
                }

                // Loop through semester range
                let loopDate = new Date(semesterStart);
                while (loopDate <= semesterEnd) {
                    if (loopDate.getDay() === targetDayIndex) {
                        const { s, e } = timeParams(loopDate);

                        // Add to batch
                        bookingsToCreate.push({
                            room: room._id,
                            topic: subject,
                            note: 'Imported Schedule',
                            user: { name: teacher, email: 'imported@system.com', department: 'Imported' },
                            startTime: s,
                            endTime: e,
                            status: 'approved',
                            isImported: true
                        });
                    }
                    loopDate.setDate(loopDate.getDate() + 1);
                }
            }
            // CASE 2: Specific Date
            else if (dateStr) {
                const specificDate = new Date(dateStr);
                if (isNaN(specificDate.getTime())) {
                    errors.push(`Row ${rowNum}: Invalid date format`);
                    continue;
                }
                const { s, e } = timeParams(specificDate);
                bookingsToCreate.push({
                    room: room._id,
                    topic: subject,
                    note: 'Imported Schedule',
                    user: { name: teacher, email: 'admin@system.com', department: 'Imported' },
                    startTime: s,
                    endTime: e,
                    status: 'approved'
                });
            }
        }

        // Bulk Insert
        if (bookingsToCreate.length > 0) {
            await Booking.insertMany(bookingsToCreate);
        }

        res.status(200).json({
            success: true,
            count: bookingsToCreate.length,
            errors: errors,
            message: `Imported ${bookingsToCreate.length} bookings. ${errors.length} errors.`
        });

    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ success: false, error: 'Failed to process file: ' + error.message });
    }
};


// @desc    Delete all imported bookings
// @route   DELETE /api/bookings/import
// @access  Private (Admin only)
const deleteImportedBookings = async (req, res) => {
    try {
        // Delete if isImported is true OR if department is 'Imported' (for legacy imports)
        const result = await Booking.deleteMany({
            $or: [
                { isImported: true },
                { 'user.department': 'Imported' }
            ]
        });
        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} imported bookings`,
            count: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getBookings,
    createBooking,
    updateBooking,
    deleteBooking,
    importBookings,
    deleteImportedBookings
};
