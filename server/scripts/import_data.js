/**
 * Import Script — สำหรับ restore ข้อมูลในเครื่องใหม่
 * 
 * วิธีใช้:  cd server && node scripts/import_data.js
 * 
 * จะอ่านจากโฟลเดอร์ backup/ แล้ว:
 *   - Import ข้อมูลทั้งหมดเข้า MongoDB
 *   - คัดลอกรูปภาพกลับไปที่ uploads/
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backup');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const BACKUP_UPLOADS_DIR = path.join(BACKUP_DIR, 'uploads');

async function importData() {
    try {
        // Check backup exists
        const backupFile = path.join(BACKUP_DIR, 'db_backup.json');
        if (!fs.existsSync(backupFile)) {
            console.error('❌ ไม่พบไฟล์ backup/db_backup.json');
            console.error('   กรุณารัน export_data.js ในเครื่องเก่าก่อน');
            process.exit(1);
        }

        console.log('🔌 กำลังเชื่อมต่อ MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/room_booking_v2');
        console.log('✅ เชื่อมต่อ MongoDB สำเร็จ\n');

        const db = mongoose.connection.db;

        // Read backup
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
        const collectionNames = Object.keys(backupData);
        console.log(`📦 พบข้อมูล ${collectionNames.length} collections:\n`);

        for (const name of collectionNames) {
            const docs = backupData[name];
            if (docs.length === 0) {
                console.log(`   ⏭️  ${name}: ว่าง — ข้าม`);
                continue;
            }

            // Check if collection already has data
            const existingCount = await db.collection(name).countDocuments();
            if (existingCount > 0) {
                console.log(`   ⚠️  ${name}: มีข้อมูลอยู่แล้ว ${existingCount} รายการ — ล้างแล้วใส่ใหม่`);
                await db.collection(name).deleteMany({});
            }

            // Restore ObjectId fields
            const restored = docs.map(doc => {
                if (doc._id && doc._id.$oid) {
                    doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
                } else if (doc._id && typeof doc._id === 'string') {
                    try {
                        doc._id = new mongoose.Types.ObjectId(doc._id);
                    } catch (e) { /* keep original */ }
                }
                return doc;
            });

            await db.collection(name).insertMany(restored);
            console.log(`   ✅ ${name}: นำเข้า ${docs.length} รายการ`);
        }

        // Copy uploads
        if (fs.existsSync(BACKUP_UPLOADS_DIR)) {
            if (!fs.existsSync(UPLOADS_DIR)) {
                fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            }

            const files = fs.readdirSync(BACKUP_UPLOADS_DIR);
            let copied = 0;
            for (const file of files) {
                const src = path.join(BACKUP_UPLOADS_DIR, file);
                const dest = path.join(UPLOADS_DIR, file);
                if (fs.statSync(src).isFile()) {
                    fs.copyFileSync(src, dest);
                    copied++;
                }
            }
            console.log(`\n🖼️  คัดลอกรูปภาพแล้ว: ${copied} ไฟล์`);
        } else {
            console.log('\n⚠️  ไม่พบ backup/uploads/ — ข้ามการคัดลอกรูปภาพ');
        }

        console.log('\n========================================');
        console.log('🎉 Import สำเร็จ!');
        console.log('   ข้อมูลทั้งหมดพร้อมใช้งานแล้ว');
        console.log('========================================\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Import ผิดพลาด:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

importData();
