const User = require('../models/User');
const admin = require('../config/firebaseAdmin');

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
