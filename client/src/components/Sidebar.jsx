import { Link, useLocation } from 'react-router-dom';
import {
    FaBook,
    FaBuilding,
    FaCalendarAlt,
    FaChartLine,
    FaClipboardCheck,
    FaCog,
    FaDoorOpen,
    FaExclamationTriangle,
    FaHistory,
    FaQuestionCircle,
    FaTools,
    FaUsers
} from 'react-icons/fa';

import { useAdminNotifications } from '../contexts/AdminNotificationsContext';
import { useAuth } from '../contexts/AuthContext';

const publicItems = [
    { path: '/calendar', name: 'ปฏิทินการจอง', icon: <FaCalendarAlt /> },
    { path: '/rooms', name: 'เลือกห้องอบรม', icon: <FaDoorOpen /> },
    { path: '/history', name: 'ประวัติการจอง', icon: <FaHistory /> },
    { path: '/room-rules', name: 'กฎระเบียบการใช้ห้อง', icon: <FaBook /> },
    { path: '/report-issue', name: 'แจ้งปัญหา', icon: <FaExclamationTriangle /> },
    { path: '/guide', name: 'คู่มือการใช้งาน', icon: <FaQuestionCircle /> }
];

const adminItems = [
    { path: '/dashboard', name: 'ภาพรวมระบบ', icon: <FaChartLine /> },
    { path: '/approve', name: 'คำขอ/การอนุมัติ', icon: <FaClipboardCheck /> },
    { path: '/admin/reports', name: 'แจ้งปัญหา (Admin)', icon: <FaTools /> },
    { path: '/admin/users', name: 'จัดการสมาชิก', icon: <FaUsers /> },
    { path: '/rooms-manage', name: 'จัดการห้อง', icon: <FaBuilding /> },
    { path: '/settings', name: 'การตั้งค่า', icon: <FaCog /> }
];

const SidebarBadge = ({ count }) => {
    if (!count) {
        return null;
    }

    return (
        <span className="ml-3 inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {count > 99 ? '99+' : count}
        </span>
    );
};

const SidebarLink = ({ item, active, badgeCount }) => (
    <Link
        to={item.path}
        className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl transition-all duration-200 group ${
            active
                ? 'bg-gradient-to-r from-green-50 to-green-100 text-primary shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
        <span className={`text-lg transition-transform duration-200 group-hover:scale-110 ${
            active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
        }`}>
            {item.icon}
        </span>
        <span className="min-w-0 flex-1 font-medium whitespace-nowrap text-sm tracking-wide">{item.name}</span>
        <SidebarBadge count={badgeCount} />
    </Link>
);

const Sidebar = () => {
    const location = useLocation();
    const { isAdmin, isAdminUnlocked } = useAuth();
    const { notifications, totalPendingNotifications } = useAdminNotifications();

    const isActive = (path) => location.pathname === path;

    const getAdminBadgeCount = (path) => {
        if (!isAdmin) {
            return 0;
        }

        if (!isAdminUnlocked) {
            return path === '/dashboard' ? totalPendingNotifications : 0;
        }

        if (path === '/approve') {
            return notifications.bookings;
        }

        if (path === '/admin/reports') {
            return notifications.reports;
        }

        return 0;
    };

    return (
        <aside className="bg-white shadow-lg border-r border-gray-100 flex-shrink-0 flex flex-col justify-between w-full h-full">
            <div className="w-full">
                <div className="px-6 py-5 border-b border-gray-100/60 mb-2">
                    <div className="flex items-center justify-center w-full group cursor-pointer relative py-1">
                        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        <img
                            src="/Comedu.png"
                            alt="Comedu Logo"
                            className="h-12 md:h-14 w-auto object-contain relative z-10 drop-shadow-sm group-hover:drop-shadow-md group-hover:scale-105 transition-all duration-300"
                        />
                    </div>
                </div>

                <nav className="mt-2">
                    <ul>
                        {publicItems.map((item) => (
                            <li key={item.path}>
                                <SidebarLink item={item} active={isActive(item.path)} badgeCount={0} />
                            </li>
                        ))}

                        {isAdmin && (
                            <>
                                <div className="px-6 py-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ผู้ดูแลระบบ</h3>
                                </div>

                                <li key="/dashboard">
                                    <SidebarLink
                                        item={adminItems[0]}
                                        active={isActive('/dashboard')}
                                        badgeCount={getAdminBadgeCount('/dashboard')}
                                    />
                                </li>

                                {isAdminUnlocked && adminItems.slice(1).map((item) => (
                                    <li key={item.path}>
                                        <SidebarLink
                                            item={item}
                                            active={isActive(item.path)}
                                            badgeCount={getAdminBadgeCount(item.path)}
                                        />
                                    </li>
                                ))}
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;
