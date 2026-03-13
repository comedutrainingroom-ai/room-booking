import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { FaTimes, FaClock, FaUser, FaBuilding, FaTag, FaChevronLeft, FaChevronRight, FaCalendarDay, FaListUl, FaCalendarAlt } from 'react-icons/fa';

// Helper to get YYYY-MM-DD in local time
const toLocalISOString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Hoisted outside component — pure function, no need to recreate each render
const generateColorFromString = (str) => {
    if (!str) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#fca5a5', '#fdba74', '#fcd34d', '#bef264', '#86efac',
        '#5eead4', '#67e8f9', '#7dd3fc', '#93c5fd', '#a5b4fc',
        '#c4b5fd', '#d8b4fe', '#f0abfc', '#f9a8d4', '#fda4af',
    ];
    return colors[Math.abs(hash) % colors.length];
};

// Thai day names
const DAY_NAMES_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAY_NAMES_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Get days in a month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Get the first day of the month (0=Sunday, 1=Monday, ...)
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// Check if two dates are the same day
const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

// Get start of week (Sunday)
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
};

const Calendar = () => {
    const containerRef = useRef(null);
    const { currentUser, isAdmin } = useAuth();
    const { settings } = useSettings();
    const toast = useToast();
    const navigate = useNavigate();

    // Calendar navigation state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'list' : 'month');
    const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [slideDirection, setSlideDirection] = useState('');

    // Event Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Semester Date Range State
    const [semesterStartDate, setSemesterStartDate] = useState(toLocalISOString(new Date()));
    const [semesterEndDate, setSemesterEndDate] = useState(
        toLocalISOString(new Date(new Date().setMonth(new Date().getMonth() + 4)))
    );

    const [events, setEvents] = useState([]);

    // ── Responsive auto-switch ──
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)');
        const handleChange = (e) => {
            setViewMode(e.matches ? 'list' : 'month');
        };
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    // ── Data Fetching ──
    const fetchBookings = async () => {
        try {
            const res = await api.get('/bookings');
            const now = new Date();

            const validBookings = res.data.data
                .filter(b => {
                    const endTime = new Date(b.endTime);
                    return b.status !== 'rejected' && b.status !== 'cancelled' && b.room && endTime > now;
                })
                .map(booking => {
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(booking.endTime);
                    const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}-${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
                    const department = booking.user?.department || '';

                    let eventColor;
                    if (booking.status === 'pending') {
                        eventColor = '#eab308';
                    } else if (booking.isImported) {
                        eventColor = generateColorFromString(booking.topic);
                    } else {
                        eventColor = generateColorFromString(booking.topic);
                    }

                    return {
                        id: booking._id,
                        title: `${timeStr} ${booking.topic}`,
                        start: new Date(booking.startTime),
                        end: new Date(booking.endTime),
                        color: eventColor,
                        topic: booking.topic,
                        room: booking.room,
                        user: booking.user,
                        status: booking.status,
                        phone: booking.user?.phone,
                        department: department,
                        note: booking.note,
                        isImported: booking.isImported
                    };
                });
            setEvents(validBookings);
        } catch (error) {
            console.error("Error fetching bookings", error);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    // ── Import handlers ──
    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImportFile(e.target.files[0]);
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);
        formData.append('startDate', semesterStartDate);
        formData.append('endDate', semesterEndDate);

        try {
            const res = await api.post('/bookings/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                toast.success(res.data.message || 'นำเข้าข้อมูลเรียบร้อยแล้ว');
                fetchBookings();
                setIsImportModalOpen(false);
                setImportFile(null);
            }
        } catch (error) {
            console.error("Import Error", error);
            const msg = error.response?.data?.error || 'เกิดข้อผิดพลาดในการนำเข้า';
            toast.error(msg);
            if (error.response?.data?.errors && error.response.data.errors.length > 0) {
                error.response.data.errors.forEach(err => toast.error(err, 5000));
            }
        } finally {
            setIsImporting(false);
        }
    };

    const handleClearImported = async () => {
        if (!confirm('คุณต้องการลบข้อมูลที่ Import มา "ทั้งหมด" ใช่หรือไม่? \n(การกระทำนี้ไม่สามารถย้อนกลับได้)')) return;

        try {
            const res = await api.delete('/bookings/import');
            if (res.data.success) {
                toast.success(`ลบข้อมูล Import จำนวน ${res.data.count} รายการ เรียบร้อยแล้ว`);
                fetchBookings();
                setIsImportModalOpen(false);
            }
        } catch (error) {
            console.error("Clear Import Error", error);
            toast.error('ไม่สามารถลบข้อมูลได้');
        }
    };

    // ── Click handlers ──
    // ── Validation logic (reused for styling disabled dates) ──
    const isDateBookable = useCallback((dateStr) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (d < today) return false;

        // Admin สามารถจองล่วงหน้าได้ไม่จำกัดและจองเสาร์-อาทิตย์ได้
        if (isAdmin) return true;

        const maxDays = settings?.maxBookingDays || 30;
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + maxDays);
        maxDate.setHours(23, 59, 59, 999);

        if (d > maxDate) return false;

        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend && !settings?.weekendBooking) return false;

        return true;
    }, [settings, isAdmin]);

    const handleDateClick = (dateStr) => {
        const clickedDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (clickedDate < today) {
            toast.warning('ไม่สามารถจองย้อนหลังได้');
            return;
        }

        // ถ้าไม่ใช่ Admin ค่อยเช็คเงื่อนไขเหล่านี้
        if (!isAdmin) {
            const maxDays = settings?.maxBookingDays || 30;
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + maxDays);
            maxDate.setHours(23, 59, 59, 999);

            if (clickedDate > maxDate) {
                toast.warning(`จองล่วงหน้าได้สูงสุด ${maxDays} วัน`);
                return;
            }

            const dayOfWeek = clickedDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (isWeekend && !settings?.weekendBooking) {
                toast.warning('ไม่อนุญาตให้จองวันเสาร์-อาทิตย์');
                return;
            }
        }

        navigate('/rooms');
    };

    const handleEventClick = (event) => {
        setSelectedEvent({
            id: event.id,
            topic: event.topic,
            user: event.user,
            room: event.room,
            start: event.start,
            end: event.end,
            status: event.status,
            phone: event.phone,
            department: event.department,
            note: event.note
        });
    };

    const handleCancelBooking = async () => {
        if (!selectedEvent) return;
        if (!confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) return;

        try {
            await api.put(`/bookings/${selectedEvent.id}`, { status: 'cancelled' });
            toast.success('ยกเลิกการจองเรียบร้อยแล้ว');
            fetchBookings();
            setSelectedEvent(null);
        } catch (error) {
            console.error("Cancellation Error", error);
            toast.error('ไม่สามารถยกเลิกการจองได้');
        }
    };

    const handleDeleteBooking = async () => {
        if (!selectedEvent) return;
        if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้')) return;

        try {
            await api.delete(`/bookings/${selectedEvent.id}`);
            toast.success('ลบรายการเรียบร้อยแล้ว');
            fetchBookings();
            setSelectedEvent(null);
        } catch (error) {
            console.error("Deletion Error", error);
            toast.error('ไม่สามารถลบรายการได้');
        }
    };

    // ── Formatters ──
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const canCancel = selectedEvent && selectedEvent.status !== 'cancelled' &&
        (isAdmin || (currentUser?.email === selectedEvent.user?.email));
    const canDelete = isAdmin;

    // ── Calendar Navigation ──
    const navigateMonth = (direction) => {
        setSlideDirection(direction > 0 ? 'slide-left' : 'slide-right');
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentDate(prev => {
                const d = new Date(prev);
                d.setMonth(d.getMonth() + direction);
                return d;
            });
            setSlideDirection('');
            setIsTransitioning(false);
        }, 150);
    };

    const navigateWeek = (direction) => {
        setSlideDirection(direction > 0 ? 'slide-left' : 'slide-right');
        setIsTransitioning(true);
        setTimeout(() => {
            setWeekStart(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() + direction * 7);
                return d;
            });
            setSlideDirection('');
            setIsTransitioning(false);
        }, 150);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setWeekStart(getStartOfWeek(new Date()));
    };

    // ── Events for a specific day ──
    const getEventsForDay = useCallback((date) => {
        return events.filter(e => isSameDay(e.start, date))
            .sort((a, b) => a.start - b.start);
    }, [events]);

    // ── Month grid data ──
    const monthGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const today = new Date();

        const cells = [];

        // Previous month trailing days
        const prevMonthDays = getDaysInMonth(year, month - 1);
        for (let i = firstDay - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthDays - i);
            cells.push({ date: d, isCurrentMonth: false, isToday: isSameDay(d, today) });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            cells.push({ date: d, isCurrentMonth: true, isToday: isSameDay(d, today) });
        }

        // Next month leading days (fill to 42 for 6 rows, or 35 for 5 rows)
        const totalNeeded = cells.length <= 35 ? 35 : 42;
        let nextDay = 1;
        while (cells.length < totalNeeded) {
            const d = new Date(year, month + 1, nextDay++);
            cells.push({ date: d, isCurrentMonth: false, isToday: isSameDay(d, today) });
        }

        return cells;
    }, [currentDate]);

    // ── Week days for list view ──
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, [weekStart]);

    // Week label for list view
    const weekLabel = useMemo(() => {
        const endOfWeek = new Date(weekStart);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const startStr = `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]}`;
        const endStr = `${endOfWeek.getDate()} ${MONTH_NAMES[endOfWeek.getMonth()]}`;
        return `${startStr} - ${endStr} ${endOfWeek.getFullYear() + 543}`;
    }, [weekStart]);

    // ── Render: Month View ──
    const renderMonthView = () => {
        const today = new Date();
        const MAX_EVENTS_SHOWN = 2;

        return (
            <div className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAY_NAMES_SHORT.map((day, i) => (
                        <div
                            key={day}
                            className={`text-center text-xs font-bold py-2.5 tracking-wider ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 border-t border-l border-gray-100 rounded-xl overflow-hidden">
                    {monthGrid.map((cell, idx) => {
                        const dayEvents = getEventsForDay(cell.date);
                        const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                        const bookable = isDateBookable(cell.date);

                        return (
                            <div
                                key={idx}
                                onClick={() => handleDateClick(toLocalISOString(cell.date))}
                                className={`
                                    relative min-h-[5.5rem] lg:min-h-[6.5rem] border-r border-b border-gray-100 p-1.5 lg:p-2
                                    transition-all duration-200
                                    ${!bookable 
                                        ? 'bg-gray-100/80 cursor-not-allowed opacity-60' 
                                        : 'cursor-pointer group hover:bg-emerald-50/50 hover:shadow-inner'
                                    }
                                    ${cell.isCurrentMonth && bookable ? 'bg-white' : ''}
                                    ${!cell.isCurrentMonth && bookable ? 'bg-gray-50/60 opacity-70' : ''}
                                    ${cell.isToday ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-200 opacity-100' : ''}
                                `}
                            >
                                {/* Date Number */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`
                                            inline-flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 rounded-full text-xs lg:text-sm font-semibold
                                            transition-all duration-200
                                            ${cell.isToday
                                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                                : cell.isCurrentMonth
                                                    ? !bookable 
                                                        ? 'text-gray-400' 
                                                        : isWeekend ? 'text-red-400 group-hover:bg-red-50' : 'text-gray-700 group-hover:bg-gray-100'
                                                    : 'text-gray-300'
                                            }
                                        `}
                                    >
                                        {cell.date.getDate()}
                                    </span>
                                    {dayEvents.length > MAX_EVENTS_SHOWN && (
                                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                            +{dayEvents.length - MAX_EVENTS_SHOWN}
                                        </span>
                                    )}
                                </div>

                                {/* Event Chips */}
                                <div className="space-y-0.5">
                                    {dayEvents.slice(0, MAX_EVENTS_SHOWN).map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(event);
                                            }}
                                            title={event.title}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] lg:text-[11px] font-medium truncate
                                                       cursor-pointer hover:opacity-80 hover:shadow-sm transition-all duration-150 leading-tight"
                                            style={{
                                                backgroundColor: event.color + '30',
                                                color: '#1f2937',
                                                borderLeft: `3px solid ${event.color}`,
                                            }}
                                        >
                                            <span className="truncate">{event.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ── Render: List View (Mobile) ──
    const renderListView = () => {
        const today = new Date();

        return (
            <div className={`space-y-3 transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                {weekDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, today);
                    const bookable = isDateBookable(day);

                    return (
                        <div key={day.toISOString()} className={`rounded-2xl overflow-hidden ${!bookable && !isToday ? 'opacity-50 grayscale-[50%]' : ''}`}>
                            {/* Day Header */}
                            <div
                                onClick={() => handleDateClick(toLocalISOString(day))}
                                className={`
                                    flex items-center gap-3 px-4 py-3 transition-all duration-200
                                    ${!bookable ? 'cursor-not-allowed bg-gray-200/60' : 'cursor-pointer bg-gray-50 hover:bg-gray-100'}
                                    ${isToday && bookable ? 'bg-gradient-to-r from-primary to-emerald-400 text-white shadow-md shadow-primary/20 cursor-pointer' : ''}
                                    ${isToday && !bookable ? 'bg-gray-400 text-white cursor-not-allowed' : ''}
                                    ${!isToday && bookable ? 'text-gray-700' : ''}
                                `}
                            >
                                <div className={`
                                    flex flex-col items-center justify-center w-12 h-12 rounded-xl font-bold
                                    ${isToday ? 'bg-white/20' : 'bg-white shadow-sm'}
                                `}>
                                    <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                                        {DAY_NAMES_SHORT[day.getDay()]}
                                    </span>
                                    <span className={`text-lg leading-none ${isToday ? 'text-white' : 'text-gray-800'}`}>
                                        {day.getDate()}
                                    </span>
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-700'}`}>
                                        วัน{DAY_NAMES_FULL[day.getDay()]}
                                    </p>
                                    <p className={`text-xs ${isToday ? 'text-white/70' : 'text-gray-400'}`}>
                                        {day.getDate()} {MONTH_NAMES[day.getMonth()]} {day.getFullYear() + 543}
                                    </p>
                                </div>
                                <div className="ml-auto">
                                    {dayEvents.length > 0 && (
                                        <span className={`
                                            text-xs font-bold px-2.5 py-1 rounded-full
                                            ${isToday ? 'bg-white/25 text-white' : 'bg-primary/10 text-primary'}
                                        `}>
                                            {dayEvents.length} รายการ
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Event Cards */}
                            {dayEvents.length > 0 ? (
                                <div className="bg-white divide-y divide-gray-50">
                                    {dayEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all duration-150"
                                        >
                                            {/* Color indicator */}
                                            <div
                                                className="w-1 self-stretch rounded-full flex-shrink-0"
                                                style={{ backgroundColor: event.color }}
                                            />

                                            {/* Event Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{event.topic}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                                        <FaClock className="text-[10px]" />
                                                        {formatTime(event.start)} - {formatTime(event.end)}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                                                        <FaBuilding className="text-[10px]" />
                                                        {event.room?.name || 'ไม่ระบุ'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <span className={`
                                                text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0
                                                ${event.status === 'pending'
                                                    ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                }
                                            `}>
                                                {event.status === 'pending' ? 'รอ' : 'อนุมัติ'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white px-4 py-4 text-center">
                                    <p className="text-xs text-gray-300">ไม่มีรายการ</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col relative" ref={containerRef}>
            {/* ── Header Bar ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 mb-3 md:mb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    {/* Left: Title + Nav */}
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                        {/* Prev */}
                        <button
                            onClick={() => viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1)}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all active:scale-95"
                        >
                            <FaChevronLeft className="text-sm" />
                        </button>

                        {/* Title */}
                        <div className="text-center flex-1 md:flex-initial md:min-w-[200px]">
                            {viewMode === 'month' ? (
                                <h2 className="text-base md:text-lg font-bold text-gray-800">
                                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                                </h2>
                            ) : (
                                <h2 className="text-sm md:text-lg font-bold text-gray-800">
                                    {weekLabel}
                                </h2>
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() => viewMode === 'month' ? navigateMonth(1) : navigateWeek(1)}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all active:scale-95"
                        >
                            <FaChevronRight className="text-sm" />
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        {/* Today Button */}
                        <button
                            onClick={goToToday}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium
                                       bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all active:scale-95"
                        >
                            <FaCalendarDay className="text-[10px] md:text-xs" />
                            วันนี้
                        </button>

                        {/* View Toggle */}
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'month'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <FaCalendarAlt className="text-[10px]" />
                                <span className="hidden sm:inline">เดือน</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'list'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <FaListUl className="text-[10px]" />
                                <span className="hidden sm:inline">รายการ</span>
                            </button>
                        </div>

                        {/* Import Button (Admin only) */}
                        {isAdmin && (
                            <>
                                <button
                                    onClick={handleClearImported}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium
                                               bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all active:scale-95 ml-1 shadow-sm"
                                >
                                    <FaTimes className="text-[10px]" /> <span className="hidden md:inline">ลบข้อมูล Import</span>
                                </button>
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium
                                               bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all active:scale-95 ml-1 shadow-sm"
                                >
                                    <FaBuilding className="text-[10px]" /> <span className="hidden md:inline">Import ตารางสอน</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Calendar Body ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-4 md:flex-grow overflow-auto custom-scrollbar">
                {viewMode === 'month' ? renderMonthView() : renderListView()}
            </div>

            {/* ── Import Modal ── */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                    <FaBuilding className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">Import ตารางสอน</h3>
                                    <p className="text-xs text-gray-500">นำเข้าข้อมูลจากไฟล์ Excel</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* Info Alert */}
                            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
                                <div className="mt-0.5"><FaTag /></div>
                                <div>
                                    <p className="font-semibold mb-1">รูปแบบไฟล์ที่รองรับ</p>
                                    <p className="opacity-90">ต้องมีคอลัมน์: Room, Day, StartTime, EndTime, Subject, Teacher</p>
                                </div>
                            </div>

                            {/* Semester Date Range Inputs */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">ช่วงเวลาภาคการศึกษา</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <label className="block text-xs text-gray-500 mb-1">วันเริ่มเทอม</label>
                                        <input
                                            type="date"
                                            value={semesterStartDate}
                                            onChange={(e) => setSemesterStartDate(e.target.value)}
                                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-gray-800 cursor-pointer"
                                        />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <label className="block text-xs text-gray-500 mb-1">วันปิดเทอม</label>
                                        <input
                                            type="date"
                                            value={semesterEndDate}
                                            onChange={(e) => setSemesterEndDate(e.target.value)}
                                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-gray-800 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${importFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                                    }`}
                                onClick={() => fileInputRef.current.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                />
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors ${importFile ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
                                    }`}>
                                    <FaBuilding className="text-2xl" />
                                </div>

                                {importFile ? (
                                    <div>
                                        <p className="font-semibold text-gray-800">{importFile.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                                        <p className="text-xs text-primary font-medium mt-2">คลิกเพื่อเปลี่ยนไฟล์</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-medium text-gray-700">คลิกเพื่ออัปโหลดไฟล์ Excel</p>
                                        <p className="text-xs text-gray-400 mt-1">รองรับไฟล์ .xlsx, .xls</p>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleImportSubmit}
                                disabled={!importFile || isImporting}
                                className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        กำลังนำเข้า...
                                    </>
                                ) : (
                                    <>ยืนยัน Import</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Event Detail Modal ── */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedEvent(null)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className={`p-5 ${selectedEvent.status === 'pending' ? 'bg-yellow-500' : 'bg-primary'} text-white`}>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                            >
                                <FaTimes />
                            </button>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${selectedEvent.status === 'pending' ? 'bg-yellow-600' : 'bg-green-600'}`}>
                                    {selectedEvent.status === 'pending' ? 'รอการอนุมัติ' : 'อนุมัติแล้ว'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold">{selectedEvent.topic}</h2>
                            <p className="text-white/80 text-sm mt-1">{formatDate(selectedEvent.start)}</p>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            {/* Time */}
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FaClock className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">เวลา</p>
                                    <p className="font-semibold text-gray-800">
                                        {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                                    </p>
                                </div>
                            </div>

                            {/* Room */}
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FaBuilding className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">ห้องที่จอง</p>
                                    <p className="font-semibold text-gray-800">{selectedEvent.room?.name || 'ไม่ระบุ'}</p>
                                </div>
                            </div>

                            {/* User */}
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FaUser className="text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">ผู้จอง</p>
                                    <p className="font-semibold text-gray-800">{selectedEvent.user?.name || 'ไม่ระบุ'}</p>
                                    {selectedEvent.department && (
                                        <p className="text-sm text-gray-500">{selectedEvent.department}</p>
                                    )}
                                </div>
                            </div>

                            {/* Topic */}
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FaTag className="text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">หัวข้อการอบรม</p>
                                    <p className="font-semibold text-gray-800">{selectedEvent.topic}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                            {canCancel && (
                                <button
                                    onClick={handleCancelBooking}
                                    className="flex-1 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold rounded-xl transition-all"
                                >
                                    ยกเลิกการจอง
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    onClick={handleDeleteBooking}
                                    className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-all"
                                >
                                    ลบรายการ
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
