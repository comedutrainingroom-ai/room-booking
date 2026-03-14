import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaBuilding, FaSearch, FaHistory, FaBan, FaThList, FaStream, FaEnvelope, FaChevronLeft, FaChevronRight, FaUser } from 'react-icons/fa';
import HistoryTableView from '../components/HistoryTableView';

const History = () => {
    const { currentUser, isAdmin } = useAuth();
    const { settings } = useSettings();
    const toast = useToast();
    const [bookings, setBookings] = useState([]);
    const [importedSchedules, setImportedSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, approved, pending, cancelled, rejected
    const [viewMode, setViewMode] = useState('timeline'); // timeline, table
    const [mainTab, setMainTab] = useState('bookings'); // 'bookings' or 'schedules'

    // Pagination for schedules
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const fetchMyBookings = async () => {
        try {
            // Admin sees all bookings, students see only their own
            const url = isAdmin ? '/bookings' : `/bookings?email=${currentUser.email}`;
            const res = await api.get(url);
            const myBookings = res.data.data;

            // 1. Separate Imported vs Normal Bookings
            const standardBookings = myBookings.filter(b => !b.isImported && b.user?.department !== 'Imported');
            const schedules = myBookings.filter(b => b.isImported || b.user?.department === 'Imported');

            // Sort by createdAt desc (newest first)
            standardBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            schedules.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); // Sort schedules by start time normally

            setBookings(standardBookings);
            setImportedSchedules(schedules);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching history", error);
            setLoading(false);
        }
    };

    // Student can cancel their own pending bookings
    const handleCancelBooking = async (bookingId) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันการยกเลิก',
            message: 'การจองที่ถูกยกเลิกจะไม่สามารถกู้คืนได้',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await api.put(`/bookings/${bookingId}`, { status: 'cancelled' });
            toast.success('ยกเลิกการจองเรียบร้อยแล้ว');
            fetchMyBookings();
        } catch (error) {
            console.error("Error cancelling booking", error);
            toast.error('เกิดข้อผิดพลาดในการยกเลิก');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <FaCheckCircle />;
            case 'pending': return <FaHourglassHalf />;
            case 'cancelled': return <FaBan />;
            case 'rejected': return <FaTimesCircle />;
            default: return <FaHistory />;
        }
    };

    const filteredBookings = useMemo(() => {
        if (mainTab === 'schedules') return [];
        return bookings.filter(b => filter === 'all' || b.status === filter);
    }, [bookings, filter, mainTab]);

    // Pagination Logic for Schedules
    const paginatedSchedules = useMemo(() => {
        if (mainTab === 'bookings') return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return importedSchedules.slice(startIndex, startIndex + itemsPerPage);
    }, [importedSchedules, currentPage, mainTab]);
    
    const totalPages = Math.ceil(importedSchedules.length / itemsPerPage);

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดประวัติ...</div>;

    return (
        <div className="p-4 md:p-8 w-full h-full">
            <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-8">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 md:gap-3">
                            <span className="bg-primary/10 p-2 md:p-3 rounded-xl md:rounded-2xl text-primary text-sm md:text-base"><FaHistory /></span>
                            ประวัติการทำงาน
                        </h1>
                        <p className="text-gray-500 mt-1 md:mt-2 ml-1 text-xs md:text-base">{isAdmin ? 'รายการในระบบทั้งหมด' : 'รายการของคุณทั้งหมด'}</p>
                    </div>

                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        {/* View Mode Toggle was here, moved to be alone in the right side container */}
                        {/* View Mode Toggle (Only show in Bookings View) */}
                        {mainTab === 'bookings' && (
                            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 self-end">
                                <button
                                    onClick={() => setViewMode('timeline')}
                                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaStream /> ไทม์ไลน์
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaThList /> ตาราง
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Tabs (Bookings vs Schedules) - Centered */}
                {isAdmin && (
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full max-w-sm">
                            <button
                                onClick={() => { setMainTab('bookings'); setCurrentPage(1); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'bookings' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="text-sm"><FaHistory /></span> รายการจองห้อง
                            </button>
                            <button
                                onClick={() => { setMainTab('schedules'); setCurrentPage(1); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${mainTab === 'schedules' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="text-sm"><FaCalendarAlt /></span> ตารางสอน
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Tabs - Only show for Admin in Bookings View */}
                {isAdmin && mainTab === 'bookings' && (
                    <div className="flex flex-wrap bg-white p-1 rounded-xl shadow-sm border border-gray-100 gap-1 w-full max-w-3xl mx-auto justify-center">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'pending', label: 'รออนุมัติ' },
                            { key: 'approved', label: 'อนุมัติ' },
                            { key: 'cancelled', label: 'ยกเลิก' },
                            { key: 'rejected', label: 'ปฏิเสธ' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`flex-1 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${filter === f.key ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ====== SCHEDULES VIEW ====== */}
            {mainTab === 'schedules' ? (
                <div className="max-w-6xl mx-auto space-y-6">
                    {paginatedSchedules.length === 0 ? (
                        <div className="p-8 md:p-16 text-center max-w-2xl mx-auto opacity-50 bg-white rounded-2xl border border-gray-100">
                            <div className="text-gray-200 text-4xl md:text-7xl mb-4 flex justify-center"><FaCalendarAlt /></div>
                            <h3 className="text-base md:text-xl font-bold text-gray-400">ไม่พบตารางสอน</h3>
                            <p className="text-gray-400 mt-2 text-sm md:text-base">ยังไม่มีการนำเข้าตารางสอนในระบบ</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {paginatedSchedules.map((schedule, idx) => (
                                    <div key={schedule._id} className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <FaBuilding /> {schedule.room?.name || 'Unknown Room'}
                                            </span>
                                            {/* Date display format might need adjustment depending on how import parses dates */}
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                {new Date(schedule.startTime).toLocaleDateString('th-TH', { weekday: 'short' })}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2" title={schedule.topic}>{schedule.topic}</h3>
                                        
                                        <div className="space-y-1.5 mt-auto pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <FaUser className="text-gray-400" /> <span className="truncate">{schedule.user?.name || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <FaClock className="text-gray-400" />
                                                <span className="font-medium">
                                                    {new Date(schedule.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                                                <span>วันที่นำเข้า: {new Date(schedule.createdAt).toLocaleDateString('th-TH')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-8 py-4">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <FaChevronLeft />
                                    </button>
                                    
                                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm border border-emerald-100">
                                        หน้า {currentPage} จาก {totalPages}
                                    </span>

                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <FaChevronRight />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ====== BOOKINGS VIEW ====== */
                <div className="w-full">
                    {/* Table View */}
                    {viewMode === 'table' ? (
                        <HistoryTableView
                            bookings={filteredBookings}
                            onCancel={handleCancelBooking}
                            settings={settings}
                            isAdmin={isAdmin}
                        />
                    ) : (
                        /* Timeline View */
                        <div className="max-w-6xl mx-auto">
                    {filteredBookings.length === 0 ? (
                        <div className="p-8 md:p-16 text-center max-w-2xl mx-auto opacity-50">
                            <div className="text-gray-200 text-4xl md:text-7xl mb-4 flex justify-center"><FaSearch /></div>
                            <h3 className="text-base md:text-xl font-bold text-gray-400">ไม่พบประวัติการจอง</h3>
                            <p className="text-gray-400 mt-2 text-sm md:text-base">คุณยังไม่มีการจองในสถานะนี้</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Center Line */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gray-200 hidden md:block"></div>

                            <div className="space-y-6 md:space-y-12">
                                {filteredBookings.map((booking, index) => (
                                    <div key={booking._id} className="relative flex flex-col md:flex-row items-center justify-between md:odd:flex-row-reverse group">

                                        {/* Date/Time Side (Opposite Content) */}
                                        <div className="w-full md:w-[calc(50%-2.5rem)] mb-2 md:mb-0 text-center md:text-right md:group-odd:text-left opacity-60 group-hover:opacity-100 transition-opacity">
                                            <div className="inline-block">
                                                <div className="text-2xl md:text-4xl font-bold text-gray-300 group-hover:text-primary transition-colors">
                                                    {new Date(booking.startTime).getDate()}
                                                </div>
                                                <div className="text-gray-500 font-medium uppercase tracking-wider text-xs md:text-sm">
                                                    {new Date(booking.startTime).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                                </div>
                                                <div className="text-base md:text-xl font-medium text-gray-400 mt-0.5 md:mt-1">
                                                    {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Center Dot */}
                                        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-gray-100 shadow z-10 font-bold text-gray-500 group-hover:bg-primary group-hover:text-white transition-all duration-300 hidden md:flex">
                                            {getStatusIcon(booking.status)}
                                        </div>

                                        {/* Card Content */}
                                        <div className="w-full md:w-[calc(50%-2.5rem)] bg-white p-3 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group-hover:border-primary/30 relative">
                                            {/* Mobile Dot */}
                                            <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-gray-200 border-4 border-white md:hidden flex items-center justify-center text-[10px]">
                                                {index + 1}
                                            </div>

                                            <div className="flex justify-between items-start mb-2 md:mb-4">
                                                <div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)} mb-2`}>
                                                        {getStatusIcon(booking.status)} {booking.status.toUpperCase()}
                                                    </span>
                                                    <h3 className="font-bold text-gray-800 text-sm md:text-lg leading-tight">{booking.topic}</h3>
                                                </div>
                                            </div>

                                            <div className="space-y-2 md:space-y-3">
                                                <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-gray-50 p-1.5 md:p-3 rounded-lg md:rounded-xl">
                                                    <div className="bg-white p-1 md:p-2 rounded-lg shadow-sm text-primary text-xs md:text-sm"><FaBuilding /></div>
                                                    <div>
                                                        <div className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">Room</div>
                                                        <div className="font-medium text-sm md:text-base">{booking.room?.name || 'Unknown Room'}</div>
                                                    </div>
                                                </div>

                                                {/* Booker Info - Show for Admin */}
                                                {isAdmin && (
                                                    <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-blue-50 p-2 md:p-3 rounded-lg md:rounded-xl">
                                                        <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs text-gray-400 font-bold uppercase">ผู้จอง</div>
                                                            <div className="font-medium text-gray-800">{booking.user?.name || '-'}</div>
                                                            {booking.user?.department && (
                                                                <div className="text-xs text-blue-600">{booking.user.department}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 md:gap-3 text-gray-600 bg-gray-50 p-2 md:p-3 rounded-lg md:rounded-xl md:hidden"> {/* Show time inline ONLY on mobile since desktop has side date */}
                                                    <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-500"><FaClock /></div>
                                                    <div>
                                                        <div className="text-xs text-gray-400 font-bold uppercase">Time</div>
                                                        <div className="font-medium">
                                                            {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {booking.note && (
                                                <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-100 text-xs md:text-sm italic text-gray-500">
                                                    "{booking.note}"
                                                </div>
                                            )}

                                            {/* Action Buttons for Students */}
                                            {!isAdmin && (
                                                <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-100">
                                                    {booking.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleCancelBooking(booking._id)}
                                                            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-100 transition font-medium text-sm"
                                                        >
                                                            <FaBan /> ยกเลิกการจอง
                                                        </button>
                                                    )}
                                                    {booking.status === 'approved' && (
                                                        <div className="text-center">
                                                            <p className="text-xs text-gray-400 mb-2">ต้องการยกเลิก? กรุณาติดต่อผู้ดูแลระบบ</p>
                                                            <a
                                                                href={`mailto:${settings.contactEmail || 'admin@email.com'}`}
                                                                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary/20 transition font-medium text-sm"
                                                            >
                                                                <FaEnvelope /> {settings.contactEmail || 'ติดต่อ Admin'}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
            )}
        </div>
    );
};

export default History;
