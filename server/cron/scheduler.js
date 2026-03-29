const cron = require('node-cron');
const {
    claimReminderBooking,
    deliverClaimedReminder
} = require('../services/bookingReminderService');

let reminderTask = null;
let reminderJobRunning = false;

const isSchedulerEnabled = () => {
    const rawValue = process.env.BOOKING_REMINDER_SCHEDULER_ENABLED;
    if (rawValue === undefined) {
        return true;
    }

    return !['0', 'false', 'off', 'no'].includes(String(rawValue).toLowerCase().trim());
};

const runReminderJob = async () => {
    if (reminderJobRunning) {
        console.log('[Scheduler] Reminder job skipped because a previous run is still in progress.');
        return;
    }

    reminderJobRunning = true;

    try {
        const attemptedBookingIds = new Set();

        while (true) {
            const claimedReminder = await claimReminderBooking({
                excludeBookingIds: [...attemptedBookingIds]
            });

            if (!claimedReminder) {
                break;
            }

            attemptedBookingIds.add(String(claimedReminder.booking._id));
            await deliverClaimedReminder(claimedReminder);
        }
    } finally {
        reminderJobRunning = false;
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
