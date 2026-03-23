export const LOGIN_GUIDE_TONES = [
    { value: 'emerald', label: 'เขียว' },
    { value: 'cyan', label: 'ฟ้า' },
    { value: 'amber', label: 'เหลือง' },
    { value: 'rose', label: 'ชมพู' }
];

export const LOGIN_GUIDE_ICONS = [
    { value: 'shield', label: 'ความปลอดภัย' },
    { value: 'calendar', label: 'การจอง' },
    { value: 'status', label: 'สถานะ' },
    { value: 'info', label: 'ข้อมูลทั่วไป' },
    { value: 'book', label: 'คู่มือ' },
    { value: 'pointer', label: 'เริ่มต้นใช้งาน' }
];

export const DEFAULT_LOGIN_GUIDE = {
    badgeText: 'Quick Guide',
    title: 'คู่มือใช้งานก่อนล็อกอิน',
    description: 'อ่านภาพรวมสั้นๆ ก่อนเริ่มใช้งาน ระบบนี้ใช้บัญชีมหาวิทยาลัยและสามารถจองห้องได้ในไม่กี่ขั้นตอน',
    quickStartTitle: 'เริ่มใช้งานเร็วใน 3 ขั้นตอน',
    quickStartSteps: [
        'กดปุ่ม KMUTNB Account แล้วเลือกบัญชี @kmutnb.ac.th',
        'หลังเข้าใช้ ไปที่ปฏิทินหรือเลือกห้องเพื่อเลือกวันและเวลา',
        'กรอกหัวข้อการใช้งานแล้วส่งคำขอ จากนั้นติดตามผลในประวัติการจอง'
    ],
    ruleHighlights: [
        'ใช้อีเมล @kmutnb.ac.th เท่านั้น',
        'เวลาเปิดให้จองตามที่ระบบกำหนด',
        'การจองวันเสาร์-อาทิตย์ขึ้นกับการตั้งค่าระบบ',
        'ระยะเวลาสูงสุดต่อครั้งขึ้นกับกฎของระบบ',
        'ระยะเวลาจองล่วงหน้าขึ้นกับกฎของระบบ'
    ],
    sections: [
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
    ],
    footerNote: 'หลังล็อกอินแล้ว หากอยากอ่านแบบละเอียด ระบบยังมีเมนู “คู่มือการใช้งาน” ให้เปิดดูได้อีกครั้ง'
};

const normalizeSection = (section, fallbackSection) => ({
    icon: section?.icon || fallbackSection.icon,
    title: section?.title || fallbackSection.title,
    description: section?.description || fallbackSection.description,
    bullets: Array.isArray(section?.bullets) && section.bullets.length > 0
        ? section.bullets.filter(Boolean)
        : [...fallbackSection.bullets],
    tone: section?.tone || fallbackSection.tone
});

export const normalizeLoginGuide = (guide = {}) => ({
    badgeText: guide?.badgeText || DEFAULT_LOGIN_GUIDE.badgeText,
    title: guide?.title || DEFAULT_LOGIN_GUIDE.title,
    description: guide?.description || DEFAULT_LOGIN_GUIDE.description,
    quickStartTitle: guide?.quickStartTitle || DEFAULT_LOGIN_GUIDE.quickStartTitle,
    quickStartSteps: Array.isArray(guide?.quickStartSteps) && guide.quickStartSteps.length > 0
        ? guide.quickStartSteps.filter(Boolean)
        : [...DEFAULT_LOGIN_GUIDE.quickStartSteps],
    ruleHighlights: Array.isArray(guide?.ruleHighlights) && guide.ruleHighlights.length > 0
        ? guide.ruleHighlights.filter(Boolean)
        : [...DEFAULT_LOGIN_GUIDE.ruleHighlights],
    sections: Array.isArray(guide?.sections) && guide.sections.length > 0
        ? guide.sections.map((section, index) => normalizeSection(section, DEFAULT_LOGIN_GUIDE.sections[index] || DEFAULT_LOGIN_GUIDE.sections.at(-1)))
        : DEFAULT_LOGIN_GUIDE.sections.map((section) => ({ ...section, bullets: [...section.bullets] })),
    footerNote: guide?.footerNote || DEFAULT_LOGIN_GUIDE.footerNote
});

export const splitTextareaList = (value) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export const joinTextareaList = (items = []) => items.join('\n');

export const interpolateGuideText = (template, variables) => (
    String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => variables[key] ?? '')
);
