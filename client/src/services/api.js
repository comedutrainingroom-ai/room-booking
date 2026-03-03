import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
});

// Add a request interceptor to inject Firebase ID Token
api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        try {
            // Get Firebase ID Token (auto-refreshes if expired)
            const idToken = await auth.currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
        } catch (error) {
            console.error('Error getting ID token:', error);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
