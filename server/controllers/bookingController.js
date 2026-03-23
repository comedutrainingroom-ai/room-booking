const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Setting = require('../models/Setting');
const {
    sendBookingCreated,
    sendBookingApproved,
    sendBookingModified,
    sendBookingReminder,
    sendBookingCancelled
} = require('../services/emailService');
const {
    checkRoomAvailability,
    validateBookingTime,
    isUrgentBooking
} = require('../services/bookingService');
const { logAction } = require('../services/auditService');

const ADMIN_BOOKING_UPDATE_FIELDS = ['status', 'startTime', 'endTime', 'room', 'topic', 'note'];

const getAdminPinErrorResponse = (req) => ({
    success: false,
    error: req.adminPinTokenError?.error || 'Admin PIN verification required',
    code: req.adminPinTokenError?.code || 'ADMIN_PIN_REQUIRED'
});

const pickAllowedBookingFields = (payload = {}, allowedFields = []) => allowedFields.reduce((accumulator, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined) {
        accumulator[field] = payload[field];
    }

    return accumulator;
}, {});

const validateBookingAgainstSettings = (settings, startTime, endTime) => {
    if (!settings) {
        return { valid: true };
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const durationHours = (end - start) / (1000 * 60 * 60);
    if (settings.maxBookingHours && durationHours > settings.maxBookingHours) {
        return {
            valid: false,
            error: `Cannot book longer than ${settings.maxBookingHours} hour(s) per request`
        };
    }

    if (settings.maxBookingDays) {
        const now = new Date();
        const diffDays = (start - now) / (1000 * 60 * 60 * 24);
        if (diffDays > settings.maxBookingDays) {
            return {
                valid: false,
                error: `Cannot book more than ${settings.maxBookingDays} day(s) in advance`
            };
        }
    }

    if (!settings.weekendBooking) {
        const dayOfWeek = start.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return {
                valid: false,
                error: 'Weekend bookings are disabled'
            };
        }
    }

    if (settings.openTime && settings.closeTime) {
        const [openHour, openMinute] = settings.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = settings.closeTime.split(':').map(Number);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();
        const openMinutes = openHour * 60 + (openMinute || 0);
        const closeMinutes = closeHour * 60 + (closeMinute || 0);

        if (startMinutes < openMinutes || endMinutes > closeMinutes) {
            return {
                valid: false,
                error: `Bookings are only allowed between ${settings.openTime} and ${settings.closeTime}`
            };
        }
    }

    return { valid: true };
};

const buildBookingResponseForViewer = (booking, viewer) => {
    const plainBooking = typeof booking.toObject === 'function' ? booking.toObject() : booking;
    const viewerEmail = viewer?.email?.toLowerCase().trim();
    const bookingOwnerEmail = plainBooking.user?.email?.toLowerCase().trim();
    const canViewFullDetails = (viewer?.role === 'admin' && viewer?.adminUnlocked) ||
        (viewerEmail && viewerEmail === bookingOwnerEmail);

    if (canViewFullDetails) {
        return {
            ...plainBooking,
            visibility: 'full'
        };
    }

    return {
        _id: plainBooking._id,
        room: plainBooking.room,
        startTime: plainBooking.startTime,
        endTime: plainBooking.endTime,
        status: plainBooking.status,
        createdAt: plainBooking.createdAt,
        isImported: plainBooking.isImported,
        visibility: 'limited',
        topic: plainBooking.isImported ? 'Scheduled use' : 'Reserved',
        user: {
            name: plainBooking.user?.name || '',
            department: plainBooking.user?.department || ''
        }
    };
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Protected
const getBookings = async (req, res) => {
    try {
        const allowedFilters = {};

        if (req.query.room) {
            allowedFilters.room = req.query.room;
        }

        if (req.query.status) {
            allowedFilters.status = req.query.status;
        }

        if (req.query.email) {
            const requestedEmail = req.query.email.toLowerCase().trim();
            const viewerEmail = req.user.email.toLowerCase().trim();

            if (req.user.role !== 'admin' && requestedEmail !== viewerEmail) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to filter another user bookings'
                });
            }

            allowedFilters['user.email'] = requestedEmail;
        }

        const bookings = await Booking.find(allowedFilters).populate({
            path: 'room',
            select: 'name capacity'
        });

        const visibleBookings = bookings.map((booking) => buildBookingResponseForViewer(booking, req.user));

        res.status(200).json({
            success: true,
            count: visibleBookings.length,
            data: visibleBookings
        });
    } catch (error) {
        console.error('getBookings Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    try {
        const { room, startTime, endTime, topic, note, attendees } = req.body;
        const settings = await Setting.findOne();
        const isPrivilegedAdmin = req.user.role === 'admin' && req.adminUnlocked;

        const timeValidation = validateBookingTime(startTime);
        if (!timeValidation.valid) {
            return res.status(400).json({ success: false, error: timeValidation.error });
        }

        const targetRoom = await Room.findById(room);
        if (!targetRoom) {
            return res.status(404).json({ success: false, error: 'Requested room was not found' });
        }

        if (!targetRoom.isActive) {
            return res.status(400).json({ success: false, error: 'This room is currently unavailable' });
        }

        if (!isPrivilegedAdmin) {
            const settingsValidation = validateBookingAgainstSettings(settings, startTime, endTime);
            if (!settingsValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: settingsValidation.error
                });
            }
        }

        const isAvailable = await checkRoomAvailability(room, startTime, endTime);
        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                error: 'This room is already booked for the selected time range'
            });
        }

        const bookingStatus = (isPrivilegedAdmin || settings?.requireApproval === false)
            ? 'approved'
            : 'pending';

        let booking = await Booking.create({
            room,
            startTime,
            endTime,
            topic,
            note,
            attendees,
            user: {
                name: req.user.name,
                email: req.user.email,
                department: req.user.faculty || req.user.department || '',
                phone: req.user.phone || ''
            },
            status: bookingStatus
        });

        booking = await booking.populate('room');

        sendBookingCreated(booking).catch((error) => console.error('Failed to send creation email:', error));

        if (isUrgentBooking(startTime)) {
            console.log(`Urgent booking detected: ${booking._id}. Sending immediate reminder.`);
            sendBookingReminder(booking).catch((error) => console.error('Failed to send reminder email:', error));
            booking.reminderSent = true;
            await booking.save();
        }

        res.status(201).json({
            success: true,
            data: booking
        });

        logAction({
            action: 'booking:create',
            performedBy: req.user._id,
            targetType: 'booking',
            targetId: booking._id,
            details: `Created booking: ${booking.topic}`,
            req
        });

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('booking:created', { bookingId: booking._id, topic: booking.topic });
        }
    } catch (error) {
        console.error('createBooking Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update a booking (Approve/Reject/Modify Time)
// @route   PUT /api/bookings/:id
// @access  Private (students can cancel own, admin can do all after PIN verification)
const updateBooking = async (req, res) => {
    try {
        const originalBooking = await Booking.findById(req.params.id);
        if (!originalBooking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const requesterEmail = req.user.email.toLowerCase().trim();
        const bookingOwnerEmail = originalBooking.user.email.toLowerCase().trim();
        const isOwner = requesterEmail === bookingOwnerEmail;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: 'Not authorized to modify this booking' });
        }

        if (isAdmin && !req.adminUnlocked) {
            return res.status(403).json(getAdminPinErrorResponse(req));
        }

        let updateData = {};

        if (isAdmin) {
            updateData = pickAllowedBookingFields(req.body, ADMIN_BOOKING_UPDATE_FIELDS);

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid booking fields were provided for update'
                });
            }
        } else {
            const requestKeys = Object.keys(req.body || {});
            const onlyCancellingStatus = requestKeys.length === 1 &&
                requestKeys[0] === 'status' &&
                req.body.status === 'cancelled';

            if (!onlyCancellingStatus) {
                return res.status(403).json({
                    success: false,
                    error: 'Students can only cancel their own pending bookings'
                });
            }

            if (originalBooking.status !== 'pending') {
                return res.status(403).json({
                    success: false,
                    error: 'Only pending bookings can be cancelled'
                });
            }

            updateData = { status: 'cancelled' };
        }

        const oldStartTime = originalBooking.startTime;
        const oldEndTime = originalBooking.endTime;
        const nextRoomId = updateData.room || originalBooking.room;
        const nextStartTime = updateData.startTime || oldStartTime;
        const nextEndTime = updateData.endTime || oldEndTime;
        const timeChanged = new Date(nextStartTime).getTime() !== new Date(oldStartTime).getTime() ||
            new Date(nextEndTime).getTime() !== new Date(oldEndTime).getTime();
        const roomChanged = Object.prototype.hasOwnProperty.call(updateData, 'room') &&
            String(updateData.room) !== String(originalBooking.room);

        if (timeChanged || roomChanged) {
            if (updateData.startTime) {
                const timeValidation = validateBookingTime(nextStartTime);
                if (!timeValidation.valid) {
                    return res.status(400).json({ success: false, error: timeValidation.error });
                }
            }

            const targetRoom = await Room.findById(nextRoomId);
            if (!targetRoom) {
                return res.status(404).json({ success: false, error: 'Requested room was not found' });
            }

            if (!targetRoom.isActive) {
                return res.status(400).json({ success: false, error: 'This room is currently unavailable' });
            }

            const isAvailable = await checkRoomAvailability(
                nextRoomId,
                nextStartTime,
                nextEndTime,
                req.params.id
            );

            if (!isAvailable) {
                return res.status(400).json({
                    success: false,
                    error: 'This room is already booked for the selected time range'
                });
            }
        }

        const booking = await Booking.findByIdAndUpdate(req.params.id, updateData, {
            returnDocument: 'after',
            runValidators: true
        }).populate('room');

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        if (updateData.status === 'cancelled' && originalBooking.status !== 'cancelled') {
            sendBookingCancelled(booking).catch((error) => console.error('Failed to send cancellation email:', error));
        }

        if (updateData.status === 'approved' && originalBooking.status !== 'approved') {
            sendBookingApproved(booking).catch((error) => console.error('Failed to send approval email:', error));
        }

        if (timeChanged) {
            sendBookingModified(booking, oldStartTime, oldEndTime).catch((error) => {
                console.error('Failed to send modification email:', error);
            });
        }

        res.status(200).json({ success: true, data: booking });

        const actionMap = {
            approved: 'booking:approve',
            rejected: 'booking:reject',
            cancelled: 'booking:cancel'
        };

        const auditAction = actionMap[updateData.status] || 'booking:modify';
        const auditDetail = updateData.status ? `${updateData.status}: ${booking.topic}` : `modified: ${booking.topic}`;

        logAction({
            action: auditAction,
            performedBy: req.user._id,
            targetType: 'booking',
            targetId: booking._id,
            details: auditDetail,
            req
        });

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('booking:updated', { bookingId: booking._id, status: booking.status });
        }
    } catch (error) {
        console.error('updateBooking Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
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

        logAction({
            action: 'booking:delete',
            performedBy: req.user._id,
            targetType: 'booking',
            targetId: req.params.id,
            details: `Deleted booking: ${booking.topic}`,
            req
        });

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('booking:deleted', { bookingId: req.params.id });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Import bookings from Excel
// @route   POST /api/bookings/import
// @access  Private/Admin
const importBookings = async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ success: false, error: 'Please upload an Excel file' });
        }

        let xlsx;
        try {
            xlsx = require('xlsx');
        } catch (error) {
            console.error('Failed to load xlsx module:', error);
            return res.status(500).json({
                success: false,
                error: 'Server Error: xlsx dependency missing. Please restart server.'
            });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        let data = [];
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData = xlsx.utils.sheet_to_json(sheet);
            sheetData.forEach((row, index) => {
                row._sheetName = sheetName;
                row._originalRowNum = index + 2;
                data.push(row);
            });
        }

        const semesterStart = req.body.startDate ? new Date(req.body.startDate) : new Date();
        const semesterEnd = req.body.endDate
            ? new Date(req.body.endDate)
            : new Date(new Date().setMonth(new Date().getMonth() + 4));

        const getDayIndex = (dayStr) => {
            if (!dayStr) {
                return -1;
            }

            const normalized = dayStr.toLowerCase().trim();
            const days = {
                sunday: 0,
                sun: 0,
                monday: 1,
                mon: 1,
                tuesday: 2,
                tue: 2,
                wednesday: 3,
                wed: 3,
                thursday: 4,
                thu: 4,
                friday: 5,
                fri: 5,
                saturday: 6,
                sat: 6,
                'อาทิตย์': 0,
                'อา': 0,
                'จันทร์': 1,
                'จ': 1,
                'อังคาร': 2,
                'อ': 2,
                'พุธ': 3,
                'พ': 3,
                'พฤหัส': 4,
                'พฤหัสบดี': 4,
                'พฤ': 4,
                'ศุกร์': 5,
                'ศ': 5,
                'เสาร์': 6,
                'ส': 6
            };

            return days[normalized] !== undefined ? days[normalized] : -1;
        };

        const parseExcelTime = (value) => {
            if (!value) {
                return null;
            }

            if (typeof value === 'number') {
                const totalSeconds = Math.round(value * 24 * 60 * 60);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                return { hours, minutes };
            }

            if (typeof value === 'string') {
                const parts = value.split(':');
                if (parts.length >= 2) {
                    return {
                        hours: parseInt(parts[0], 10),
                        minutes: parseInt(parts[1], 10)
                    };
                }
            }

            return null;
        };

        const bookingsToCreate = [];
        const errors = [];

        for (const row of data) {
            const rowNum = `Sheet '${row._sheetName}' Row ${row._originalRowNum}`;
            const normalizedRow = {};

            Object.keys(row).forEach((key) => {
                if (key !== '_sheetName' && key !== '_originalRowNum') {
                    normalizedRow[key.toLowerCase()] = row[key];
                }
            });

            const roomName = normalizedRow.room;
            const dayStr = normalizedRow.day || row._sheetName;
            const dateStr = normalizedRow.date;
            const startTimeStr = normalizedRow.starttime;
            const endTimeStr = normalizedRow.endtime;
            const subject = normalizedRow.subject || 'Class';
            const teacher = normalizedRow.teacher || 'Unknown';

            if (!roomName || (!dayStr && !dateStr) || !startTimeStr || !endTimeStr) {
                errors.push(`Row ${rowNum}: Missing required fields`);
                continue;
            }

            let room = await Room.findOne({ name: roomName });
            if (!room) {
                try {
                    room = await Room.create({
                        name: roomName,
                        capacity: 30,
                        equipment: ['Computer', 'Projector'],
                        description: 'Auto-created from Schedule Import'
                    });
                    console.log(`Auto-created missing room: ${roomName}`);
                } catch (error) {
                    errors.push(`Row ${rowNum}: Failed to auto-create room '${roomName}'`);
                    continue;
                }
            }

            const startObj = parseExcelTime(startTimeStr);
            const endObj = parseExcelTime(endTimeStr);

            if (!startObj || !endObj) {
                console.error(`Row ${rowNum}: Invalid time format. Start: ${startTimeStr}, End: ${endTimeStr}`);
                errors.push(`Row ${rowNum}: Invalid time format (${startTimeStr} - ${endTimeStr})`);
                continue;
            }

            const buildDateTimeRange = (dateObj) => {
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth();
                const day = dateObj.getDate();

                return {
                    start: new Date(year, month, day, startObj.hours, startObj.minutes),
                    end: new Date(year, month, day, endObj.hours, endObj.minutes)
                };
            };

            if (dayStr) {
                const targetDayIndex = getDayIndex(dayStr);
                if (targetDayIndex === -1) {
                    errors.push(`Row ${rowNum}: Invalid day '${dayStr}'`);
                    continue;
                }

                const loopDate = new Date(semesterStart);
                while (loopDate <= semesterEnd) {
                    if (loopDate.getDay() === targetDayIndex) {
                        const { start, end } = buildDateTimeRange(loopDate);
                        bookingsToCreate.push({
                            room: room._id,
                            topic: subject,
                            note: 'Imported Schedule',
                            user: {
                                name: teacher,
                                email: 'imported@system.com',
                                department: 'Imported'
                            },
                            startTime: start,
                            endTime: end,
                            status: 'approved',
                            isImported: true
                        });
                    }

                    loopDate.setDate(loopDate.getDate() + 1);
                }
            } else if (dateStr) {
                const specificDate = new Date(dateStr);
                if (Number.isNaN(specificDate.getTime())) {
                    errors.push(`Row ${rowNum}: Invalid date format`);
                    continue;
                }

                const { start, end } = buildDateTimeRange(specificDate);
                bookingsToCreate.push({
                    room: room._id,
                    topic: subject,
                    note: 'Imported Schedule',
                    user: {
                        name: teacher,
                        email: 'admin@system.com',
                        department: 'Imported'
                    },
                    startTime: start,
                    endTime: end,
                    status: 'approved',
                    isImported: true
                });
            }
        }

        if (bookingsToCreate.length > 0) {
            await Booking.insertMany(bookingsToCreate);
        }

        res.status(200).json({
            success: true,
            count: bookingsToCreate.length,
            errors,
            message: `Imported ${bookingsToCreate.length} bookings. ${errors.length} errors.`
        });

        logAction({
            action: 'booking:import',
            performedBy: req.user._id,
            targetType: 'booking',
            details: `Imported ${bookingsToCreate.length} booking(s) from spreadsheet`,
            req
        });

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('booking:imported', { count: bookingsToCreate.length });
        }
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ success: false, error: `Failed to process file: ${error.message}` });
    }
};

// @desc    Delete all imported bookings
// @route   DELETE /api/bookings/import
// @access  Private/Admin
const deleteImportedBookings = async (req, res) => {
    try {
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

        logAction({
            action: 'booking:delete_imported',
            performedBy: req.user._id,
            targetType: 'booking',
            details: `Deleted ${result.deletedCount} imported booking(s)`,
            req
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
