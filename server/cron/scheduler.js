const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendBookingReminder } = require('../services/emailService');

let reminderTask = null;

const isSchedulerEnabled = () => {
    const rawValue = process.env.BOOKING_REMINDER_SCHEDULER_ENABLED;
    if (rawValue === undefined) {
        return true;
    }

    return !['0', 'false', 'off', 'no'].includes(String(rawValue).toLowerCase().trim());
};

const runReminderJob = async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const bookings = await Booking.find({
        status: 'approved',
        reminderSent: false,
        startTime: {
            $gt: now,
            $lte: oneHourLater
        }
    }).populate('room');

    for (const booking of bookings) {
        console.log(`Sending reminder for booking ${booking._id}`);
        const deliveryResult = await sendBookingReminder(booking);

        if (deliveryResult?.success) {
            booking.reminderSent = true;
            await booking.save();
            continue;
        }

        console.warn(`[Scheduler] Reminder email not marked as sent for booking ${booking._id} (${deliveryResult?.code || 'UNKNOWN_FAILURE'})`);
    }
};

const startScheduler = () => {
    if (!isSchedulerEnabled()) {
        console.log('[Scheduler] Booking reminder scheduler disabled by configuration.');
        return null;
    }

    if (reminderTask) {
        return reminderTask;
    }

    reminderTask = cron.schedule('* * * * *', async () => {
        try {
            await runReminderJob();
        } catch (error) {
            console.error('Cron Job Error:', error);
        }
    });

    console.log('Scheduler started: Checking for reminders every minute.');
    return reminderTask;
};

const stopScheduler = () => {
    if (!reminderTask) {
        return;
    }

    reminderTask.stop();
    reminderTask.destroy();
    reminderTask = null;
};

module.exports = {
    startScheduler,
    stopScheduler,
    runReminderJob,
    isSchedulerEnabled
};
