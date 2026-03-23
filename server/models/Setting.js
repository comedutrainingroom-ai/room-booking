const mongoose = require('mongoose');

const loginGuideSectionSchema = new mongoose.Schema({
    icon: {
        type: String,
        default: 'shield'
    },
    title: {
        type: String,
        default: 'เข้าสู่ระบบให้ถูกบัญชี'
    },
    description: {
        type: String,
        default: 'ระบบจะอนุญาตเฉพาะอีเมลมหาวิทยาลัย เพื่อป้องกันคนนอกเข้าถึงการจองและข้อมูลภายใน'
    },
    bullets: {
        type: [String],
        default: () => ([
            'กดปุ่ม KMUTNB Account',
            'เลือกบัญชี @kmutnb.ac.th ของตัวเอง',
            'ถ้าใช้อีเมลอื่น ระบบจะไม่อนุญาตให้เข้า'
        ])
    },
    tone: {
        type: String,
        default: 'emerald'
    }
}, { _id: false });

const loginGuideSchema = new mongoose.Schema({
    badgeText: {
        type: String,
        default: 'Quick Guide'
    },
    title: {
        type: String,
        default: 'คู่มือใช้งานก่อนล็อกอิน'
    },
    description: {
        type: String,
        default: 'อ่านภาพรวมสั้นๆ ก่อนเริ่มใช้งาน ระบบนี้ใช้บัญชีมหาวิทยาลัยและสามารถจองห้องได้ในไม่กี่ขั้นตอน'
    },
    quickStartTitle: {
        type: String,
        default: 'เริ่มใช้งานเร็วใน 3 ขั้นตอน'
    },
    quickStartSteps: {
        type: [String],
        default: () => ([
            'กดปุ่ม KMUTNB Account แล้วเลือกบัญชี @kmutnb.ac.th',
            'หลังเข้าใช้ ไปที่ปฏิทินหรือเลือกห้องเพื่อเลือกวันและเวลา',
            'กรอกหัวข้อการใช้งานแล้วส่งคำขอ จากนั้นติดตามผลในประวัติการจอง'
        ])
    },
    ruleHighlights: {
        type: [String],
        default: () => ([
            'ใช้อีเมล @kmutnb.ac.th เท่านั้น',
            'เวลาเปิดให้จองตามที่ระบบกำหนด',
            'การจองวันเสาร์-อาทิตย์ขึ้นกับการตั้งค่าระบบ',
            'ระยะเวลาสูงสุดต่อครั้งขึ้นกับกฎของระบบ',
            'ระยะเวลาจองล่วงหน้าขึ้นกับกฎของระบบ'
        ])
    },
    sections: {
        type: [loginGuideSectionSchema],
        default: () => ([
            {
                icon: 'shield',
                title: 'เข้าสู่ระบบให้ถูกบัญชี',
                description: 'ระบบจะอนุญาตเฉพาะอีเมลมหาวิทยาลัย เพื่อป้องกันคนนอกเข้าถึงการจองและข้อมูลภายใน',
                bullets: [
                    'กดปุ่ม KMUTNB Account',
                    'เลือกบัญชี @kmutnb.ac.th ของตัวเอง',
                    'ถ้าใช้อีเมลอื่น ระบบจะไม่อนุญาตให้เข้า'
                ],
                tone: 'emerald'
            },
            {
                icon: 'calendar',
                title: 'วิธีจองห้องแบบเร็ว',
                description: 'หลังล็อกอินแล้วสามารถเริ่มจากปฏิทินหรือเมนูเลือกห้องก็ได้ ขึ้นกับว่าคุณเริ่มจากเวลา หรือเริ่มจากห้องที่ต้องการ',
                bullets: [
                    'ดูปฏิทินเพื่อหาเวลาว่าง',
                    'หรือเปิดเมนูเลือกห้องเพื่อดูรายละเอียดห้อง',
                    'ระยะเวลาสูงสุดต่อครั้งเป็นไปตามกฎที่ระบบกำหนด'
                ],
                tone: 'cyan'
            },
            {
                icon: 'status',
                title: 'ติดตามผลหลังส่งคำขอ',
                description: 'คำขอที่ส่งแล้วจะมีสถานะให้ติดตาม และสามารถย้อนกลับไปดูที่ประวัติการจองได้ทุกเมื่อ',
                bullets: [
                    'Pending = รอตรวจสอบ',
                    'Approved = อนุมัติแล้ว ใช้งานได้ตามเวลาที่จอง',
                    'Rejected/Cancelled = คำขอไม่ผ่านหรือถูกยกเลิก'
                ],
                tone: 'rose'
            },
            {
                icon: 'info',
                title: 'ข้อควรรู้ก่อนใช้งาน',
                description: 'การตั้งค่าบางอย่างขึ้นกับกฎของภาควิชาและอาจมีการปรับโดยผู้ดูแลระบบในภายหลัง',
                bullets: [
                    'จองล่วงหน้าได้ตามจำนวนวันที่ระบบกำหนด',
                    'ช่วงเวลาใช้งานเป็นไปตามเวลาที่เปิดให้จอง',
                    'การจองวันเสาร์-อาทิตย์ขึ้นกับการตั้งค่าระบบ'
                ],
                tone: 'amber'
            }
        ])
    },
    footerNote: {
        type: String,
        default: 'หลังล็อกอินแล้ว หากอยากอ่านแบบละเอียด ระบบยังมีเมนู “คู่มือการใช้งาน” ให้เปิดดูได้อีกครั้ง'
    }
}, { _id: false });

const settingSchema = new mongoose.Schema({
    systemName: {
        type: String,
        default: 'ระบบจองห้องประชุมออนไลน์'
    },
    contactEmail: {
        type: String,
        default: 'admin@example.com'
    },
    themeColor: {
        type: String,
        default: '#16a34a'
    },
    maxBookingDays: {
        type: Number,
        default: 30
    },
    maxBookingHours: {
        type: Number,
        default: 4
    },
    requireApproval: {
        type: Boolean,
        default: true
    },
    weekendBooking: {
        type: Boolean,
        default: false
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    openTime: {
        type: String,
        default: '08:00'
    },
    closeTime: {
        type: String,
        default: '20:00'
    },
    loginGuide: {
        type: loginGuideSchema,
        default: () => ({})
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
