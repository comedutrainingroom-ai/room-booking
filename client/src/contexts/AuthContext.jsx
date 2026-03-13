import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [dbUser, setDbUser] = useState(null); // User data from MongoDB (with Role)
    const [loading, setLoading] = useState(true);
    const [isAdminUnlocked, setIsAdminUnlocked] = useState(false); // 2nd Factor for Admin

    const loginWithGoogle = useCallback(async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            // Sync with backend immediately after login
            const syncResult = await syncUserWithBackend(result.user);
            return syncResult;
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    }, []);

    const syncUserWithBackend = useCallback(async (firebaseUser) => {
        try {
            // Get Firebase ID Token for server-side verification
            const idToken = await firebaseUser.getIdToken();
            const res = await api.post('/auth/google', {
                idToken
            });
            if (res.data.success) {
                setDbUser(res.data.data);
                setCurrentUser(firebaseUser);
                return { success: true };
            }
        } catch (error) {
            console.error("Error syncing user with backend", error);

            // Handle invalid email domain
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

            // Handle banned user
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
    }, []);

    const logout = useCallback(() => {
        setDbUser(null);
        setIsAdminUnlocked(false);
        return signOut(auth);
    }, []);

    const unlockAdmin = useCallback(async (pin) => {
        try {
            const res = await api.post('/auth/verify-pin', { pin });
            if (res.data.success) {
                setIsAdminUnlocked(true);
                return { success: true };
            }
            return { success: false, error: 'PIN ไม่ถูกต้อง' };
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'เกิดข้อผิดพลาดในการตรวจสอบ PIN'
            };
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Validate with backend before setting currentUser
                const result = await syncUserWithBackend(user);

                // Only set currentUser if backend validation passed
                if (result?.success) {
                    setCurrentUser(user);
                } else {
                    // Invalid email domain - user was signed out in syncUserWithBackend
                    setCurrentUser(null);
                    setDbUser(null);
                }
            } else {
                setCurrentUser(null);
                setDbUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const isAdmin = dbUser?.role === 'admin';

    const value = useMemo(() => ({
        currentUser,
        dbUser,
        isAdmin,
        isAdminUnlocked,
        unlockAdmin,
        loginWithGoogle,
        logout,
        syncUserWithBackend
    }), [currentUser, dbUser, isAdmin, isAdminUnlocked, unlockAdmin, loginWithGoogle, logout, syncUserWithBackend]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
