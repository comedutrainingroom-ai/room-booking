const User = require('../models/User');

const protect = async (req, res, next) => {
    let email = req.headers['email'] || req.headers.email;

    if (!email) {
        return res.status(401).json({ success: false, error: 'Not authorized, no email' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ success: false, error: 'Not authorized' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
