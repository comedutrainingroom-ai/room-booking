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
    const showAdminBell = dbUser?.role === 'admin';
    const canAccessAdminNotifications = dbUser?.role === 'admin';

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
        if (!canAccessAdminNotifications) return;

        try {
            const [bookingsRes, reportsRes] = await Promise.all([
                api.get('/bookings/notification-summary'),
                api.get('/reports/notification-summary')
            ]);

            const pendingBookings = bookingsRes.data?.data?.pendingCount || 0;
            const pendingReports = reportsRes.data?.data?.pendingCount || 0;

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
    }, [canAccessAdminNotifications]);

    useEffect(() => {
        if (canAccessAdminNotifications) {
            fetchNotifications();
            return;
        }

        setNotifications({ bookings: 0, reports: 0 });
        setNotiItems([]);
        setUnreadCount(0);
    }, [canAccessAdminNotifications, fetchNotifications]);

    // Socket.io real-time notification listener with toast pop-ups
    useEffect(() => {
        if (!socket || !canAccessAdminNotifications) return;

        const handleBookingCreated = () => {
            fetchNotifications();
            addNotiItem({
                type: 'booking:created',
                title: 'มีคำขอจองห้องใหม่',
                message: 'กรุณาตรวจสอบและอนุมัติ',
                link: '/approve'
            });
            toast.info('มีคำขอจองใหม่ กรุณาตรวจสอบรายการ');
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

        const handleReportCreated = () => {
            fetchNotifications();
            addNotiItem({
                type: 'report:created',
                title: 'มีแจ้งซ่อมใหม่',
                message: 'กรุณาตรวจสอบและดำเนินการ',
                link: '/admin/reports'
            });
            toast.warning('มีแจ้งซ่อมใหม่ กรุณาตรวจสอบรายการ');
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
    }, [socket, canAccessAdminNotifications, fetchNotifications, addNotiItem, toast]);

    // Clear notifications when visiting pages
    useEffect(() => {
        if (canAccessAdminNotifications) {
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
    }, [location.pathname, notifications, seenCounts, canAccessAdminNotifications]);

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
    const displayBadge = Math.max(totalNew, unreadCount);
    const hasPendingNotifications = notifications.bookings > 0 || notifications.reports > 0;

    // Notification item config
    const notiConfig = {
        'booking:created': { icon: <FaCalendarPlus />, iconClass: 'border border-slate-200 bg-slate-50 text-slate-600', label: 'คำขอจอง' },
        'booking:updated': { icon: <FaCheckCircle />, iconClass: 'border border-slate-200 bg-slate-50 text-slate-600', label: 'อัปเดตการจอง' },
        'booking:deleted': { icon: <FaTimesCircle />, iconClass: 'border border-slate-200 bg-slate-50 text-slate-600', label: 'ยกเลิกการจอง' },
        'report:created': { icon: <FaExclamationTriangle />, iconClass: 'border border-slate-200 bg-slate-50 text-slate-600', label: 'แจ้งซ่อม' },
        'report:updated': { icon: <FaCheckCircle />, iconClass: 'border border-slate-200 bg-slate-50 text-slate-600', label: 'อัปเดตแจ้งซ่อม' }
    };

    const pendingSummaryCards = [
        {
            key: 'bookings',
            title: 'คำขอจองห้อง',
            description: 'รายการรอการอนุมัติจากผู้ใช้งาน',
            total: notifications.bookings,
            newCount: newBookings,
            link: '/approve',
            icon: <FaCalendarPlus className="text-sm" />,
            iconClass: 'border border-slate-200 bg-slate-50 text-slate-600',
            badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
            statusClass: 'text-slate-700'
        },
        {
            key: 'reports',
            title: 'แจ้งซ่อม',
            description: 'รายการปัญหาที่รอการตรวจสอบและดำเนินการ',
            total: notifications.reports,
            newCount: newReports,
            link: '/admin/reports',
            icon: <FaExclamationTriangle className="text-sm" />,
            iconClass: 'border border-slate-200 bg-slate-50 text-slate-600',
            badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
            statusClass: 'text-slate-700'
        }
    ].filter(({ total }) => total > 0);

    return (
        <nav className="bg-primary/95 backdrop-blur-md shadow-sm z-50 sticky top-0 h-14 transition-shadow duration-300">
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
                        {showAdminBell && (
                            <div className="relative" ref={notiDropdownRef}>
                                <button
                                    onClick={() => {
                                        if (!canAccessAdminNotifications) {
                                            setIsNotiDropdownOpen(false);
                                            toast.info('กรุณาปลดล็อก Admin PIN ก่อนดูการแจ้งเตือน');
                                            return;
                                        }

                                        setIsNotiDropdownOpen(!isNotiDropdownOpen);
                                    }}
                                    title={canAccessAdminNotifications ? 'Notifications' : 'Unlock Admin PIN to view notifications'}
                                    className={`relative p-2 text-white rounded-full transition-all duration-200 focus:outline-none ${
                                        canAccessAdminNotifications ? 'hover:bg-white/10' : 'bg-white/5 opacity-80'
                                    }`}
                                >
                                    <FaBell className={`text-lg transition-transform duration-300 ${bellShake ? 'animate-[bellRing_0.8s_ease-in-out]' : ''} ${isNotiDropdownOpen ? 'scale-110' : ''}`} />
                                    {displayBadge > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-red-500 text-[10px] font-bold text-white shadow-lg">
                                            {displayBadge > 9 ? '9+' : displayBadge}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {canAccessAdminNotifications && isNotiDropdownOpen && (
                                    <div className="absolute -right-2 right-0 z-50 mt-4 w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 sm:w-[380px] animate-scaleIn">
                                        {/* Pending Summary Cards */}
                                        {hasPendingNotifications && (
                                            <div className="border-b border-slate-200 px-3.5 py-3.5">
                                                <div className="grid gap-2.5">
                                                    {pendingSummaryCards.map((card) => {
                                                        const hasNewItems = card.newCount > 0;

                                                        return (
                                                            <Link
                                                                key={card.key}
                                                                to={card.link}
                                                                onClick={() => setIsNotiDropdownOpen(false)}
                                                                className="group rounded-xl border border-slate-200 px-3.5 py-3 transition-colors duration-200 hover:bg-slate-50"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}>
                                                                        {card.icon}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="truncate text-sm font-semibold text-slate-900">{card.title}</p>
                                                                                    {hasNewItems && (
                                                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${card.badgeClass}`}>
                                                                                            {card.newCount} ใหม่
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="mt-1 text-[11px] text-slate-500">
                                                                                    {card.description}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                                                                            <span className={`font-medium ${hasNewItems ? card.statusClass : 'text-slate-500'}`}>
                                                                                {hasNewItems ? `${card.newCount} รายการใหม่` : 'ไม่มีรายการใหม่'}
                                                                            </span>
                                                                            <span className="text-slate-300">•</span>
                                                                            <span className="text-slate-500">{card.total} รอดำเนินการ</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent Activity Feed */}
                                        <div className="max-h-[340px] overflow-y-auto bg-white">
                                            {notiItems.length > 0 ? (
                                                <div className="px-3.5 py-3">
                                                    <div className="mb-2 flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">กิจกรรมล่าสุด</p>
                                                            <span className="text-[10px] font-medium text-slate-400">{notiItems.length} รายการ</span>
                                                        </div>
                                                        {unreadCount > 0 && (
                                                            <button
                                                                onClick={markAllRead}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-800"
                                                            >
                                                                <FaCheck className="text-[9px]" /> อ่านทั้งหมด
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
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
                                                                    className={`group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-200 hover:bg-slate-50 ${
                                                                        !item.read
                                                                            ? 'border-slate-300 bg-slate-50/70'
                                                                            : 'border-slate-200 bg-white'
                                                                    }`}
                                                                    style={{ animationDelay: `${idx * 50}ms` }}
                                                                >
                                                                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${config.iconClass}`}>
                                                                        {config.icon}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{config.label}</span>
                                                                            {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                                                                        </div>
                                                                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{item.title}</p>
                                                                        {item.message && (
                                                                            <p className="mt-1 text-xs text-slate-500">{item.message}</p>
                                                                        )}
                                                                        <p className="mt-2 text-[11px] text-slate-400">{getRelativeTime(item.time)}</p>
                                                                    </div>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : !hasPendingNotifications ? (
                                                <div className="flex flex-col items-center px-6 py-10 text-center">
                                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                                                        <FaBell className="text-xl text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-700">ไม่มีการแจ้งเตือนที่ต้องดำเนินการ</p>
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        เมื่อมีคำขอจองห้องหรือแจ้งซ่อมใหม่
                                                        <br />
                                                        ระบบจะแสดงรายการที่นี่
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="px-6 py-8 text-center">
                                                    <p className="text-sm font-semibold text-slate-600">ไม่มีประวัติกิจกรรมล่าสุด</p>
                                                    <p className="mt-1 text-xs text-slate-400">รายการใหม่ที่เข้ามาจะปรากฏในส่วนนี้</p>
                                                </div>
                                            )}
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
