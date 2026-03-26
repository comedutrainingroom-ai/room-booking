import axios from 'axios';
import { auth } from './firebase';
import { clearAdminPinSession, getAdminPinToken } from './adminPinSession';

const ADMIN_PIN_HEADER_NAME = 'x-admin-pin-token';
const ADMIN_PIN_ERROR_CODES = new Set([
    'ADMIN_PIN_REQUIRED',
    'ADMIN_PIN_INVALID',
    'ADMIN_PIN_EXPIRED',
    'ADMIN_PIN_REVOKED'
]);

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
});

// Add a request interceptor to inject Firebase ID Token
api.interceptors.request.use(async (config) => {
    config.headers = config.headers || {};

    if (auth.currentUser) {
        try {
            // Get Firebase ID Token (auto-refreshes if expired)
            const idToken = await auth.currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
        } catch (error) {
            console.error('Error getting ID token:', error);
        }
    }

    const adminPinToken = getAdminPinToken();
    if (adminPinToken) {
        config.headers[ADMIN_PIN_HEADER_NAME] = adminPinToken;
    } else {
        delete config.headers[ADMIN_PIN_HEADER_NAME];
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => response, (error) => {
    const errorCode = error.response?.data?.code;
    if (ADMIN_PIN_ERROR_CODES.has(errorCode)) {
        clearAdminPinSession();
    }

    return Promise.reject(error);
});

export default api;
