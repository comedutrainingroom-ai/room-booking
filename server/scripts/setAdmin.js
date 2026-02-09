const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') }); // Adjust path to reach root .env

const setAdmin = async () => {
    try {
        await connectDB();

        const email = process.argv[2];

        if (!email) {
            console.log('Please provide an email address.');
            console.log('Usage: node server/scripts/setAdmin.js <email>');
            process.exit(1);
        }

        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            {
                $set: {
                    role: 'admin',
                    isApproved: true,
                    name: email.split('@')[0] // Default name from email
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`Success! User ${user.name} (${user.email}) is now an Admin.`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

setAdmin();
