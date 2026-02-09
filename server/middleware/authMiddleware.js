const User = require('../models/User');
const admin = require('../config/firebaseAdmin');

const protect = async (req, res, next) => {
    let token = null;
    let email = null;

    // Check for Bearer token in Authorization header (preferred)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Fallback to email header for backward compatibility (will be removed later)
    if (!token && req.headers.email) {
        console.warn('[AUTH] Using deprecated email header. Please update client to use Bearer token.');
        email = req.headers.email.toLowerCase().trim();
    }

    if (!token && !email) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
    }

    try {
        // If we have a token, verify it with Firebase Admin
        if (token) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(token);
                email = decodedToken.email.toLowerCase().trim();
            } catch (tokenError) {
                console.error('Token verification failed:', tokenError.message);
                return res.status(401).json({ success: false, error: 'Invalid or expired token' });
            }
        }

        // Find user in database
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
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

module.exports = { protect, admin: admin_check };
