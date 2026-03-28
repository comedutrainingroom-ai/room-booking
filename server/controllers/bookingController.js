const mongoose = require('mongoose');
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
const {
    emitBookingCreatedNotification,
    emitBookingUpdatedNotification,
    emitBookingDeletedNotification,
    emitBookingImportedNotification
} = require('../services/adminNotificationService');
const {
    FIELD_LIMITS,
    IMPORT_LIMITS,
    createHttpError,
    sanitizeRequiredSingleLineText,
    sanitizeOptionalSingleLineText,
    sanitizeOptionalMultilineText,
    getValidationErrorResponse
} = require('../utils/inputValidation');
const {
    DEFAULT_TIME_ZONE,
    getMinutesSinceMidnightInTimeZone,
    getDayOfWeekInTimeZone
} = require('../utils/timezone');

const ADMIN_BOOKING_UPDATE_FIELDS = ['status', 'startTime', 'endTime', 'room', 'topic', 'note'];
const ACTIVE_BOOKING_STATUSES = ['approved', 'pending'];

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
        const dayOfWeek = getDayOfWeekInTimeZone(start, DEFAULT_TIME_ZONE);
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
        const startMinutes = getMinutesSinceMidnightInTimeZone(start, DEFAULT_TIME_ZONE);
        const endMinutes = getMinutesSinceMidnightInTimeZone(end, DEFAULT_TIME_ZONE);
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

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const toTextInput = (value) => {
    if (value === undefined || value === null) {
        return value;
    }

    return typeof value === 'string' ? value : String(value);
};

const parseDateInput = (value, fieldName) => {
    const parsedDate = value instanceof Date ? new Date(value) : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(`${fieldName} is invalid`);
    }

    return parsedDate;
};

const validateChronologicalRange = (startTime, endTime) => {
    if (endTime <= startTime) {
        throw createHttpError('End time must be after start time');
    }
};

const createCappedErrorCollector = (maxItems) => {
    const items = [];
    let totalCount = 0;

    return {
        add(message) {
            totalCount += 1;

            if (items.length < maxItems) {
                items.push(message);
            }
        },
        getItems() {
            return items;
        },
        getTotalCount() {
            return totalCount;
        }
    };
};

const hasTimeOverlap = (left, right) => (
    new Date(left.startTime) < new Date(right.endTime) &&
    new Date(left.endTime) > new Date(right.startTime)
);

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

// @desc    Get booking notification summary (Admin)
// @route   GET /api/bookings/notification-summary
// @access  Private (Admin)
const getBookingNotificationSummary = async (req, res) => {
    try {
        const pendingCount = await Booking.countDocuments({
            status: 'pending',
            isImported: { $ne: true }
        });

        res.status(200).json({
            success: true,
            data: {
                pendingCount
            }
        });
    } catch (error) {
        console.error('getBookingNotificationSummary Error:', error);
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
        const sanitizedTopic = sanitizeRequiredSingleLineText(topic, {
            fieldName: 'Topic',
            maxLength: FIELD_LIMITS.BOOKING_TOPIC
        });
        const sanitizedNote = sanitizeOptionalMultilineText(note, {
            fieldName: 'Note',
            maxLength: FIELD_LIMITS.BOOKING_NOTE,
            emptyValue: ''
        });
        const normalizedStartTime = parseDateInput(startTime, 'Start time');
        const normalizedEndTime = parseDateInput(endTime, 'End time');

        validateChronologicalRange(normalizedStartTime, normalizedEndTime);

        if (!isValidObjectId(room)) {
            return res.status(400).json({
                success: false,
                error: 'Requested room is invalid',
                code: 'INVALID_ROOM'
            });
        }

        const timeValidation = validateBookingTime(normalizedStartTime);
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
            const settingsValidation = validateBookingAgainstSettings(settings, normalizedStartTime, normalizedEndTime);
            if (!settingsValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: settingsValidation.error
                });
            }
        }

        const isAvailable = await checkRoomAvailability(room, normalizedStartTime, normalizedEndTime);
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
            startTime: normalizedStartTime,
            endTime: normalizedEndTime,
            topic: sanitizedTopic,
            note: sanitizedNote,
            attendees,
            user: {
                name: sanitizeRequiredSingleLineText(toTextInput(req.user.name || req.user.email), {
                    fieldName: 'User name',
                    maxLength: FIELD_LIMITS.USER_NAME
                }),
                email: req.user.email,
                department: sanitizeOptionalSingleLineText(toTextInput(req.user.faculty || req.user.department), {
                    fieldName: 'Department',
                    maxLength: FIELD_LIMITS.BOOKING_USER_DEPARTMENT,
                    emptyValue: ''
                }),
                phone: sanitizeOptionalSingleLineText(toTextInput(req.user.phone), {
                    fieldName: 'Phone',
                    maxLength: FIELD_LIMITS.USER_PHONE,
                    emptyValue: ''
                })
            },
            status: bookingStatus
        });

        booking = await booking.populate('room');

        sendBookingCreated(booking).catch((error) => console.error('Failed to send creation email:', error));

        if (isUrgentBooking(normalizedStartTime)) {
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
        emitBookingCreatedNotification(io, booking);
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Booking validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

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

            if (Object.prototype.hasOwnProperty.call(updateData, 'topic')) {
                updateData.topic = sanitizeRequiredSingleLineText(updateData.topic, {
                    fieldName: 'Topic',
                    maxLength: FIELD_LIMITS.BOOKING_TOPIC
                });
            }

            if (Object.prototype.hasOwnProperty.call(updateData, 'note')) {
                updateData.note = sanitizeOptionalMultilineText(updateData.note, {
                    fieldName: 'Note',
                    maxLength: FIELD_LIMITS.BOOKING_NOTE,
                    emptyValue: ''
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
        const nextRoomId = Object.prototype.hasOwnProperty.call(updateData, 'room')
            ? updateData.room
            : originalBooking.room;
        const nextStartTime = Object.prototype.hasOwnProperty.call(updateData, 'startTime')
            ? parseDateInput(updateData.startTime, 'Start time')
            : oldStartTime;
        const nextEndTime = Object.prototype.hasOwnProperty.call(updateData, 'endTime')
            ? parseDateInput(updateData.endTime, 'End time')
            : oldEndTime;
        const timeChanged = new Date(nextStartTime).getTime() !== new Date(oldStartTime).getTime() ||
            new Date(nextEndTime).getTime() !== new Date(oldEndTime).getTime();
        const roomChanged = Object.prototype.hasOwnProperty.call(updateData, 'room') &&
            String(updateData.room) !== String(originalBooking.room);

        if (Object.prototype.hasOwnProperty.call(updateData, 'room') && !isValidObjectId(nextRoomId)) {
            return res.status(400).json({
                success: false,
                error: 'Requested room is invalid',
                code: 'INVALID_ROOM'
            });
        }

        if (timeChanged || roomChanged) {
            validateChronologicalRange(new Date(nextStartTime), new Date(nextEndTime));

            if (Object.prototype.hasOwnProperty.call(updateData, 'startTime')) {
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

        if (Object.prototype.hasOwnProperty.call(updateData, 'startTime')) {
            updateData.startTime = nextStartTime;
        }

        if (Object.prototype.hasOwnProperty.call(updateData, 'endTime')) {
            updateData.endTime = nextEndTime;
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
        emitBookingUpdatedNotification(io, booking);
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Booking update validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

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
        emitBookingDeletedNotification(io, req.params.id);
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
        if (workbook.SheetNames.length > IMPORT_LIMITS.MAX_SHEETS) {
            return res.status(400).json({
                success: false,
                error: `Import supports at most ${IMPORT_LIMITS.MAX_SHEETS} sheets per file`,
                code: 'IMPORT_TOO_MANY_SHEETS'
            });
        }

        const semesterStart = req.body.startDate
            ? parseDateInput(req.body.startDate, 'Start date')
            : new Date();
        const defaultSemesterEnd = new Date(semesterStart);
        defaultSemesterEnd.setMonth(defaultSemesterEnd.getMonth() + 4);
        const semesterEnd = req.body.endDate
            ? parseDateInput(req.body.endDate, 'End date')
            : defaultSemesterEnd;
        const importRangeDays = Math.ceil((semesterEnd - semesterStart) / (1000 * 60 * 60 * 24));

        if (semesterEnd < semesterStart) {
            return res.status(400).json({
                success: false,
                error: 'End date must be on or after start date',
                code: 'INVALID_IMPORT_RANGE'
            });
        }

        if (importRangeDays > IMPORT_LIMITS.MAX_RANGE_DAYS) {
            return res.status(400).json({
                success: false,
                error: `Import range must be ${IMPORT_LIMITS.MAX_RANGE_DAYS} days or fewer`,
                code: 'IMPORT_RANGE_TOO_LARGE'
            });
        }

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
            if (value === undefined || value === null || value === '') {
                return null;
            }

            if (typeof value === 'number') {
                const totalSeconds = Math.round(value * 24 * 60 * 60);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                if (
                    !Number.isInteger(hours) ||
                    !Number.isInteger(minutes) ||
                    hours < 0 ||
                    hours > 23 ||
                    minutes < 0 ||
                    minutes > 59
                ) {
                    return null;
                }

                return { hours, minutes };
            }

            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                const match = trimmedValue.match(/^(\d{1,2}):(\d{2})$/);
                if (match) {
                    const hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);

                    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                        return null;
                    }

                    return {
                        hours,
                        minutes
                    };
                }
            }

            return null;
        };

        const parseSpecificDate = (value) => {
            if (value instanceof Date) {
                return parseDateInput(value, 'Date');
            }

            if (typeof value === 'number') {
                const parsedCode = xlsx.SSF?.parse_date_code?.(value);
                if (parsedCode) {
                    return new Date(parsedCode.y, parsedCode.m - 1, parsedCode.d);
                }
            }

            return parseDateInput(value, 'Date');
        };

        const errorCollector = createCappedErrorCollector(IMPORT_LIMITS.MAX_ERROR_ITEMS);
        const candidateBookings = [];
        const roomCache = new Map();
        let totalSourceRows = 0;

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetRange = sheet?.['!ref'] ? xlsx.utils.decode_range(sheet['!ref']) : null;
            const sheetRowCount = sheetRange ? Math.max(0, sheetRange.e.r - sheetRange.s.r) : 0;

            totalSourceRows += sheetRowCount;
            if (totalSourceRows > IMPORT_LIMITS.MAX_SOURCE_ROWS) {
                return res.status(400).json({
                    success: false,
                    error: `Import supports at most ${IMPORT_LIMITS.MAX_SOURCE_ROWS} data rows per file`,
                    code: 'IMPORT_TOO_MANY_ROWS'
                });
            }

            const sheetData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

            for (const [index, row] of sheetData.entries()) {
                const rowLabel = `Sheet '${sheetName}' Row ${index + 2}`;
                const normalizedRow = {};

                Object.keys(row).forEach((key) => {
                    normalizedRow[String(key).toLowerCase().trim()] = row[key];
                });

                try {
                    const roomName = sanitizeRequiredSingleLineText(toTextInput(normalizedRow.room), {
                        fieldName: 'Room',
                        maxLength: FIELD_LIMITS.IMPORT_ROOM_NAME
                    });
                    const dateValue = normalizedRow.date;
                    const dayValue = dateValue ? '' : (toTextInput(normalizedRow.day) || sheetName);
                    const startTimeValue = normalizedRow.starttime;
                    const endTimeValue = normalizedRow.endtime;
                    const subject = sanitizeOptionalSingleLineText(toTextInput(normalizedRow.subject), {
                        fieldName: 'Subject',
                        maxLength: FIELD_LIMITS.BOOKING_TOPIC,
                        emptyValue: 'Class'
                    });
                    const teacher = sanitizeOptionalSingleLineText(toTextInput(normalizedRow.teacher), {
                        fieldName: 'Teacher',
                        maxLength: FIELD_LIMITS.USER_NAME,
                        emptyValue: 'Unknown'
                    });

                    if ((!dayValue || !String(dayValue).trim()) && !dateValue) {
                        throw createHttpError('Day or date is required');
                    }

                    if (startTimeValue === undefined || startTimeValue === null || startTimeValue === '') {
                        throw createHttpError('Start time is required');
                    }

                    if (endTimeValue === undefined || endTimeValue === null || endTimeValue === '') {
                        throw createHttpError('End time is required');
                    }

                    let room = roomCache.get(roomName);
                    if (!room) {
                        room = await Room.findOne({ name: roomName });
                        if (!room) {
                            room = await Room.create({
                                name: roomName,
                                capacity: 30,
                                equipment: ['Computer', 'Projector'],
                                description: 'Auto-created from Schedule Import'
                            });
                            console.log(`Auto-created missing room: ${roomName}`);
                        }

                        roomCache.set(roomName, room);
                    }

                    const startObj = parseExcelTime(startTimeValue);
                    const endObj = parseExcelTime(endTimeValue);

                    if (!startObj || !endObj) {
                        throw createHttpError(`Invalid time format (${startTimeValue} - ${endTimeValue})`);
                    }

                    const buildDateTimeRange = (dateObj) => {
                        const year = dateObj.getFullYear();
                        const month = dateObj.getMonth();
                        const day = dateObj.getDate();
                        const start = new Date(year, month, day, startObj.hours, startObj.minutes);
                        const end = new Date(year, month, day, endObj.hours, endObj.minutes);

                        validateChronologicalRange(start, end);

                        return { start, end };
                    };

                    const pushCandidateBooking = (start, end) => {
                        if (candidateBookings.length >= IMPORT_LIMITS.MAX_GENERATED_BOOKINGS) {
                            throw createHttpError(
                                `Import would generate more than ${IMPORT_LIMITS.MAX_GENERATED_BOOKINGS} bookings`,
                                'IMPORT_TOO_MANY_BOOKINGS'
                            );
                        }

                        candidateBookings.push({
                            rowLabel,
                            roomName,
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
                    };

                    if (dayValue && String(dayValue).trim()) {
                        const targetDayIndex = getDayIndex(dayValue);
                        if (targetDayIndex === -1) {
                            throw createHttpError(`Invalid day '${dayValue}'`);
                        }

                        const loopDate = new Date(semesterStart);
                        while (loopDate <= semesterEnd) {
                            if (loopDate.getDay() === targetDayIndex) {
                                const { start, end } = buildDateTimeRange(loopDate);
                                pushCandidateBooking(start, end);
                            }

                            loopDate.setDate(loopDate.getDate() + 1);
                        }
                    } else {
                        const specificDate = parseSpecificDate(dateValue);
                        const { start, end } = buildDateTimeRange(specificDate);
                        pushCandidateBooking(start, end);
                    }
                } catch (error) {
                    if (error?.code === 'IMPORT_TOO_MANY_BOOKINGS') {
                        throw error;
                    }

                    const message = error?.message || 'Invalid import row';
                    errorCollector.add(`${rowLabel}: ${message}`);
                }
            }
        }

        candidateBookings.sort((left, right) => {
            const roomComparison = String(left.room).localeCompare(String(right.room));
            if (roomComparison !== 0) {
                return roomComparison;
            }

            return new Date(left.startTime) - new Date(right.startTime);
        });

        const nonConflictingCandidates = [];
        const lastAcceptedByRoom = new Map();

        for (const candidate of candidateBookings) {
            const roomKey = String(candidate.room);
            const lastAccepted = lastAcceptedByRoom.get(roomKey);

            if (lastAccepted && hasTimeOverlap(lastAccepted, candidate)) {
                errorCollector.add(`${candidate.rowLabel}: Conflicts with another imported booking for room '${candidate.roomName}'`);
                continue;
            }

            lastAcceptedByRoom.set(roomKey, candidate);
            nonConflictingCandidates.push(candidate);
        }

        const roomIds = [...new Set(nonConflictingCandidates.map((booking) => String(booking.room)))];
        const bookingsToCreate = [];

        if (nonConflictingCandidates.length > 0) {
            const minStartTime = nonConflictingCandidates.reduce(
                (earliest, booking) => (booking.startTime < earliest ? booking.startTime : earliest),
                nonConflictingCandidates[0].startTime
            );
            const maxEndTime = nonConflictingCandidates.reduce(
                (latest, booking) => (booking.endTime > latest ? booking.endTime : latest),
                nonConflictingCandidates[0].endTime
            );

            const existingBookings = await Booking.find({
                room: { $in: roomIds },
                status: { $in: ACTIVE_BOOKING_STATUSES },
                startTime: { $lt: maxEndTime },
                endTime: { $gt: minStartTime }
            })
                .select('room startTime endTime')
                .sort({ room: 1, startTime: 1 });

            const existingByRoom = existingBookings.reduce((accumulator, booking) => {
                const roomKey = String(booking.room);
                if (!accumulator.has(roomKey)) {
                    accumulator.set(roomKey, []);
                }

                accumulator.get(roomKey).push(booking);
                return accumulator;
            }, new Map());

            for (const candidate of nonConflictingCandidates) {
                const roomKey = String(candidate.room);
                const roomBookings = existingByRoom.get(roomKey) || [];
                const hasExistingConflict = roomBookings.some((existingBooking) => hasTimeOverlap(existingBooking, candidate));

                if (hasExistingConflict) {
                    errorCollector.add(`${candidate.rowLabel}: Conflicts with an existing booking for room '${candidate.roomName}'`);
                    continue;
                }

                const { rowLabel, roomName, ...bookingData } = candidate;
                bookingsToCreate.push(bookingData);
            }
        }

        if (bookingsToCreate.length > 0) {
            await Booking.insertMany(bookingsToCreate);
        }

        const errors = errorCollector.getItems();
        const errorCount = errorCollector.getTotalCount();

        res.status(200).json({
            success: true,
            count: bookingsToCreate.length,
            errors,
            errorCount,
            errorsTruncated: errorCount > errors.length,
            message: `Imported ${bookingsToCreate.length} bookings. ${errorCount} errors.`
        });

        logAction({
            action: 'booking:import',
            performedBy: req.user._id,
            targetType: 'booking',
            details: `Imported ${bookingsToCreate.length} booking(s) from spreadsheet`,
            req
        });

        const io = req.app.get('io');
        emitBookingImportedNotification(io, bookingsToCreate.length);
    } catch (error) {
        const validationResponse = getValidationErrorResponse(error, 'Import validation failed');
        if (validationResponse) {
            return res.status(validationResponse.statusCode).json(validationResponse.body);
        }

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
    getBookingNotificationSummary,
    createBooking,
    updateBooking,
    deleteBooking,
    importBookings,
    deleteImportedBookings
};
