import { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaUsers, FaBuilding, FaCalendarAlt, FaClock, FaTag, FaUser, FaGraduationCap, FaPhone, FaStickyNote, FaCheck, FaCalendarPlus, FaArrowRight, FaChevronLeft } from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const BookingModal = ({ room, onClose, step, setStep, toast, initialData }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Use hooks directly instead of props
    const { currentUser, dbUser } = useAuth();
    const { settings } = useSettings();

    const openTime = settings?.openTime || '08:00';
    const closeTime = settings?.closeTime || '20:00';

    const [formData, setFormData] = useState({
        date: initialData?.date || (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })(),
        startTime: initialData?.startTime || openTime,
        endTime: initialData?.endTime || '',
        name: currentUser?.displayName || dbUser?.name || '',
        department: dbUser?.faculty || '',
        topic: '',
        phone: dbUser?.phone || '',
        note: ''
    });

    useEffect(() => {
        if (!initialData) {
            const [openHour] = openTime.split(':').map(Number);
            const defaultEndHour = Math.min(openHour + 2, parseInt(closeTime.split(':')[0]));
            setFormData(prev => ({
                ...prev,
                startTime: openTime,
                endTime: `${String(defaultEndHour).padStart(2, '0')}:00`
            }));
        }
    }, [openTime, closeTime, initialData]);

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async () => {
        if (!formData.topic.trim()) {
            toast.error('กรุณากรอกหัวข้อการใช้งาน');
            return;
        }

        // Validate duration against maxBookingHours
        const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

        if (endDateTime <= startDateTime) {
            toast.error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
            return;
        }

        const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
        const maxHours = settings?.maxBookingHours;
        if (maxHours && durationHours > maxHours) {
            toast.error(`ไม่สามารถจองเกิน ${maxHours} ชั่วโมงต่อครั้ง (คุณเลือก ${durationHours} ชั่วโมง)`);
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/bookings', {
                room: room._id,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                topic: formData.topic,
                note: formData.note,
                user: {
                    name: formData.name || currentUser?.displayName || dbUser?.name,
                    email: currentUser?.email,
                    phone: formData.phone,
                    department: formData.department
                }
            });

            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.error || 'ไม่สามารถจองได้');
        } finally {
            setSubmitting(false);
        }
    };

    const timeOptions = useMemo(() => {
        const options = [];
        const [startHour] = openTime.split(':').map(Number);
        const [endHour] = closeTime.split(':').map(Number);

        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                if (h === endHour && m > 0) break;
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                options.push(time);
            }
        }
        return options;
    }, [openTime, closeTime]);

    if (!room) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with Image */}
                <div className="relative h-40 bg-gradient-to-br from-primary to-green-600 flex-shrink-0 overflow-hidden">
                    {room.images && room.images.length > 0 && (
                        <img
                            src={`/uploads/${room.images[currentImageIndex]}`}
                            alt={room.name}
                            className="w-full h-full object-cover opacity-40 transition-all duration-700 ease-out"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-all"
                    >
                        <FaTimes />
                    </button>

                    {/* Room Info */}
                    <div className="absolute bottom-3 left-4 right-4">
                        <h2 className="text-xl font-bold text-white">{room.name}</h2>
                        <div className="flex items-center gap-3 text-white/90 text-sm mt-1">
                            <span className="flex items-center gap-1">
                                <FaUsers /> {room.capacity} คน
                            </span>
                            {room.equipment && (
                                <span className="flex items-center gap-1">
                                    <FaBuilding /> {room.equipment.length} อุปกรณ์
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="absolute bottom-3 right-4 flex gap-1">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-white w-4' : s < step ? 'bg-white/80' : 'bg-white/40'}`} />
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-800 mb-2">รายละเอียดห้อง</h3>
                                <p className="text-gray-600 text-sm">{room.description || 'ห้องอบรมพร้อมอุปกรณ์ครบครัน'}</p>
                            </div>

                            {room.equipment && room.equipment.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">อุปกรณ์</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {room.equipment.map((eq, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {room.images && room.images.length > 1 && (
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-2">รูปภาพ</h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {room.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={`/uploads/${img}`}
                                                alt={`${room.name} ${idx + 1}`}
                                                className={`w-full h-16 object-cover rounded-lg cursor-pointer transition-all ${idx === currentImageIndex ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                                                onClick={() => setCurrentImageIndex(idx)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaCalendarAlt className="inline mr-1.5 text-primary text-xs" />
                                    วันที่
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={handleChange('date')}
                                    min={(() => {
                                        const today = new Date();
                                        const year = today.getFullYear();
                                        const month = String(today.getMonth() + 1).padStart(2, '0');
                                        const day = String(today.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    })()}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                />
                            </div>

                            {/* Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaClock className="inline mr-1.5 text-primary text-xs" />
                                        เริ่ม
                                    </label>
                                    <select
                                        value={formData.startTime}
                                        onChange={handleChange('startTime')}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-sm"
                                    >
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaClock className="inline mr-1.5 text-primary text-xs" />
                                        สิ้นสุด
                                    </label>
                                    <select
                                        value={formData.endTime}
                                        onChange={handleChange('endTime')}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-sm"
                                    >
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Topic */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaTag className="inline mr-1.5 text-primary text-xs" />
                                    หัวข้อการใช้งาน <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.topic}
                                    onChange={handleChange('topic')}
                                    placeholder="เช่น ประชุมทีม, อบรมเชิงปฏิบัติการ"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                />
                            </div>

                            {/* Name & Department */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaUser className="inline mr-1.5 text-primary text-xs" />
                                        ชื่อผู้จอง
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={handleChange('name')}
                                        placeholder="ชื่อ-นามสกุล"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm bg-gray-50"
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaGraduationCap className="inline mr-1.5 text-primary text-xs" />
                                        สาขา/คณะ
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={handleChange('department')}
                                        placeholder="สาขาวิชา หรือ คณะ"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaPhone className="inline mr-1.5 text-primary text-xs" />
                                    เบอร์โทรติดต่อ
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange('phone')}
                                    placeholder="08X-XXX-XXXX"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FaStickyNote className="inline mr-1.5 text-primary text-xs" />
                                    หมายเหตุ
                                </label>
                                <textarea
                                    value={formData.note}
                                    onChange={handleChange('note')}
                                    rows={2}
                                    placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <FaCheck className="text-white text-2xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">ส่งคำขอจองเรียบร้อย!</h3>
                            <p className="text-gray-500 text-sm mb-4">รอการอนุมัติจากผู้ดูแลระบบ<br />ระบบจะแจ้งเตือนผ่านอีเมลเมื่อได้รับการอนุมัติ</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                    {step === 1 && (
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3 bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <FaCalendarPlus />
                            ดำเนินการจอง
                            <FaArrowRight />
                        </button>
                    )}

                    {step === 2 && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                            >
                                <FaChevronLeft />
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 py-3 bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <FaCheck />
                                        ยืนยันการจอง
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-primary hover:bg-green-600 text-white font-bold rounded-xl transition-all"
                        >
                            เสร็จสิ้น
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingModal;
