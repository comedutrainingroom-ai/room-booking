import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';

const AdminNotificationsContext = createContext(null);

const EMPTY_NOTIFICATIONS = {
    bookings: 0,
    reports: 0
};

export const useAdminNotifications = () => {
    const context = useContext(AdminNotificationsContext);

    if (!context) {
        throw new Error('useAdminNotifications must be used within an AdminNotificationsProvider');
    }

    return context;
};

export const AdminNotificationsProvider = ({ children }) => {
    const { dbUser } = useAuth();
    const { socket } = useSocket();
    const isAdmin = dbUser?.role === 'admin';
    const [notifications, setNotifications] = useState(EMPTY_NOTIFICATIONS);

    const refreshNotifications = useCallback(async () => {
        if (!isAdmin) {
            return;
        }

        try {
            const [bookingsRes, reportsRes] = await Promise.all([
                api.get('/bookings/notification-summary'),
                api.get('/reports/notification-summary')
            ]);

            setNotifications({
                bookings: bookingsRes.data?.data?.pendingCount || 0,
                reports: reportsRes.data?.data?.pendingCount || 0
            });
        } catch (error) {
            console.error('Failed to refresh admin notification counts', error);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) {
            setNotifications(EMPTY_NOTIFICATIONS);
            return;
        }

        refreshNotifications();
    }, [isAdmin, refreshNotifications]);

    useEffect(() => {
        if (!socket || !isAdmin) {
            return undefined;
        }

        const handleRefresh = () => {
            refreshNotifications();
        };

        socket.on('connect', handleRefresh);
        socket.on('booking:created', handleRefresh);
        socket.on('booking:updated', handleRefresh);
        socket.on('booking:deleted', handleRefresh);
        socket.on('booking:imported', handleRefresh);
        socket.on('report:created', handleRefresh);
        socket.on('report:updated', handleRefresh);

        return () => {
            socket.off('connect', handleRefresh);
            socket.off('booking:created', handleRefresh);
            socket.off('booking:updated', handleRefresh);
            socket.off('booking:deleted', handleRefresh);
            socket.off('booking:imported', handleRefresh);
            socket.off('report:created', handleRefresh);
            socket.off('report:updated', handleRefresh);
        };
    }, [socket, isAdmin, refreshNotifications]);

    const value = useMemo(() => ({
        notifications,
        totalPendingNotifications: notifications.bookings + notifications.reports,
        refreshNotifications
    }), [notifications, refreshNotifications]);

    return (
        <AdminNotificationsContext.Provider value={value}>
            {children}
        </AdminNotificationsContext.Provider>
    );
};
