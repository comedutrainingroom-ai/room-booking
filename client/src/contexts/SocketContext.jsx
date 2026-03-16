import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { currentUser, dbUser } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // In dev, Vite runs on :5173 but Socket.io server is on :5000
        // Use the same base URL as the API (from the Vite proxy target)
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

        setSocket(socketInstance);

        return () => {
            // Delay the disconnect slightly to avoid WebSocket closing errors
            // during React 18 Strict Mode's fast unmount/remount cycle
            setTimeout(() => {
                if (socketInstance) socketInstance.disconnect();
            }, 100);
        };
    }, []);

    // Join admin room when user is an admin
    useEffect(() => {
        if (!socket || !currentUser || dbUser?.role !== 'admin') {
            return undefined;
        }

        let isActive = true;

        const requestAdminJoin = async () => {
            try {
                const token = await currentUser.getIdToken();
                if (!isActive) {
                    return;
                }

                socket.emit('join-admin', { token });
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
        };
    }, [socket, currentUser, dbUser?.role]);

    const value = useMemo(() => ({ socket }), [socket]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
