/**
 * Export Script — สำหรับ backup ข้อมูลทั้งหมดก่อนย้ายเครื่อง
 * 
 * วิธีใช้:  cd server && node scripts/export_data.js
 * 
 * จะสร้างโฟลเดอร์ backup/ ที่มี:
 *   - db_backup.json  (ข้อมูล MongoDB ทั้งหมด)
 *   - uploads/        (สำเนารูปภาพทั้งหมด)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import all models
require('../models/User');
require('../models/Room');
require('../models/Booking');
require('../models/Report');
require('../models/Setting');

const BACKUP_DIR = path.join(__dirname, '..', 'backup');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BACKUP_UPLOADS_DIR = path.join(BACKUP_DIR, 'uploads');

async function exportData() {
    try {
        console.log('🔌 กำลังเชื่อมต่อ MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/room_booking_v2');
        console.log('✅ เชื่อมต่อ MongoDB สำเร็จ\n');

        // Create backup directory
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const db = mongoose.connection.db;
        const backupData = {};

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`📦 พบ ${collections.length} collections:\n`);

        for (const col of collections) {
            const name = col.name;
            const docs = await db.collection(name).find({}).toArray();
            backupData[name] = docs;
            console.log(`   ✅ ${name}: ${docs.length} รายการ`);
        }

        // Save DB backup
        const backupFile = path.join(BACKUP_DIR, 'db_backup.json');
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`\n💾 บันทึกฐานข้อมูลแล้ว: ${backupFile}`);

        // Copy uploads folder
        if (fs.existsSync(UPLOADS_DIR)) {
            if (!fs.existsSync(BACKUP_UPLOADS_DIR)) {
                fs.mkdirSync(BACKUP_UPLOADS_DIR, { recursive: true });
            }

            const files = fs.readdirSync(UPLOADS_DIR);
            let copied = 0;
            for (const file of files) {
                const src = path.join(UPLOADS_DIR, file);
                const dest = path.join(BACKUP_UPLOADS_DIR, file);
                if (fs.statSync(src).isFile()) {
                    fs.copyFileSync(src, dest);
                    copied++;
                }
            }
            console.log(`🖼️  คัดลอกรูปภาพแล้ว: ${copied} ไฟล์`);
        } else {
            console.log('⚠️  ไม่พบโฟลเดอร์ uploads/');
        }

        console.log('\n========================================');
        console.log('🎉 Export สำเร็จ!');
        console.log(`📁 ไฟล์ backup อยู่ที่: ${BACKUP_DIR}`);
        console.log('========================================');
        console.log('\n💡 ย้ายเครื่อง: คัดลอกโฟลเดอร์ backup/ ไปกับโปรเจกต์');
        console.log('   แล้วรัน: node scripts/import_data.js ในเครื่องใหม่\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Export ผิดพลาด:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

exportData();
