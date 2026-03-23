import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { clearAdminPinSession, getAdminPinToken } from '../services/adminPinSession';

const ADMIN_PIN_ERROR_CODES = new Set([
    'ADMIN_PIN_REQUIRED',
    'ADMIN_PIN_INVALID',
    'ADMIN_PIN_EXPIRED'
]);

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { currentUser, dbUser, isAdminUnlocked } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const serverUrl = import.meta.env.DEV
            ? 'http://localhost:5000'
            : window.location.origin;

        const socketInstance = io(serverUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true
        });

        socketInstance.on('connect', () => {
            console.log('[Socket.io] Connected successfully');
        });

        socketInstance.on('disconnect', () => {
            console.log('[Socket.io] Disconnected');
        });

        socketInstance.on('admin:session:expired', () => {
            clearAdminPinSession();
        });

        socketInstance.on('admin:join:denied', (payload) => {
            if (ADMIN_PIN_ERROR_CODES.has(payload?.code)) {
                clearAdminPinSession();
            }
        });

        setSocket(socketInstance);

        return () => {
            setTimeout(() => {
                socketInstance.disconnect();
            }, 100);
        };
    }, []);

    useEffect(() => {
        if (!socket) {
            return undefined;
        }

        if (!currentUser || dbUser?.role !== 'admin' || !isAdminUnlocked) {
            socket.emit('leave-admin');
            return undefined;
        }

        let isActive = true;

        const requestAdminJoin = async () => {
            try {
                const adminPinToken = getAdminPinToken();
                if (!adminPinToken) {
                    clearAdminPinSession();
                    socket.emit('leave-admin');
                    return;
                }

                const token = await currentUser.getIdToken();
                if (!isActive) {
                    return;
                }

                socket.emit('join-admin', { token, adminPinToken });
                console.log('[Socket.io] Requested to join admin-room');
            } catch (error) {
                console.error('[Socket.io] Failed to authorize admin-room access', error);
            }
        };

        requestAdminJoin();
        socket.on('connect', requestAdminJoin);

        return () => {
            isActive = false;
            socket.off('connect', requestAdminJoin);
            socket.emit('leave-admin');
        };
    }, [socket, currentUser, dbUser?.role, isAdminUnlocked]);

    const value = useMemo(() => ({ socket }), [socket]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
