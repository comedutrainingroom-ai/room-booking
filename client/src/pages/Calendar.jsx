import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { FaTimes, FaClock, FaUser, FaBuilding, FaTag } from 'react-icons/fa';

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

// Hoisted calendar custom styles — avoids recreating <style> tag each render
const calendarStyles = `
    .fc-button-primary {
        background-color: #16a34a !important;
        border-color: #16a34a !important;
    }
    .fc-button-primary:hover {
        background-color: #15803d !important;
        border-color: #15803d !important;
    }
    .fc-toolbar-title {
        font-family: 'Sarabun', sans-serif !important;
        font-weight: 700 !important;
        color: #1f2937;
    }
    .fc-day-today {
        background-color: #f0fdf4 !important;
    }
    .fc-event {
        border: none;
        padding: 2px 6px;
        font-family: 'Sarabun', sans-serif;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
    }
    .fc-event:hover {
        opacity: 0.9;
    }
    .fc-col-header-cell-cushion {
        color: #374151;
        font-weight: 600;
        padding: 8px 0;
    }
    .fc .fc-button {
        font-family: 'Sarabun', sans-serif;
        font-weight: 500;
        border-radius: 0.5rem;
        padding: 0.4rem 1rem;
        text-transform: capitalize;
    }
    .fc-scroller::-webkit-scrollbar {
        display: none;
    }
    .fc-scroller {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .fc-daygrid-event {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const Calendar = () => {
    const calendarRef = useRef(null);
    const containerRef = useRef(null);
    const { currentUser, isAdmin } = useAuth();
    const { settings } = useSettings();
    const toast = useToast();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

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
            // If there are detailed errors
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

    const [events, setEvents] = useState([]);


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
                    const deptStr = department ? ` (${department})` : '';

                    // Determine color: pending = yellow, imported (gray), otherwise by topic
                    let eventColor;
                    if (booking.status === 'pending') {
                        eventColor = '#eab308'; // Yellow for pending
                    } else if (booking.isImported) {
                        eventColor = generateColorFromString(booking.topic); // Color by topic for imported
                    } else {
                        eventColor = generateColorFromString(booking.topic); // Color by topic for approved
                    }

                    return {
                        id: booking._id,
                        title: `${timeStr} ${booking.topic}${deptStr}`,
                        start: booking.startTime,
                        end: booking.endTime,
                        color: eventColor,
                        textColor: '#000000',
                        display: 'block',
                        extendedProps: {
                            room: booking.room,
                            user: booking.user,
                            status: booking.status,
                            topic: booking.topic,
                            phone: booking.user?.phone,
                            department: department,
                            note: booking.note,
                            isImported: booking.isImported
                        }
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

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                if (calendarRef.current) {
                    calendarRef.current.getApi().updateSize();
                }
            });
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);

    const handleDateClick = (arg) => {
        const clickedDate = new Date(arg.dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (clickedDate < today) {
            toast.warning('ไม่สามารถจองย้อนหลังได้');
            return;
        }

        const maxDays = settings?.maxBookingDays || 30;
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + maxDays);
        maxDate.setHours(23, 59, 59, 999);

        if (clickedDate > maxDate) {
            toast.warning(`ไม่สามารถจองได้ เนื่องจากเกินขีดจำกัด ${maxDays} วันล่วงหน้า`);
            return;
        }

        const dayOfWeek = clickedDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend && !settings?.weekendBooking) {
            toast.warning('ไม่อนุญาตให้จองวันเสาร์-อาทิตย์');
            return;
        }

        setSelectedDate(arg.dateStr);
        setIsModalOpen(true);
    };

    const handleEventClick = (arg) => {
        const event = arg.event;
        setSelectedEvent({
            id: event.id, // Add ID for API calls
            topic: event.extendedProps.topic,
            user: event.extendedProps.user,
            room: event.extendedProps.room,
            start: event.start,
            end: event.end,
            status: event.extendedProps.status,
            phone: event.extendedProps.phone,
            department: event.extendedProps.department,
            note: event.extendedProps.note
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

    const handleBookingSuccess = () => {
        toast.success('ส่งคำขอจองเรียบร้อยแล้ว');
        fetchBookings();
    };

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

    // Admin can delete, or maybe just cancel. Let's provide Delete for Admin to cleanup imported stuff.
    const canDelete = isAdmin;

    return (
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col relative">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 hidden md:block">ปฏิทินการใช้ห้อง</h2>
                {isAdmin && (
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
                    >
                        📂 Import ตารางสอน
                    </button>
                )}
            </div>

            <div className="calendar-container flex-grow overflow-hidden" ref={containerRef}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: window.innerWidth < 768 ? 'listWeek,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    height="100%"
                    locale="th"
                    buttonText={{
                        today: 'วันนี้',
                        month: 'เดือน',
                        week: 'สัปดาห์',
                        day: 'วัน',
                        list: 'รายการ'
                    }}
                    dayHeaderFormat={{ weekday: 'short' }}
                    handleWindowResize={true}
                    windowResize={(arg) => {
                        if (arg.view.type !== 'listWeek' && window.innerWidth < 768) {
                            arg.view.calendar.changeView('listWeek');
                        } else if (arg.view.type === 'listWeek' && window.innerWidth >= 768) {
                            arg.view.calendar.changeView('dayGridMonth');
                        }
                    }}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={3}
                    eventDisplay="block"
                    displayEventTime={false}
                />
            </div>

            <BookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={selectedDate}
                onSuccess={handleBookingSuccess}
                user={currentUser}
                settings={settings}
            />

            {/* Import Modal */}
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

                            {/* Danger Zone */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <button
                                    onClick={handleClearImported}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 ml-auto"
                                >
                                    <FaTimes className="text-[10px]" /> ลบข้อมูลที่ Import ทั้งหมด
                                </button>
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

            {/* Event Detail Modal */}
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

            <style>{calendarStyles}</style>
        </div>
    );
};

export default Calendar;
