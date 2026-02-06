const Booking = require('../models/Booking');

/**
 * Check if a room is available for a specific time range
 * @param {string} roomId - The ID of the room
 * @param {Date} startTime - Start time of the booking
 * @param {Date} endTime - End time of the booking
 * @param {string} [excludeBookingId] - Optional booking ID to exclude (for updates)
 * @returns {Promise<boolean>} - True if available, False if conflict exists
 */
const checkRoomAvailability = async (roomId, startTime, endTime, excludeBookingId = null) => {
    const query = {
        room: roomId,
        status: { $in: ['approved', 'pending'] },
        $or: [
            { startTime: { $lt: endTime, $gte: startTime } },
            { endTime: { $gt: startTime, $lte: endTime } },
            { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
        ]
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const existingBooking = await Booking.findOne(query);
    return !existingBooking;
};

/**
 * Validate booking time (e.g. check if it's in the past)
 * @param {Date} startTime - Start time of the booking
 * @returns {Object} - { valid: boolean, error: string|null }
 */
const validateBookingTime = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();

    if (start < now) {
        return { valid: false, error: 'ไม่สามารถจองย้อนหลังได้' };
    }

    return { valid: true, error: null };
};

/**
 * Check if a booking is urgent (starts within 1 hour)
 * @param {Date} startTime - Start time of the booking
 * @returns {boolean} - True if urgent
 */
const isUrgentBooking = (startTime) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const timeToStart = start - now;
    const oneHour = 60 * 60 * 1000;

    return timeToStart > 0 && timeToStart <= oneHour;
};

module.exports = {
    checkRoomAvailability,
    validateBookingTime,
    isUrgentBooking
};
