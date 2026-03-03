import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { dbUser } = useAuth();
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
            console.log('[Socket.io] Connected:', socketInstance.id);
        });

        socketInstance.on('disconnect', () => {
            console.log('[Socket.io] Disconnected');
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    // Join admin room when user is an admin
    useEffect(() => {
        if (socket && dbUser?.role === 'admin') {
            socket.emit('join-admin');
            console.log('[Socket.io] Requested to join admin-room');
        }
    }, [socket, dbUser]);

    const value = useMemo(() => ({ socket }), [socket]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
