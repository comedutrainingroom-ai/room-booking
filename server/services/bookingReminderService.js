const Booking = require('../models/Booking');
const { sendBookingReminder } = require('../services/emailService');
const { isUrgentBooking } = require('./bookingService');

const REMINDER_LOOKAHEAD_MS = 60 * 60 * 1000;
const REMINDER_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

const buildReminderClaimQuery = ({ bookingId, now, excludeBookingIds = [] }) => {
    const staleProcessingThreshold = new Date(now.getTime() - REMINDER_PROCESSING_TIMEOUT_MS);
    const query = {
        status: 'approved',
        reminderSent: false,
        $or: [
            { reminderProcessingAt: { $exists: false } },
            { reminderProcessingAt: null },
            { reminderProcessingAt: { $lte: staleProcessingThreshold } }
        ]
    };

    if (bookingId) {
        query._id = bookingId;
        return query;
    }

    if (excludeBookingIds.length > 0) {
        query._id = {
            $nin: excludeBookingIds
        };
    }

    query.startTime = {
        $gt: now,
        $lte: new Date(now.getTime() + REMINDER_LOOKAHEAD_MS)
    };

    return query;
};

const claimReminderBooking = async ({ bookingId, now = new Date(), excludeBookingIds = [] } = {}) => {
    const claimTime = new Date(now);
    const booking = await Booking.findOneAndUpdate(
        buildReminderClaimQuery({ bookingId, now: claimTime, excludeBookingIds }),
        {
            $set: {
                reminderProcessingAt: claimTime
            }
        },
        {
            returnDocument: 'after',
            sort: bookingId ? undefined : { startTime: 1, _id: 1 }
        }
    ).populate('room');

    if (!booking) {
        return null;
    }

    return {
        booking,
        claimTime
    };
};

const markReminderSent = async ({ bookingId, claimTime, sentAt = new Date() }) => {
    await Booking.updateOne(
        {
            _id: bookingId,
            reminderProcessingAt: claimTime
        },
        {
            $set: {
                reminderSent: true,
                reminderSentAt: sentAt
            },
            $unset: {
                reminderProcessingAt: 1
            }
        }
    );
};

const releaseReminderClaim = async ({ bookingId, claimTime }) => {
    await Booking.updateOne(
        {
            _id: bookingId,
            reminderProcessingAt: claimTime
        },
        {
            $unset: {
                reminderProcessingAt: 1
            }
        }
    );
};

const deliverClaimedReminder = async ({ booking, claimTime }) => {
    console.log(`Sending reminder for booking ${booking._id}`);

    try {
        const deliveryResult = await sendBookingReminder(booking);

        if (deliveryResult?.success) {
            const sentAt = new Date();
            await markReminderSent({
                bookingId: booking._id,
                claimTime,
                sentAt
            });

            booking.reminderSent = true;
            booking.reminderSentAt = sentAt;
            booking.reminderProcessingAt = undefined;

            return {
                success: true,
                booking,
                deliveryResult
            };
        }

        await releaseReminderClaim({
            bookingId: booking._id,
            claimTime
        });

        console.warn(`[Scheduler] Reminder email not marked as sent for booking ${booking._id} (${deliveryResult?.code || 'UNKNOWN_FAILURE'})`);

        return {
            success: false,
            booking,
            deliveryResult
        };
    } catch (error) {
        await releaseReminderClaim({
            bookingId: booking._id,
            claimTime
        });

        throw error;
    }
};

const sendImmediateReminderIfNeeded = async (booking) => {
    if (!booking || booking.status !== 'approved' || !isUrgentBooking(booking.startTime)) {
        return {
            attempted: false,
            reason: 'NOT_ELIGIBLE'
        };
    }

    const claimedReminder = await claimReminderBooking({ bookingId: booking._id });

    if (!claimedReminder) {
        return {
            attempted: false,
            reason: 'ALREADY_CLAIMED_OR_SENT'
        };
    }

    const delivery = await deliverClaimedReminder(claimedReminder);

    return {
        attempted: true,
        ...delivery
    };
};

const applyReminderReset = (updateOperation) => {
    updateOperation.$set = {
        ...(updateOperation.$set || {}),
        reminderSent: false
    };
    updateOperation.$unset = {
        ...(updateOperation.$unset || {}),
        reminderSentAt: 1,
        reminderProcessingAt: 1
    };

    return updateOperation;
};

module.exports = {
    claimReminderBooking,
    deliverClaimedReminder,
    sendImmediateReminderIfNeeded,
    applyReminderReset,
    REMINDER_LOOKAHEAD_MS,
    REMINDER_PROCESSING_TIMEOUT_MS
};
