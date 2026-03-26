import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import api from '../services/api';
import {
    ADMIN_PIN_SESSION_EVENT,
    clearAdminPinSession,
    getAdminPinSession,
    setAdminPinSession
} from '../services/adminPinSession';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminPinSession, setAdminPinSessionState] = useState(() => getAdminPinSession());

    const syncAdminPinSession = useCallback(() => {
        setAdminPinSessionState(getAdminPinSession());
    }, []);

    const syncUserWithBackend = useCallback(async (firebaseUser) => {
        try {
            const idToken = await firebaseUser.getIdToken();
            const res = await api.post('/auth/google', { idToken });

            if (res.data.success) {
                const syncedUser = res.data.data;
                setDbUser(syncedUser);
                setCurrentUser(firebaseUser);

                if (syncedUser.role !== 'admin') {
                    clearAdminPinSession();
                }

                return { success: true };
            }
        } catch (error) {
            console.error('Error syncing user with backend', error);
            clearAdminPinSession();

            if (error.response?.data?.code === 'INVALID_EMAIL_DOMAIN') {
                await signOut(auth);
                setCurrentUser(null);
                setDbUser(null);
                return {
                    success: false,
                    error: error.response.data.error,
                    code: 'INVALID_EMAIL_DOMAIN'
                };
            }

            if (error.response?.data?.code === 'BANNED_USER') {
                await signOut(auth);
                setCurrentUser(null);
                setDbUser(null);
                return {
                    success: false,
                    error: error.response.data.error,
                    code: 'BANNED_USER'
                };
            }

            return { success: false, error: error.message };
        }

        return { success: false, error: 'Unable to sync user' };
    }, []);

    const loginWithGoogle = useCallback(async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return await syncUserWithBackend(result.user);
        } catch (error) {
            console.error('Error signing in with Google', error);
            throw error;
        }
    }, [syncUserWithBackend]);

    const logout = useCallback(async () => {
        try {
            if (dbUser?.role === 'admin' && getAdminPinSession()) {
                await api.post('/auth/logout-pin');
            }
        } catch (error) {
            console.error('Error clearing admin PIN session on logout', error);
        }

        clearAdminPinSession();
        setDbUser(null);
        setCurrentUser(null);
        await signOut(auth);
    }, [dbUser]);

    const unlockAdmin = useCallback(async (pin) => {
        try {
            const res = await api.post('/auth/verify-pin', { pin });
            if (res.data.success) {
                setAdminPinSession(res.data.data);
                syncAdminPinSession();
                return { success: true };
            }

            return {
                success: false,
                error: 'PIN verification failed'
            };
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to verify PIN'
            };
        }
    }, [syncAdminPinSession]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleSessionChange = () => {
            syncAdminPinSession();
        };

        window.addEventListener(ADMIN_PIN_SESSION_EVENT, handleSessionChange);
        handleSessionChange();

        return () => {
            window.removeEventListener(ADMIN_PIN_SESSION_EVENT, handleSessionChange);
        };
    }, [syncAdminPinSession]);

    useEffect(() => {
        if (typeof window === 'undefined' || !adminPinSession?.expiresAt) {
            return undefined;
        }

        const expiresInMs = new Date(adminPinSession.expiresAt).getTime() - Date.now();
        if (expiresInMs <= 0) {
            clearAdminPinSession();
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            clearAdminPinSession();
        }, expiresInMs + 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [adminPinSession?.expiresAt]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const result = await syncUserWithBackend(user);

                if (result?.success) {
                    setCurrentUser(user);
                } else {
                    setCurrentUser(null);
                    setDbUser(null);
                }
            } else {
                clearAdminPinSession();
                setCurrentUser(null);
                setDbUser(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, [syncUserWithBackend]);

    const isAdmin = dbUser?.role === 'admin';
    const isAdminUnlocked = isAdmin && Boolean(adminPinSession);

    const value = useMemo(() => ({
        currentUser,
        dbUser,
        loading,
        isAdmin,
        isAdminUnlocked,
        unlockAdmin,
        loginWithGoogle,
        logout,
        syncUserWithBackend
    }), [
        currentUser,
        dbUser,
        loading,
        isAdmin,
        isAdminUnlocked,
        unlockAdmin,
        loginWithGoogle,
        logout,
        syncUserWithBackend
    ]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
