const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const connectDB = require('../config/db');

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

// Read JSON files
const rooms = [
    {
        name: 'ห้องประชุมใหญ่อเนกประสงค์',
        capacity: 50,
        equipment: ['โปรเจคเตอร์', 'กระดานไวท์บอร์ด', 'ระบบไมโครโฟน', 'ระบบประชุมทางไกล'],
        description: 'ห้องประชุมขนาดใหญ่ เหมาะสำหรับการประชุมทั้งองค์กรและการสัมมนา',
        images: ['room-1769868748967-Gemini_Generated_Image_f9kphyf9kphyf9kp.webp']
    },
    {
        name: 'ห้องอบรม A',
        capacity: 20,
        equipment: ['โปรเจคเตอร์', 'กระดานไวท์บอร์ด', 'คอมพิวเตอร์'],
        description: 'เหมาะสำหรับการอบรมเชิงปฏิบัติการทางเทคนิค พร้อมเครื่องคอมพิวเตอร์ประจำที่นั่ง',
        images: ['room-1769869345319-Gemini_Generated_Image_t9yl3wt9yl3wt9yl.webp']
    },
    {
        name: 'ห้องประชุมย่อย',
        capacity: 5,
        equipment: ['จอทีวี', 'กระดานไวท์บอร์ด'],
        description: 'ห้องขนาดกะทัดรัดสำหรับการหารือเป็นทีมเล็กๆ และการระดมสมอง',
        images: ['room-1769919472931-Gemini_Generated_Image_tf5jx5tf5jx5tf5j.webp']
    }
];

const importData = async () => {
    try {
        await Room.deleteMany();
        await Booking.deleteMany();

        await Room.create(rooms);

        console.log('ข้อมูลถูกนำเข้าแล้ว...');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const deleteData = async () => {
    try {
        await Room.deleteMany();
        await Booking.deleteMany();

        console.log('ข้อมูลถูกลบแล้ว...');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    deleteData();
} else {
    importData();
}
