import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBuilding, FaBars, FaSignOutAlt, FaUserCircle, FaExclamationTriangle, FaCaretDown, FaBell } from 'react-icons/fa'; // Add FaBell
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const Navbar = ({ toggleSidebar }) => {
    const { currentUser, logout, dbUser } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation(); // Add hook to check current page

    const [notifications, setNotifications] = useState({
        bookings: 0,
        reports: 0
    });

    // Track "seen" counts to hide badge after viewing
    const [seenCounts, setSeenCounts] = useState({
        bookings: parseInt(localStorage.getItem('seenBookings') || '0'),
        reports: parseInt(localStorage.getItem('seenReports') || '0')
    });

    const [isNotiDropdownOpen, setIsNotiDropdownOpen] = useState(false);
    const notiDropdownRef = useRef(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const fetchNotifications = async () => {
        if (!dbUser || dbUser.role !== 'admin') return;

        try {
            const [bookingsRes, reportsRes] = await Promise.all([
                api.get('/bookings'),
                api.get('/reports') // Assumes admin gets all reports
            ]);

            // console.log("Fetching notifications...", bookingsRes.data, reportsRes.data);

            const pendingBookings = bookingsRes.data.data.filter(b => b.status === 'pending' && !b.isImported).length;
            const pendingReports = reportsRes.data.data.filter(r => r.status === 'pending').length;

            console.log("Pending Bookings (User):", pendingBookings);
            console.log("Pending Reports:", pendingReports);

            setNotifications({
                bookings: pendingBookings,
                reports: pendingReports
            });

            // Auto-sync seen counts if items were removed (approved/rejected)
            // preventing "seen" from staying higher than actual pending
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
    };

    // Poll notifications
    useEffect(() => {
        if (dbUser?.role === 'admin') {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 10000); // Check every 10 seconds for faster feedback
            return () => clearInterval(interval);
        }
    }, [dbUser]);

    // Clear notifications when visiting pages
    useEffect(() => {
        if (dbUser?.role === 'admin') {
            if (location.pathname === '/approve') {
                // If on approve page, mark all current pending bookings as seen
                if (notifications.bookings > seenCounts.bookings) {
                    updateSeenCount('bookings', notifications.bookings);
                }
            }
            if (location.pathname === '/admin/reports') {
                // If on reports page, mark all current pending reports as seen
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

    // Calculate badges
    const newBookings = Math.max(0, notifications.bookings - seenCounts.bookings);
    const newReports = Math.max(0, notifications.reports - seenCounts.reports);
    const totalNew = newBookings + newReports;

    return (
        <nav className="bg-primary/95 backdrop-blur-md shadow-sm z-50 sticky top-0 h-14 transition-all duration-300">
            <div className="w-full h-full px-4 md:px-6">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={toggleSidebar} className="text-white hover:bg-white/10 p-2 rounded-full transition focus:outline-none active:scale-95">
                            <FaBars className="text-lg" />
                        </button>
                        <Link to="/" className="text-white text-lg font-bold flex items-center gap-2 hover:opacity-90 transition">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <FaBuilding className="text-base" />
                            </div>
                            <span className="tracking-tight hidden md:inline">{settings?.systemName || 'ระบบจองห้องประชุม'}</span>
                            <span className="tracking-tight md:hidden">Booking</span>
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
                                    <FaBell className={`text-lg transition-transform duration-300 ${isNotiDropdownOpen ? 'scale-110' : ''}`} />
                                    {totalNew > 0 && (
                                        <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-primary shadow-sm animate-pulse-gentle">
                                            {totalNew > 9 ? '9+' : totalNew}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {isNotiDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ring-1 ring-black/5 z-50">
                                        <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                                            <h3 className="font-bold text-gray-800 text-sm">การแจ้งเตือน</h3>
                                            {totalNew > 0 && (
                                                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    {totalNew} ใหม่
                                                </span>
                                            )}
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto">
                                            {notifications.bookings === 0 && notifications.reports === 0 ? (
                                                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                                        <FaExclamationTriangle className="text-gray-300" />
                                                    </div>
                                                    <p className="text-sm">ไม่มีรายการโต้ตอบ</p>
                                                </div>
                                            ) : (
                                                <div className="p-1 space-y-1">
                                                    {notifications.bookings > 0 && (
                                                        <Link
                                                            to="/approve"
                                                            onClick={() => setIsNotiDropdownOpen(false)}
                                                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors group relative
                                                                ${newBookings > 0 ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform
                                                                ${newBookings > 0 ? 'bg-orange-200 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                <FaBuilding />
                                                            </div>
                                                            <div className="flex-grow">
                                                                <div className="flex justify-between items-center">
                                                                    <p className={`text-sm font-bold ${newBookings > 0 ? 'text-gray-900' : 'text-gray-600'}`}>คำขอจองห้อง</p>
                                                                    {newBookings > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                                                </div>
                                                                <p className={`text-xs ${newBookings > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                                                                    {newBookings > 0 ? `มี ${newBookings} รายการใหม่` : 'ไม่มีรายการใหม่'}
                                                                    (รวม {notifications.bookings})
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )}

                                                    {notifications.reports > 0 && (
                                                        <Link
                                                            to="/admin/reports"
                                                            onClick={() => setIsNotiDropdownOpen(false)}
                                                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors group relative
                                                                ${newReports > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform
                                                                ${newReports > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                <FaExclamationTriangle />
                                                            </div>
                                                            <div className="flex-grow">
                                                                <div className="flex justify-between items-center">
                                                                    <p className={`text-sm font-bold ${newReports > 0 ? 'text-gray-900' : 'text-gray-600'}`}>แจ้งซ่อม</p>
                                                                    {newReports > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                                                </div>
                                                                <p className={`text-xs ${newReports > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                                    {newReports > 0 ? `มี ${newReports} รายการใหม่` : 'ไม่มีรายการใหม่'}
                                                                    (รวม {notifications.reports})
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Profile Dropdown */}
                        {currentUser ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                                        <p className="text-sm font-bold truncate max-w-[120px] leading-tight text-white">{currentUser.displayName || "ผู้ใช้งาน"}</p>
                                        <div className="flex justify-start mt-0.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-fit
                                                ${dbUser?.role === 'admin'
                                                    ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.4)] border border-yellow-300'
                                                    : 'bg-white/20 text-white/90 border border-white/10'}`}>
                                                {dbUser?.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                                            </span>
                                        </div>
                                    </div>
                                    <FaCaretDown className={`text-xs text-white/70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ring-1 ring-black/5">
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
