const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

// Load env vars
dotenv.config({ path: '../.env' });

const checkUser = async () => {
    try {
        await connectDB();
        const email = 'comedu.trainingroom@gmail.com';
        console.log(`Checking for user: ${email}`);

        const user = await User.findOne({ email });

        if (user) {
            console.log('User FOUND:', user);
        } else {
            console.log('User NOT FOUND in database.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUser();
