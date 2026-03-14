const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Setting = require('../models/Setting');
const { sendBookingCreated, sendBookingApproved, sendBookingModified, sendBookingReminder, sendBookingCancelled } = require('../services/emailService');
const { checkRoomAvailability, validateBookingTime, isUrgentBooking } = require('../services/bookingService');
const { logAction } = require('../services/auditService');

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

        // Check if room exists and is active
        const targetRoom = await Room.findById(room);
        if (!targetRoom) {
            return res.status(404).json({ success: false, error: 'ไม่พบห้องที่ต้องการจอง' });
        }
        if (!targetRoom.isActive) {
            return res.status(400).json({ success: false, error: 'ห้องนี้กำลังปิดซ่อมบำรุง ไม่สามารถจองได้ในขณะนี้' });
        }

        // --- Enforce system settings ---
        const settings = await Setting.findOne();
        if (settings) {
            const start = new Date(startTime);
            const end = new Date(endTime);

            // 1. Check maxBookingHours
            const durationHours = (end - start) / (1000 * 60 * 60);
            if (settings.maxBookingHours && durationHours > settings.maxBookingHours) {
                return res.status(400).json({
                    success: false,
                    error: `ไม่สามารถจองเกิน ${settings.maxBookingHours} ชั่วโมงต่อครั้ง (คุณเลือก ${durationHours} ชั่วโมง)`
                });
            }

            // 2. Check maxBookingDays (advance booking limit)
            if (settings.maxBookingDays) {
                const now = new Date();
                const diffDays = (start - now) / (1000 * 60 * 60 * 24);
                if (diffDays > settings.maxBookingDays) {
                    return res.status(400).json({
                        success: false,
                        error: `ไม่สามารถจองล่วงหน้าเกิน ${settings.maxBookingDays} วัน`
                    });
                }
            }

            // 3. Check weekendBooking
            if (!settings.weekendBooking) {
                const dayOfWeek = start.getDay(); // 0=Sun, 6=Sat
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    return res.status(400).json({
                        success: false,
                        error: 'ไม่อนุญาตให้จองในวันเสาร์-อาทิตย์'
                    });
                }
            }

            // 4. Check openTime/closeTime
            if (settings.openTime && settings.closeTime) {
                const [openH, openM] = settings.openTime.split(':').map(Number);
                const [closeH, closeM] = settings.closeTime.split(':').map(Number);
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const endMinutes = end.getHours() * 60 + end.getMinutes();
                const openMinutes = openH * 60 + (openM || 0);
                const closeMinutes = closeH * 60 + (closeM || 0);

                if (startMinutes < openMinutes || endMinutes > closeMinutes) {
                    return res.status(400).json({
                        success: false,
                        error: `สามารถจองได้เฉพาะช่วงเวลา ${settings.openTime} - ${settings.closeTime} เท่านั้น`
                    });
                }
            }
        }

        // Check for availability
        const isAvailable = await checkRoomAvailability(room, startTime, endTime);
        if (!isAvailable) {
            return res.status(400).json({ success: false, error: 'ห้องนี้ถูกจองแล้วในช่วงเวลาดังกล่าว' });
        }

        // Auto approve if admin books the room
        if (req.user.role === 'admin') {
            req.body.status = 'approved';
        }

        let booking = await Booking.create(req.body);

        // Populate room details for email
        booking = await booking.populate('room');

        // Send Email Notification (Async without waiting)
        sendBookingCreated(booking).catch(err => console.error('Failed to send creation email:', err));

        // Check for urgent booking (starts within 1 hour)
        if (isUrgentBooking(startTime)) {
            console.log(`Urgent booking detected: ${booking._id}. Sending immediate reminder.`);
            sendBookingReminder(booking).catch(err => console.error('Failed to send reminder email:', err));
            // Mark as reminded so cron doesn't send duplicate
            booking.reminderSent = true;
            // Awaiting this because we want to save the state
            await booking.save();
        }

        res.status(201).json({
            success: true,
            data: booking
        });

        // Audit log
        logAction({ action: 'booking:create', performedBy: req.user._id, targetType: 'booking', targetId: booking._id, details: `สร้างการจอง: ${booking.topic}`, req });

        // Emit real-time notification to admin room
        const io = req.app.get('io');
        if (io) io.to('admin-room').emit('booking:created', { bookingId: booking._id, topic: booking.topic });

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

            // --- Enforce system settings on time modification ---
            const settings = await Setting.findOne();
            if (settings) {
                const start = new Date(newStartTime);
                const end = new Date(newEndTime);

                // Check maxBookingHours
                const durationHours = (end - start) / (1000 * 60 * 60);
                if (settings.maxBookingHours && durationHours > settings.maxBookingHours) {
                    return res.status(400).json({
                        success: false,
                        error: `ไม่สามารถจองเกิน ${settings.maxBookingHours} ชั่วโมงต่อครั้ง (เลือก ${durationHours} ชั่วโมง)`
                    });
                }

                // Check weekendBooking
                if (!settings.weekendBooking) {
                    const dayOfWeek = start.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        return res.status(400).json({
                            success: false,
                            error: 'ไม่อนุญาตให้จองในวันเสาร์-อาทิตย์'
                        });
                    }
                }

                // Check openTime/closeTime
                if (settings.openTime && settings.closeTime) {
                    const [openH, openM] = settings.openTime.split(':').map(Number);
                    const [closeH, closeM] = settings.closeTime.split(':').map(Number);
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                    const openMinutes = openH * 60 + (openM || 0);
                    const closeMinutes = closeH * 60 + (closeM || 0);

                    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
                        return res.status(400).json({
                            success: false,
                            error: `สามารถจองได้เฉพาะช่วงเวลา ${settings.openTime} - ${settings.closeTime} เท่านั้น`
                        });
                    }
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
            sendBookingCancelled(booking).catch(err => console.error('Failed to send cancellation email:', err));
        }

        // Send Email if Approved
        if (req.body.status === 'approved' && originalBooking.status !== 'approved') {
            sendBookingApproved(booking).catch(err => console.error('Failed to send approval email:', err));
        }

        // Send Email if Time was Modified (and not just status change)
        const timeChanged = (req.body.startTime && new Date(req.body.startTime).getTime() !== new Date(oldStartTime).getTime()) ||
            (req.body.endTime && new Date(req.body.endTime).getTime() !== new Date(oldEndTime).getTime());

        if (timeChanged) {
            sendBookingModified(booking, oldStartTime, oldEndTime).catch(err => console.error('Failed to send modification email:', err));
        }

        res.status(200).json({ success: true, data: booking });

        // Audit log
        const actionMap = { approved: 'booking:approve', rejected: 'booking:reject', cancelled: 'booking:cancel' };
        const auditAction = actionMap[req.body.status] || (timeChanged ? 'booking:modify' : 'booking:approve');
        logAction({ action: auditAction, performedBy: req.user._id, targetType: 'booking', targetId: booking._id, details: `${req.body.status || 'modified'}: ${booking.topic}`, req });

        // Emit real-time notification to admin room
        const io = req.app.get('io');
        if (io) io.to('admin-room').emit('booking:updated', { bookingId: booking._id, status: booking.status });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        await booking.deleteOne();

        res.status(200).json({ success: true, data: {} });

        // Audit log
        logAction({ action: 'booking:delete', performedBy: req.user._id, targetType: 'booking', targetId: req.params.id, details: `ลบการจอง: ${booking.topic}`, req });

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) io.to('admin-room').emit('booking:deleted', { bookingId: req.params.id });

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
        let data = [];
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData = xlsx.utils.sheet_to_json(sheet);
            sheetData.forEach((row, idx) => {
                row._sheetName = sheetName;
                row._originalRowNum = idx + 2;
                data.push(row);
            });
        }


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
            const rowNum = `Sheet '${row._sheetName}' Row ${row._originalRowNum}`;
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                if (key !== '_sheetName' && key !== '_originalRowNum') {
                    normalizedRow[key.toLowerCase()] = row[key];
                }
            });

            const roomName = normalizedRow['room'];
            const dayStr = normalizedRow['day'] || row._sheetName; // 'Monday' or fallback
            const dateStr = normalizedRow['date']; // Optional: Specific Date fallback
            const startTimeStr = normalizedRow['starttime']; // HH:mm
            const endTimeStr = normalizedRow['endtime']; // HH:mm
            const subject = normalizedRow['subject'] || 'Class';
            const teacher = normalizedRow['teacher'] || 'Unknown';

            if (!roomName || (!dayStr && !dateStr) || !startTimeStr || !endTimeStr) {
                errors.push(`Row ${rowNum}: Missing required fields`);
                continue;
            }

            let room = await Room.findOne({ name: roomName });
            if (!room) {
                // Auto-create room if it doesn't exist
                try {
                    room = await Room.create({
                        name: roomName,
                        capacity: 30, // Default capacity
                        equipment: ['Computer', 'Projector'], // Default equipment
                        description: 'Auto-created from Schedule Import'
                    });
                    console.log(`Auto-created missing room: ${roomName}`);
                } catch (err) {
                    errors.push(`Row ${rowNum}: Failed to auto-create room '${roomName}'`);
                    continue;
                }
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

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) io.to('admin-room').emit('booking:imported', { count: bookingsToCreate.length });

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
