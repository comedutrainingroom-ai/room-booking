const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Try to load .env from server directory relative to this script
const envPath = path.join(__dirname, '..', '.env');
console.log('Attempting to load .env from:', envPath);
dotenv.config({ path: envPath });

console.log('MONGO_URI:', process.env.MONGO_URI ? 'Defined' : 'Undefined');
console.log('ALLOWED_DOMAINS:', process.env.ALLOWED_DOMAINS);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/room_booking_system');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
