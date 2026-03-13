import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BookingModal from '../components/BookingModal';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { FaArrowLeft, FaUsers, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes, FaClock, FaCheck, FaLock, FaBook } from 'react-icons/fa';

const RoomBooking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { settings } = useSettings();

    const [room, setRoom] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Selection State
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(2);
    const [initialBookingData, setInitialBookingData] = useState(null);

    const openTime = settings?.openTime || '08:00';
    const closeTime = settings?.closeTime || '20:00';

    useEffect(() => {
        fetchRoomData();
    }, [id, selectedDate]);

    const fetchRoomData = async () => {
        try {
            setLoading(true);
            const [roomRes, bookingsRes] = await Promise.all([
                api.get(`/rooms/${id}`),
                api.get(`/bookings?room=${id}`)
            ]);

            setRoom(roomRes.data.data);
            setBookings(bookingsRes.data.data.filter(b => b.status !== 'rejected'));
        } catch (error) {
            console.error("Error fetching room data", error);
            toast.error("ไม่สามารถโหลดข้อมูลห้องได้");
        } finally {
            setLoading(false);
        }
    };

    const generateTimeSlots = () => {
        const slots = [];
        const [startH] = openTime.split(':').map(Number);
        const [endH] = closeTime.split(':').map(Number);

        for (let h = startH; h < endH; h++) {
            slots.push({
                start: `${String(h).padStart(2, '0')}:00`,
                end: `${String(h + 1).padStart(2, '0')}:00`,
                label: `${String(h).padStart(2, '0')}:00`
            });
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    // Helper to get YYYY-MM-DD in local time
    const toLocalISOString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isSlotOccupied = (slotIndex) => {
        const slot = timeSlots[slotIndex];
        const dateStr = toLocalISOString(selectedDate);
        const slotStart = new Date(`${dateStr}T${slot.start}:00`);
        const slotEnd = new Date(`${dateStr}T${slot.end}:00`);

        return bookings.some(booking => {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);

            // Compare just the date part (YYYY-MM-DD)
            const bookingDateStr = toLocalISOString(bookingStart);
            if (bookingDateStr !== dateStr) return false;

            return (slotStart < bookingEnd && slotEnd > bookingStart);
        });
    };

    const getSlotBooking = (slotIndex) => {
        const slot = timeSlots[slotIndex];
        const dateStr = toLocalISOString(selectedDate);
        const slotStart = new Date(`${dateStr}T${slot.start}:00`);
        const slotEnd = new Date(`${dateStr}T${slot.end}:00`);

        return bookings.find(booking => {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);

            const bookingDateStr = toLocalISOString(bookingStart);
            if (bookingDateStr !== dateStr) return false;

            return (slotStart < bookingEnd && slotEnd > bookingStart);
        });
    };

    const hasOccupiedInRange = (startIdx, endIdx) => {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);

        for (let i = minIdx; i <= maxIdx; i++) {
            if (isSlotOccupied(i)) return true;
        }
        return false;
    };

    const handleSlotClick = (slotIndex) => {
        if (room?.isActive === false) {
            toast.error('ห้องนี้กำลังปิดซ่อมบำรุง ไม่สามารถจองได้');
            return;
        }

        if (isSlotOccupied(slotIndex)) {
            toast.warning('ช่วงเวลานี้ถูกจองแล้ว');
            return;
        }

        if (selectionStart === null) {
            setSelectionStart(slotIndex);
            setSelectionEnd(null);
        } else {
            const startIdx = Math.min(selectionStart, slotIndex);
            const endIdx = Math.max(selectionStart, slotIndex);

            if (hasOccupiedInRange(startIdx, endIdx)) {
                toast.error('ช่วงเวลาที่เลือกมีบางช่องถูกจองแล้ว');
                setSelectionStart(null);
                setSelectionEnd(null);
                return;
            }

            // Check maxBookingHours from settings
            const selectedHours = endIdx - startIdx + 1;
            const maxHours = settings?.maxBookingHours;
            if (maxHours && selectedHours > maxHours) {
                toast.error(`ไม่สามารถจองเกิน ${maxHours} ชั่วโมงต่อครั้ง (คุณเลือก ${selectedHours} ชั่วโมง)`);
                setSelectionStart(null);
                setSelectionEnd(null);
                return;
            }

            const dateStr = toLocalISOString(selectedDate);
            setInitialBookingData({
                date: dateStr,
                startTime: timeSlots[startIdx].start,
                endTime: timeSlots[endIdx].end
            });
            setBookingStep(2);
            setIsModalOpen(true);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    };

    const isInSelectionRange = (slotIndex) => {
        if (selectionStart === null) return false;
        const hoverEnd = selectionEnd !== null ? selectionEnd : selectionStart;
        const minIdx = Math.min(selectionStart, hoverEnd);
        const maxIdx = Math.max(selectionStart, hoverEnd);
        return slotIndex >= minIdx && slotIndex <= maxIdx;
    };

    const handleCancelSelection = () => {
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const handleDateChange = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const formatDate = (date) => {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('th-TH', options);
    };

    const isPastDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const getSelectedDuration = () => {
        if (selectionStart === null) return 0;
        const endIdx = selectionEnd !== null ? selectionEnd : selectionStart;
        return Math.abs(endIdx - selectionStart) + 1;
    };

    if (loading || !room) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full px-0 sm:px-4 py-4 sm:py-8">
            <div className="max-w-6xl mx-auto space-y-3 md:space-y-6">

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-r from-primary via-emerald-500 to-teal-500 rounded-2xl md:rounded-3xl p-3 md:p-6 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/rooms')}
                            className="p-2 md:p-3 bg-white/20 hover:bg-white/30 rounded-lg md:rounded-xl backdrop-blur-sm transition-all"
                        >
                            <FaArrowLeft className="text-sm md:text-base" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-lg md:text-3xl font-bold">{room.name}</h1>
                            <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-white/80 text-xs md:text-sm">
                                <span className="flex items-center gap-1 md:gap-1.5 bg-white/20 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                    <FaUsers className="text-[10px] md:text-sm" /> {room.capacity} คน
                                </span>
                                {room.description && (
                                    <span className="hidden md:inline">{room.description}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Banner */}
                {room.isActive === false && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 text-red-600 rounded-lg shadow-sm shrink-0">
                                <FaLock className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-800">ห้องนี้กำลังปิดซ่อมบำรุง</h3>
                                <p className="text-sm text-red-600/90 mt-0.5">ไม่สามารถทำการจองได้ในขณะนี้ ขออภัยในความไม่สะดวก</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Date Selector Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg border border-white/50 p-3 md:p-5">
                    <div className="flex items-center justify-between gap-2 md:gap-4">
                        <button
                            onClick={() => handleDateChange(-1)}
                            disabled={isPastDate(new Date(selectedDate.getTime() - 86400000))}
                            className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-lg md:rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <FaChevronLeft className="text-slate-600" />
                        </button>

                        <div className="flex-1 text-center">
                            <div className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-r from-primary/10 to-emerald-500/10 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl">
                                <FaCalendarAlt className="text-primary text-base md:text-xl" />
                                <div>
                                    <div className="text-sm md:text-lg font-bold text-gray-800">{formatDate(selectedDate)}</div>
                                </div>
                            </div>
                            <div className="mt-2 md:mt-3">
                                <input
                                    type="date"
                                    value={toLocalISOString(selectedDate)}
                                    min={toLocalISOString(new Date())}
                                    onChange={(e) => {
                                        setSelectedDate(new Date(e.target.value));
                                        setSelectionStart(null);
                                        setSelectionEnd(null);
                                    }}
                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => handleDateChange(1)}
                            className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-lg md:rounded-xl transition-all"
                        >
                            <FaChevronRight className="text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Time Slots */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg border border-white/50 p-3 md:p-6">
                    <div className="flex items-center justify-between mb-3 md:mb-6">
                        <div className="flex-1">
                            <h2 className="text-base md:text-xl font-bold text-gray-800 flex items-center gap-1.5 md:gap-2">
                                <FaClock className="text-primary text-sm md:text-base" />
                                เลือกช่วงเวลา
                            </h2>
                            {selectionStart === null ? (
                                <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">แตะเวลาเริ่มต้น แล้วแตะเวลาสิ้นสุด</p>
                            ) : (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-emerald-600 text-white rounded-md text-xs md:text-sm font-medium shadow-sm">
                                        <FaClock />
                                        เริ่ม {timeSlots[selectionStart].start}
                                        {getSelectedDuration() > 1 && (
                                            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                                                → {getSelectedDuration()} ชม.
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-gray-500 text-xs md:text-sm">กดเลือกเวลาสิ้นสุด</span>
                                </div>
                            )}
                        </div>
                        {selectionStart !== null && (
                            <button
                                onClick={handleCancelSelection}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all"
                                title="ยกเลิกการเลือก"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    {/* Timeline Style Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-3">
                        {timeSlots.map((slot, index) => {
                            const occupied = isSlotOccupied(index);
                            const booking = getSlotBooking(index);
                            const isImported = booking?.isImported || booking?.user?.department === 'Imported';
                            const inRange = isInSelectionRange(index);
                            const isStart = selectionStart === index;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSlotClick(index)}
                                    onMouseEnter={() => {
                                        if (selectionStart !== null && !occupied) {
                                            setSelectionEnd(index);
                                        }
                                    }}
                                    disabled={occupied}
                                    className={`
                                        group relative overflow-hidden rounded-xl p-3 md:p-4 transition-all duration-200 transform border
                                        ${occupied
                                            ? isImported
                                                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                                                : 'bg-orange-50 text-orange-700 border-orange-200 cursor-not-allowed'
                                            : inRange
                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                                                : 'bg-white text-emerald-800 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm cursor-pointer'
                                        }
                                    `}
                                    style={{
                                        animationDelay: `${index * 30}ms`
                                    }}
                                >
                                    {/* Decorative Elements */}
                                    {inRange && (
                                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                                    )}

                                    <div className="relative">
                                        <div className="text-sm md:text-2xl font-bold tracking-tight">{slot.label}</div>
                                        <div className="text-[10px] md:text-xs mt-0.5 md:mt-1 opacity-75">ถึง {slot.end}</div>

                                        <div className="mt-1.5 md:mt-3 flex items-center justify-center">
                                            {occupied ? (
                                                isImported ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 rounded text-[10px] font-medium text-gray-600">
                                                        <FaBook className="text-[8px]" /> ตารางสอน
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded text-[10px] font-medium text-orange-800">
                                                        <FaLock className="text-[8px]" /> จองแล้ว
                                                    </span>
                                                )
                                            ) : inRange ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded text-[10px] font-medium text-white">
                                                    <FaCheck className="text-[8px]" /> {isStart ? 'เริ่มต้น' : 'เลือกแล้ว'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-medium text-emerald-700 transition-colors">
                                                    <FaCheck className="text-[8px]" /> ว่าง
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-4 md:mt-8 pt-3 md:pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            <div className="w-5 h-5 bg-white border border-emerald-300 rounded"></div>
                            <span>ว่าง</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            <div className="w-5 h-5 bg-emerald-600 rounded"></div>
                            <span>กำลังเลือก</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            <div className="w-5 h-5 bg-orange-50 border border-orange-200 rounded"></div>
                            <span>จองแล้ว</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                            <div className="w-5 h-5 bg-gray-100 border border-gray-200 rounded"></div>
                            <span>ตารางสอน</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {isModalOpen && (
                <BookingModal
                    room={room}
                    onClose={() => {
                        setIsModalOpen(false);
                        setInitialBookingData(null);
                        setBookingStep(2);
                        fetchRoomData();
                    }}
                    step={bookingStep}
                    setStep={setBookingStep}
                    toast={toast}
                    initialData={initialBookingData}
                />
            )}
        </div>
    );
};

export default RoomBooking;
