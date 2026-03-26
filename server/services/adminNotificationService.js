const ADMIN_NOTIFICATION_ROOM = 'admin-notification-room';

const emitToAdminNotifications = (io, event, payload = {}) => {
    if (!io) {
        return;
    }

    io.to(ADMIN_NOTIFICATION_ROOM).emit(event, payload);
};

const emitBookingCreatedNotification = (io, booking) => {
    emitToAdminNotifications(io, 'booking:created', {
        bookingId: booking._id
    });
};

const emitBookingUpdatedNotification = (io, booking) => {
    emitToAdminNotifications(io, 'booking:updated', {
        bookingId: booking._id,
        status: booking.status
    });
};

const emitBookingDeletedNotification = (io, bookingId) => {
    emitToAdminNotifications(io, 'booking:deleted', {
        bookingId
    });
};

const emitBookingImportedNotification = (io, count) => {
    emitToAdminNotifications(io, 'booking:imported', {
        count
    });
};

const emitReportCreatedNotification = (io, report) => {
    emitToAdminNotifications(io, 'report:created', {
        reportId: report._id
    });
};

const emitReportUpdatedNotification = (io, report) => {
    emitToAdminNotifications(io, 'report:updated', {
        reportId: report._id,
        status: report.status
    });
};

module.exports = {
    ADMIN_NOTIFICATION_ROOM,
    emitBookingCreatedNotification,
    emitBookingUpdatedNotification,
    emitBookingDeletedNotification,
    emitBookingImportedNotification,
    emitReportCreatedNotification,
    emitReportUpdatedNotification
};
