const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
// NOTE: express-mongo-sanitize and xss-clean removed — both incompatible with Express v5
// (Express v5 makes req.query read-only, causing TypeError in these packages)
// Using the in-repo request sanitizer middleware instead.
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { requestSanitizer } = require('./middleware/requestSanitizer');
const { attachAdminNotificationSocket } = require('./socket/adminNotificationSocket');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const validateRequiredEnv = () => {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const requiredEnv = [
        'CLIENT_URL',
        'MONGO_URI',
        'ADMIN_PIN',
        'ADMIN_PIN_TOKEN_SECRET',
        'EMAIL_USER',
        'EMAIL_PASS'
    ];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    }
};

validateRequiredEnv();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx) for correct Rate Limiting IPs
const httpServer = http.createServer(app);

// Socket.io Setup
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(httpServer, {
    cors: {
        origin: clientUrl,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to route handlers via req.app.get('io')
app.set('io', io);

attachAdminNotificationSocket(io);

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving uploads
    crossOriginOpenerPolicy: { policy: 'unsafe-none' } // Allow Firebase Auth popup (Google login) window.opener
}));

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute for auth routes
    message: { success: false, error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors({
    origin: clientUrl,
    credentials: true
}));
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(requestSanitizer);

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Database Connection
connectDB();

// Routes
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));

// Start Scheduler
const { startScheduler } = require('./cron/scheduler');
startScheduler();

// Health Check (used by Docker & Nginx)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
