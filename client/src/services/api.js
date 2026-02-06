import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true
});

// Add a request interceptor to inject the user's email
api.interceptors.request.use(async (config) => {
    // Dynamically import auth to avoid circular dependency issues if any
    const { auth } = await import('./firebase');

    if (auth.currentUser) {
        config.headers.email = auth.currentUser.email;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
