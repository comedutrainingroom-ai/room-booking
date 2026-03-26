const User = require('../models/User');
const Setting = require('../models/Setting');
const admin = require('../config/firebaseAdmin');
const { TOKEN_HEADER_NAME, verifyAdminPinToken } = require('../services/adminPinTokenService');

const MAINTENANCE_ALLOWED_PATHS = [
    '/api/settings/runtime'
];

const isMaintenanceAllowedRequest = (req) => MAINTENANCE_ALLOWED_PATHS.some((allowedPath) => (
    req.originalUrl === allowedPath || req.originalUrl.startsWith(`${allowedPath}?`)
));

const protect = async (req, res, next) => {
    let token = null;

    // Check for Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }

    try {
        // Verify token with Firebase Admin
        let email;
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            email = decodedToken.email.toLowerCase().trim();
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError.message);
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        // Find user in database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({ success: false, error: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
        }

        req.user = user;
        req.adminUnlocked = false;
        req.adminPinTokenError = null;

        if (user.role === 'admin') {
            const adminPinToken = req.headers[TOKEN_HEADER_NAME];

            if (adminPinToken) {
                const verification = verifyAdminPinToken(adminPinToken, user);
                if (verification.valid) {
                    req.adminUnlocked = true;
                } else {
                    req.adminPinTokenError = verification;
                }
            }
        }

        req.user.adminUnlocked = req.adminUnlocked;

        if (user.role !== 'admin') {
            const settings = await Setting.findOne().select('maintenanceMode');
            if (settings?.maintenanceMode && !isMaintenanceAllowedRequest(req)) {
                return res.status(503).json({
                    success: false,
                    error: 'System is currently under maintenance. Please try again later.',
                    code: 'MAINTENANCE_MODE'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ success: false, error: 'Not authorized' });
    }
};

const admin_check = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Not authorized as an admin' });
    }
};

const admin_unlocked = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized as an admin' });
    }

    if (req.adminUnlocked) {
        return next();
    }

    const tokenError = req.adminPinTokenError || {
        code: 'ADMIN_PIN_REQUIRED',
        error: 'Admin PIN verification required'
    };

    return res.status(403).json({
        success: false,
        error: tokenError.error,
        code: tokenError.code
    });
};

module.exports = {
    protect,
    admin: admin_check,
    adminUnlocked: admin_unlocked
};
