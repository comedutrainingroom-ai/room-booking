const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

// Load env vars
dotenv.config({ path: '../.env' }); // Adjust path to reach root .env

const setAdmin = async () => {
    try {
        await connectDB();

        const email = process.argv[2];

        if (!email) {
            console.log('Please provide an email address.');
            console.log('Usage: node server/scripts/setAdmin.js <email>');
            process.exit(1);
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.log(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();

        console.log(`Success! User ${user.name} (${user.email}) is now an Admin.`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

setAdmin();
