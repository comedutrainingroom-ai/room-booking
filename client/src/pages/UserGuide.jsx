import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import {
    FaQuestionCircle, FaSignInAlt, FaDoorOpen, FaCalendarPlus, FaCheckCircle,
    FaBan, FaExclamationTriangle, FaUserCircle, FaChevronDown, FaChevronUp,
    FaCalendarAlt, FaMousePointer, FaClipboardList, FaInfoCircle, FaBook
} from 'react-icons/fa';

const AccordionItem = ({ icon, title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-3 md:gap-4 p-3.5 md:p-5 text-left transition-all ${isOpen ? 'bg-primary/5' : 'bg-white hover:bg-gray-50'}`}
            >
                <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl ${isOpen ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-400'} transition-all text-sm md:text-base`}>
                    {icon}
                </div>
                <span className="flex-1 font-bold text-gray-800 text-sm md:text-base">{title}</span>
                {isOpen ? <FaChevronUp className="text-primary text-xs md:text-sm" /> : <FaChevronDown className="text-gray-300 text-xs md:text-sm" />}
            </button>
            <div className={`transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-4 md:p-6 pt-1 md:pt-2 text-gray-600 leading-relaxed text-xs md:text-base">
                    {children}
                </div>
            </div>
        </div>
    );
};

const StepItem = ({ number, title, description }) => (
    <div className="flex gap-3 md:gap-4 items-start">
        <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] md:text-sm flex-shrink-0 shadow-sm mt-0.5 md:mt-0">
            {number}
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 text-sm md:text-base leading-tight md:leading-normal">{title}</h4>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
    </div>
);

const UserGuide = () => {
    const { settings } = useSettings();

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-6 md:mb-12">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-full bg-primary/10 text-primary text-xl md:text-3xl mb-3 md:mb-4">
                    <FaQuestionCircle />
                </div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">คู่มือการใช้งานระบบ</h1>
                <p className="text-gray-500 text-xs md:text-base">แนะนำวิธีการใช้งานระบบจองห้องอบรมสำหรับผู้ใช้ทั่วไป</p>
            </div>

            {/* Quick Start Banner */}
            <div className="bg-gradient-to-r from-primary/10 to-emerald-50 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-primary/20 flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10 text-primary text-lg md:text-xl flex-shrink-0">
                    <FaInfoCircle />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 mb-1 text-sm md:text-base">เริ่มต้นใช้งาน</h3>
                    <p className="text-gray-600 text-xs md:text-sm">
                        ระบบจองห้องอบรมใช้งานง่ายเพียง 3 ขั้นตอน: <strong>เข้าสู่ระบบ → เลือกห้อง → จอง!</strong>
                        {' '}อ่านคู่มือด้านล่างเพื่อเรียนรู้รายละเอียดเพิ่มเติม
                    </p>
                </div>
            </div>

            {/* Guide Sections */}
            <div className="space-y-4">
                {/* 1. Login */}
                <AccordionItem icon={<FaSignInAlt />} title="1. วิธีเข้าสู่ระบบ" defaultOpen={true}>
                    <div className="space-y-4">
                        <p>ระบบรองรับการเข้าสู่ระบบผ่าน <strong>Google Account ของมหาวิทยาลัย</strong> เท่านั้น</p>
                        <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                            <StepItem number="1" title="เปิดหน้าเว็บระบบจองห้อง" description="ไปที่หน้า Login ของระบบ" />
                            <StepItem number="2" title='กดปุ่ม "เข้าสู่ระบบด้วย Google"' description="ระบบจะเปิดหน้าต่าง Google Sign-In ขึ้นมา" />
                            <StepItem number="3" title="เลือกบัญชี @kmutnb.ac.th" description="ใช้อีเมลมหาวิทยาลัย เช่น s66xxxxx@email.kmutnb.ac.th" />
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                            ⚠️ <strong>หมายเหตุ:</strong> ไม่สามารถใช้ Gmail ส่วนตัวได้ ต้องเป็นอีเมลของมหาวิทยาลัยเท่านั้น
                        </div>
                    </div>
                </AccordionItem>

                {/* 2. View Calendar */}
                <AccordionItem icon={<FaCalendarAlt />} title="2. ดูปฏิทินการจอง">
                    <div className="space-y-4">
                        <p>หน้า <strong>ปฏิทินการจอง</strong> แสดงการจองทั้งหมดในระบบแบบภาพรวม</p>
                        <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                            <StepItem number="1" title='คลิกเมนู "ปฏิทินการจอง" ที่ Sidebar' description="จะเห็นปฏิทินรายเดือน/สัปดาห์/วัน" />
                            <StepItem number="2" title="ดูรายการจอง" description="แต่ละบล็อกสีคือการจองที่มีอยู่ กดที่บล็อกเพื่อดูรายละเอียด" />
                            <StepItem number="3" title="กดที่วันที่เพื่อจอง" description="ระบบจะพาไปหน้าเลือกห้องอัตโนมัติ" />
                        </div>
                    </div>
                </AccordionItem>

                {/* 3. How to Book */}
                <AccordionItem icon={<FaCalendarPlus />} title="3. วิธีจองห้อง (สำคัญ!)">
                    <div className="space-y-4">
                        <p className="font-medium">มี 2 วิธีในการจองห้อง:</p>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h4 className="font-bold text-blue-800 mb-2">วิธีที่ 1: จากปฏิทิน</h4>
                            <p className="text-sm text-blue-700">กดที่วันที่ในปฏิทิน → ระบบพาไปเลือกห้อง → เลือกช่วงเวลา → จอง</p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <h4 className="font-bold text-green-800 mb-2">วิธีที่ 2: จากเมนู "เลือกห้องอบรม"</h4>
                            <div className="space-y-3 mt-3">
                                <StepItem number="1" title='คลิก "เลือกห้องอบรม" ที่ Sidebar' description="จะเห็นรายชื่อห้องทั้งหมดที่ใช้ได้" />
                                <StepItem number="2" title="เลือกห้องที่ต้องการ" description="ดูรายละเอียดห้อง เช่น ความจุ อุปกรณ์" />
                                <StepItem number="3" title="เลือกวันที่" description="กดเลือกวันที่ต้องการจอง" />
                                <StepItem number="4" title="เลือกช่วงเวลา" description={`กดช่องเวลาเริ่ม แล้วกดช่องเวลาสิ้นสุด (จองได้สูงสุด ${settings?.maxBookingHours || 4} ชั่วโมง)`} />
                                <StepItem number="5" title="กรอกข้อมูลและยืนยัน" description="กรอกหัวข้อ, หมายเหตุ แล้วกดจอง" />
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                            💡 <strong>เคล็ดลับ:</strong> ช่องสีเทาคือเวลาที่ถูกจองแล้ว ช่องสีขาวคือเวลาที่ว่าง
                        </div>
                    </div>
                </AccordionItem>

                {/* 4. Booking Rules */}
                <AccordionItem icon={<FaClipboardList />} title="4. เงื่อนไขการจอง">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">ระยะเวลาสูงสุด</div>
                                <div className="text-lg font-bold text-gray-800">{settings?.maxBookingHours || 4} ชั่วโมง / ครั้ง</div>
                            </div>
                            <div className="bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">จองล่วงหน้าได้</div>
                                <div className="text-lg font-bold text-gray-800">{settings?.maxBookingDays || 30} วัน</div>
                            </div>
                            <div className="bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">เวลาเปิดให้จอง</div>
                                <div className="text-lg font-bold text-gray-800">{settings?.openTime || '08:00'} - {settings?.closeTime || '20:00'} น.</div>
                            </div>
                            <div className="bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                                <div className="text-xs text-gray-400 font-bold uppercase mb-1">วันเสาร์-อาทิตย์</div>
                                <div className="text-lg font-bold text-gray-800">{settings?.weekendBooking ? '✅ จองได้' : '❌ ไม่อนุญาต'}</div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            📌 เงื่อนไขอาจเปลี่ยนแปลงตามที่ผู้ดูแลระบบกำหนด ดูรายละเอียดเพิ่มเติมที่{' '}
                            <Link to="/room-rules" className="text-primary hover:underline font-medium">กฎระเบียบการใช้ห้อง</Link>
                        </p>
                    </div>
                </AccordionItem>

                {/* 5. Booking Status */}
                <AccordionItem icon={<FaCheckCircle />} title="5. สถานะการจอง">
                    <div className="space-y-3">
                        <p>หลังจองแล้ว จะต้องรอผู้ดูแลระบบอนุมัติ สถานะมีดังนี้:</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 bg-yellow-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-yellow-100">
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">PENDING</span>
                                <span className="text-sm">รอการอนุมัติ — ผู้ดูแลระบบยังไม่ได้ตรวจสอบ</span>
                            </div>
                            <div className="flex items-center gap-3 bg-green-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-green-100">
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">APPROVED</span>
                                <span className="text-sm">อนุมัติแล้ว — คุณสามารถใช้ห้องได้ตามเวลาที่จอง</span>
                            </div>
                            <div className="flex items-center gap-3 bg-red-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-red-100">
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">REJECTED</span>
                                <span className="text-sm">ถูกปฏิเสธ — ผู้ดูแลระบบไม่อนุมัติการจอง</span>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-gray-100">
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">CANCELLED</span>
                                <span className="text-sm">ยกเลิกแล้ว — คุณหรือผู้ดูแลระบบยกเลิกการจอง</span>
                            </div>
                        </div>
                    </div>
                </AccordionItem>

                {/* 6. Cancel Booking */}
                <AccordionItem icon={<FaBan />} title="6. วิธียกเลิกการจอง">
                    <div className="space-y-4">
                        <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                            <StepItem number="1" title='ไปที่ "ประวัติการจอง"' description="คลิกที่เมนู Sidebar" />
                            <StepItem number="2" title="หาการจองที่ต้องการยกเลิก" description='มองหาการจองที่มีสถานะ "PENDING"' />
                            <StepItem number="3" title='กดปุ่ม "ยกเลิกการจอง"' description="ยืนยันการยกเลิก" />
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                            ⚠️ <strong>สำคัญ:</strong> สามารถยกเลิกได้เฉพาะการจองที่สถานะเป็น <strong>"PENDING"</strong> เท่านั้น
                            หากอนุมัติแล้ว ให้ติดต่อผู้ดูแลระบบเพื่อยกเลิก
                        </div>
                    </div>
                </AccordionItem>

                {/* 7. Report Issue */}
                <AccordionItem icon={<FaExclamationTriangle />} title="7. วิธีแจ้งปัญหา/แจ้งซ่อม">
                    <div className="space-y-4">
                        <p>หากพบอุปกรณ์ชำรุดหรือปัญหาในห้อง สามารถแจ้งผ่านระบบได้</p>
                        <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                            <StepItem number="1" title='คลิก "แจ้งปัญหา" ที่ Sidebar' description="ไปยังหน้าแจ้งปัญหา" />
                            <StepItem number="2" title="เลือกห้องที่มีปัญหา" description="เลือกจาก dropdown หรือเลือก 'อื่นๆ'" />
                            <StepItem number="3" title="กรอกรายละเอียด" description="ระบุหัวข้อ, รายละเอียดปัญหา, ระดับความเร่งด่วน" />
                            <StepItem number="4" title="แนบรูปภาพ (ถ้ามี)" description="ถ่ายรูปปัญหาเพื่อประกอบการแจ้ง" />
                            <StepItem number="5" title="กดส่ง" description="ผู้ดูแลระบบจะได้รับแจ้งเตือนทันที" />
                        </div>
                    </div>
                </AccordionItem>

                {/* 8. Profile */}
                <AccordionItem icon={<FaUserCircle />} title="8. จัดการข้อมูลส่วนตัว">
                    <div className="space-y-4">
                        <p>คุณสามารถแก้ไขข้อมูลส่วนตัวได้ที่หน้า Profile</p>
                        <div className="space-y-3 bg-gray-50 p-3 md:p-4 rounded-lg md:rounded-xl">
                            <StepItem number="1" title="คลิกรูปโปรไฟล์ที่มุมขวาบน" description="จะมี dropdown ให้เลือก 'ข้อมูลส่วนตัว'" />
                            <StepItem number="2" title="แก้ไขข้อมูล" description="ชื่อ, เบอร์โทร, รหัสนักศึกษา, คณะ" />
                            <StepItem number="3" title="กดบันทึก" description="ข้อมูลจะถูกบันทึกลงระบบ" />
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                            💡 <strong>แนะนำ:</strong> กรอกเบอร์โทรไว้ เพื่อให้ผู้ดูแลระบบติดต่อได้กรณีมีปัญหาเกี่ยวกับการจอง
                        </div>
                    </div>
                </AccordionItem>
            </div>

            {/* Contact */}
            {settings?.contactEmail && (
                <div className="mt-6 md:mt-12 text-center text-gray-500 text-xs md:text-sm">
                    <p>หากมีข้อสงสัย ติดต่อ: <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">{settings.contactEmail}</a></p>
                </div>
            )}
        </div>
    );
};

export default UserGuide;
