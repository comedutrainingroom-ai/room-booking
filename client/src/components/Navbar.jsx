import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBuilding, FaBars, FaSignOutAlt, FaUserCircle, FaExclamationTriangle, FaCaretDown, FaBell, FaCalendarPlus, FaCheckCircle, FaTimesCircle, FaCheck } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

const Navbar = ({ toggleSidebar }) => {
    const { currentUser, logout, dbUser } = useAuth();
    const { settings } = useSettings();
    const { socket } = useSocket();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [notifications, setNotifications] = useState({
        bookings: 0,
        reports: 0
    });

    // Notification history (individual items)
    const [notiItems, setNotiItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Track "seen" counts to hide badge after viewing
    const [seenCounts, setSeenCounts] = useState({
        bookings: parseInt(localStorage.getItem('seenBookings') || '0'),
        reports: parseInt(localStorage.getItem('seenReports') || '0')
    });

    const [isNotiDropdownOpen, setIsNotiDropdownOpen] = useState(false);
    const notiDropdownRef = useRef(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dropdownTimeoutRef = useRef(null);
    const [bellShake, setBellShake] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const updateSeenCount = (type, count) => {
        const key = type === 'bookings' ? 'seenBookings' : 'seenReports';
        localStorage.setItem(key, count.toString());
        setSeenCounts(prev => ({ ...prev, [type]: count }));
    };

    // Helper: relative time
    const getRelativeTime = (date) => {
        const now = new Date();
        const diff = Math.floor((now - new Date(date)) / 1000);
        if (diff < 10) return 'เมื่อสักครู่';
        if (diff < 60) return `${diff} วินาทีที่แล้ว`;
        if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
        return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    };

    // Add notification item to history
    const addNotiItem = useCallback((item) => {
        setNotiItems(prev => [{ ...item, id: Date.now() + Math.random(), time: new Date(), read: false }, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
        setBellShake(true);
        setTimeout(() => setBellShake(false), 1000);
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!dbUser || dbUser.role !== 'admin') return;

        try {
            const [bookingsRes, reportsRes] = await Promise.all([
                api.get('/bookings'),
                api.get('/reports')
            ]);

            const pendingBookings = bookingsRes.data.data.filter(b => b.status === 'pending' && !b.isImported).length;
            const pendingReports = reportsRes.data.data.filter(r => r.status === 'pending').length;

            setNotifications({
                bookings: pendingBookings,
                reports: pendingReports
            });

            // Auto-sync seen counts if items were removed
            setSeenCounts(prev => {
                const newSeen = { ...prev };
                let changed = false;

                if (pendingBookings < prev.bookings) {
                    newSeen.bookings = pendingBookings;
                    localStorage.setItem('seenBookings', pendingBookings.toString());
                    changed = true;
                }
                if (pendingReports < prev.reports) {
                    newSeen.reports = pendingReports;
                    localStorage.setItem('seenReports', pendingReports.toString());
                    changed = true;
                }

                return changed ? newSeen : prev;
            });

        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, [dbUser]);

    // Fetch once on mount
    useEffect(() => {
        if (dbUser?.role === 'admin') {
            fetchNotifications();
        }
    }, [dbUser, fetchNotifications]);

    // Socket.io real-time notification listener with toast pop-ups
    useEffect(() => {
        if (!socket || dbUser?.role !== 'admin') return;

        const handleBookingCreated = (data) => {
            fetchNotifications();
            addNotiItem({
                type: 'booking:created',
                title: data?.topic || 'มีคำขอจองห้องใหม่',
                message: 'กรุณาตรวจสอบและอนุมัติ',
                link: '/approve'
            });
            toast.info(`📅 คำขอจองใหม่: ${data?.topic || 'รายการใหม่'}`);
        };

        const handleBookingUpdated = (data) => {
            fetchNotifications();
            addNotiItem({
                type: 'booking:updated',
                title: `อัพเดทการจอง`,
                message: `สถานะ: ${data?.status || 'มีการเปลี่ยนแปลง'}`,
                link: '/approve'
            });
        };

        const handleBookingDeleted = () => {
            fetchNotifications();
            addNotiItem({
                type: 'booking:deleted',
                title: 'มีการยกเลิกการจอง',
                message: 'การจองถูกลบออกจากระบบ',
                link: '/approve'
            });
        };

        const handleReportCreated = (data) => {
            fetchNotifications();
            addNotiItem({
                type: 'report:created',
                title: data?.topic || 'มีแจ้งซ่อมใหม่',
                message: 'กรุณาตรวจสอบและดำเนินการ',
                link: '/admin/reports'
            });
            toast.warning(`🔧 แจ้งซ่อมใหม่: ${data?.topic || 'รายการใหม่'}`);
        };

        const handleReportUpdated = () => {
            fetchNotifications();
            addNotiItem({
                type: 'report:updated',
                title: 'อัพเดทสถานะแจ้งซ่อม',
                message: 'มีการเปลี่ยนแปลงสถานะ',
                link: '/admin/reports'
            });
        };

        socket.on('booking:created', handleBookingCreated);
        socket.on('booking:updated', handleBookingUpdated);
        socket.on('booking:deleted', handleBookingDeleted);
        socket.on('booking:imported', () => fetchNotifications());
        socket.on('report:created', handleReportCreated);
        socket.on('report:updated', handleReportUpdated);

        return () => {
            socket.off('booking:created', handleBookingCreated);
            socket.off('booking:updated', handleBookingUpdated);
            socket.off('booking:deleted', handleBookingDeleted);
            socket.off('booking:imported');
            socket.off('report:created', handleReportCreated);
            socket.off('report:updated', handleReportUpdated);
        };
    }, [socket, dbUser, fetchNotifications, addNotiItem, toast]);

    // Clear notifications when visiting pages
    useEffect(() => {
        if (dbUser?.role === 'admin') {
            if (location.pathname === '/approve') {
                if (notifications.bookings > seenCounts.bookings) {
                    updateSeenCount('bookings', notifications.bookings);
                }
            }
            if (location.pathname === '/admin/reports') {
                if (notifications.reports > seenCounts.reports) {
                    updateSeenCount('reports', notifications.reports);
                }
            }
        }
    }, [location.pathname, notifications, seenCounts, dbUser]);

    // Close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (notiDropdownRef.current && !notiDropdownRef.current.contains(event.target)) {
                setIsNotiDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Mark all as read
    const markAllRead = () => {
        setNotiItems(prev => prev.map(item => ({ ...item, read: true })));
        setUnreadCount(0);
    };

    // Calculate badges
    const newBookings = Math.max(0, notifications.bookings - seenCounts.bookings);
    const newReports = Math.max(0, notifications.reports - seenCounts.reports);
    const totalNew = newBookings + newReports;
    const displayBadge = totalNew + unreadCount;

    // Notification item config
    const notiConfig = {
        'booking:created': { icon: <FaCalendarPlus />, gradient: 'from-emerald-500 to-teal-600', label: 'การจองใหม่' },
        'booking:updated': { icon: <FaCheckCircle />, gradient: 'from-blue-500 to-indigo-600', label: 'อัพเดทการจอง' },
        'booking:deleted': { icon: <FaTimesCircle />, gradient: 'from-gray-400 to-gray-500', label: 'ยกเลิกการจอง' },
        'report:created': { icon: <FaExclamationTriangle />, gradient: 'from-red-500 to-rose-600', label: 'แจ้งซ่อม' },
        'report:updated': { icon: <FaCheckCircle />, gradient: 'from-amber-500 to-orange-600', label: 'อัพเดทแจ้งซ่อม' }
    };

    return (
        <nav className="bg-primary/95 backdrop-blur-md shadow-sm z-50 sticky top-0 h-14 transition-all duration-300">
            <div className="w-full h-full px-4 md:px-6">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={toggleSidebar} className="text-white hover:bg-white/10 p-2 rounded-full transition focus:outline-none active:scale-95">
                            <FaBars className="text-lg" />
                        </button>
                        <Link to="/" className="text-white text-xl font-bold font-display hover:opacity-90 transition">
                            <span className="tracking-tight hidden md:inline">{settings?.systemName || 'CED-BOOKING'}</span>
                            <span className="tracking-tight md:hidden">CED-BOOKING</span>
                        </Link>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3">
                        {/* Notification Bell (Admin Only) */}
                        {dbUser?.role === 'admin' && (
                            <div className="relative" ref={notiDropdownRef}>
                                <button
                                    onClick={() => {
                                        setIsNotiDropdownOpen(!isNotiDropdownOpen);
                                        // Optional: Clear on click? User said "Pressed into it OR went to that page"
                                        // Let's clear when they click the links inside, or visit page.
                                        // Clicking the bell just shows the list.
                                    }}
                                    className="relative p-2 text-white hover:bg-white/10 rounded-full transition-all duration-200 focus:outline-none"
                                >
                                    <FaBell className={`text-lg transition-transform duration-300 ${bellShake ? 'animate-[bellRing_0.8s_ease-in-out]' : ''} ${isNotiDropdownOpen ? 'scale-110' : ''}`} />
                                    {displayBadge > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-primary shadow-lg animate-pulse">
                                            {displayBadge > 9 ? '9+' : displayBadge}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown — Modern Design */}
                                {isNotiDropdownOpen && (
                                    <div className="absolute right-0 sm:right-0 mt-3 w-[calc(100vw-2rem)] sm:w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/80 overflow-hidden ring-1 ring-black/5 z-50 animate-scaleIn -right-2">
                                        {/* Header */}
                                        <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-800">การแจ้งเตือน</h3>
                                                {displayBadge > 0 && (
                                                    <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                                        {displayBadge > 9 ? '9+' : displayBadge}
                                                    </span>
                                                )}
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllRead}
                                                    className="text-[11px] text-primary hover:text-primary-dark font-semibold flex items-center gap-1 transition-colors"
                                                >
                                                    <FaCheck className="text-[8px]" /> อ่านทั้งหมด
                                                </button>
                                            )}
                                        </div>

                                        {/* Pending Summary Cards */}
                                        {(notifications.bookings > 0 || notifications.reports > 0) && (
                                            <div className="p-3 border-b border-gray-100 space-y-2">
                                                {notifications.bookings > 0 && (
                                                    <Link
                                                        to="/approve"
                                                        onClick={() => setIsNotiDropdownOpen(false)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                                                            ${newBookings > 0 ? 'bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 shadow-sm' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm
                                                            ${newBookings > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                            <FaCalendarPlus className="text-sm" />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <p className={`text-sm font-bold ${newBookings > 0 ? 'text-gray-900' : 'text-gray-600'}`}>คำขอจองห้อง</p>
                                                            <p className={`text-xs ${newBookings > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                                                                {newBookings > 0 ? `🔔 ${newBookings} รายการใหม่` : 'ไม่มีรายการใหม่'}
                                                                <span className="text-gray-400 ml-1">(รวม {notifications.bookings} รอดำเนินการ)</span>
                                                            </p>
                                                        </div>
                                                        {newBookings > 0 && <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />}
                                                    </Link>
                                                )}

                                                {notifications.reports > 0 && (
                                                    <Link
                                                        to="/admin/reports"
                                                        onClick={() => setIsNotiDropdownOpen(false)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                                                            ${newReports > 0 ? 'bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 shadow-sm' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm
                                                            ${newReports > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                            <FaExclamationTriangle className="text-sm" />
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <p className={`text-sm font-bold ${newReports > 0 ? 'text-gray-900' : 'text-gray-600'}`}>แจ้งซ่อม</p>
                                                            <p className={`text-xs ${newReports > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                                                                {newReports > 0 ? `🔔 ${newReports} รายการใหม่` : 'ไม่มีรายการใหม่'}
                                                                <span className="text-gray-400 ml-1">(รวม {notifications.reports} รอดำเนินการ)</span>
                                                            </p>
                                                        </div>
                                                        {newReports > 0 && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />}
                                                    </Link>
                                                )}
                                            </div>
                                        )}

                                        {/* Recent Activity Feed */}
                                        <div className="max-h-[320px] overflow-y-auto">
                                            {notiItems.length > 0 ? (
                                                <div className="p-2">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">กิจกรรมล่าสุด</p>
                                                    {notiItems.map((item, idx) => {
                                                        const config = notiConfig[item.type] || notiConfig['booking:created'];
                                                        return (
                                                            <Link
                                                                key={item.id}
                                                                to={item.link}
                                                                onClick={() => {
                                                                    setIsNotiDropdownOpen(false);
                                                                    setNotiItems(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                                                                    setUnreadCount(prev => item.read ? prev : Math.max(0, prev - 1));
                                                                }}
                                                                className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group mb-1
                                                                    ${!item.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                                                                style={{ animationDelay: `${idx * 50}ms` }}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-xs flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform mt-0.5`}>
                                                                    {config.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{config.label}</span>
                                                                        {!item.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                                                    </div>
                                                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                                                                    <p className="text-[11px] text-gray-400 mt-0.5">{getRelativeTime(item.time)}</p>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ) : notifications.bookings === 0 && notifications.reports === 0 ? (
                                                <div className="p-10 text-center flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-3">
                                                        <FaBell className="text-gray-300 text-xl" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-400">ไม่มีการแจ้งเตือน</p>
                                                    <p className="text-xs text-gray-300 mt-1">เมื่อมีคำขอจองหรือแจ้งซ่อมใหม่<br />จะแสดงที่นี่</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Profile Dropdown */}
                        {currentUser ? (
                            <div 
                                className="relative" 
                                ref={dropdownRef}
                                onMouseEnter={() => {
                                    if (window.innerWidth >= 768) {
                                        if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
                                        setIsDropdownOpen(true);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (window.innerWidth >= 768) {
                                        dropdownTimeoutRef.current = setTimeout(() => {
                                            setIsDropdownOpen(false);
                                        }, 300); // 300ms delay
                                    }
                                }}
                            >
                                <button
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setIsDropdownOpen(!isDropdownOpen);
                                        }
                                    }}
                                    className="flex items-center gap-3 text-white hover:bg-white/10 py-1 px-2 pr-3 rounded-full transition-all duration-200 focus:outline-none border border-transparent hover:border-white/20"
                                >
                                    <img
                                        src={currentUser.photoURL || dbUser?.picture || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full border-2 border-white/30 shadow-sm object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}&background=random`;
                                        }}
                                    />
                                    <div className="hidden md:block text-left mr-2">
                                        <p className="text-sm font-medium max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis leading-tight text-white">{currentUser.displayName || "ผู้ใช้งาน"}</p>
                                        <div className="flex justify-start mt-1">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-sm font-medium tracking-wide flex items-center gap-1 w-fit
                                                ${dbUser?.role === 'admin'
                                                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100/20'
                                                    : 'bg-white text-gray-700 shadow-sm border border-gray-200/50'}`}>
                                                {dbUser?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักศึกษา'}
                                            </span>
                                        </div>
                                    </div>
                                    <FaCaretDown className={`text-xs text-white/70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 origin-top-right transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2 overflow-hidden ring-1 ring-black/5 z-50">
                                        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 md:hidden">
                                            <p className="text-sm font-bold text-gray-800">{currentUser.displayName}</p>
                                            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                                        </div>
                                        <div className="p-1">
                                            <Link
                                                to="/profile"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium mb-1"
                                            >
                                                <FaUserCircle className="text-gray-400 text-lg" />
                                                ข้อมูลส่วนตัว
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                            >
                                                <FaSignOutAlt />
                                                ออกจากระบบ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="text-white font-medium hover:text-green-100 transition px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 backdrop-blur-sm text-sm">เข้าสู่ระบบ</Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};


export default Navbar;
