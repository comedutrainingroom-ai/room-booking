const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendBookingReminder } = require('../services/emailService');

const startScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

            // Find valid bookings starting within the next hour that haven't been reminded yet
            const bookings = await Booking.find({
                status: 'approved',
                reminderSent: false,
                startTime: {
                    $gt: now,             // Hasn't started yet
                    $lte: oneHourLater    // Starts within 1 hour
                }
            }).populate('room');

            for (const booking of bookings) {
                console.log(`Sending reminder for booking ${booking._id}`);
                await sendBookingReminder(booking);

                // Mark as sent
                booking.reminderSent = true;
                await booking.save();
            }

        } catch (error) {
            console.error('Cron Job Error:', error);
        }
    });

    console.log('📅 Scheduler started: Checking for reminders every minute.');
};

module.exports = startScheduler;
