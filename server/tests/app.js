const express = require('express');
const { requestSanitizer } = require('../middleware/requestSanitizer');

// Create a test-ready Express app (same middleware as server.js but without Socket.io/DB connect)
const createApp = () => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(requestSanitizer);

    // Mock io for socket events
    app.set('io', {
        to: () => ({ emit: () => { } })
    });

    // Routes
    app.use('/api/rooms', require('../routes/roomRoutes'));
    app.use('/api/bookings', require('../routes/bookingRoutes'));
    app.use('/api/settings', require('../routes/settingsRoutes'));
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
    app.use('/api/users', require('../routes/userRoutes'));

    // Global error handler for Express v5 async errors
    app.use((err, req, res, next) => {
        console.error('Test app error:', err.message);
        res.status(err.status || 500).json({
            success: false,
            error: err.message || 'Server Error'
        });
    });

    return app;
};

module.exports = createApp;
