import { Link, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaClipboardCheck, FaHistory, FaChartLine, FaCog, FaBuilding, FaExclamationTriangle, FaTools, FaBook, FaDoorOpen } from 'react-icons/fa';

import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isOpen }) => {
    const location = useLocation();
    const { isAdmin, isAdminUnlocked } = useAuth();

    const isActive = (path) => {
        return location.pathname === path;
    };

    const publicItems = [
        { path: '/calendar', name: 'ปฏิทินการจอง', icon: <FaCalendarAlt /> },
        { path: '/rooms', name: 'เลือกห้องอบรม', icon: <FaDoorOpen /> },
        { path: '/history', name: 'ประวัติการจอง', icon: <FaHistory /> },
        { path: '/room-rules', name: 'กฎระเบียบการใช้ห้อง', icon: <FaBook /> },
        { path: '/report-issue', name: 'แจ้งปัญหา', icon: <FaExclamationTriangle /> },
    ];

    const adminItems = [
        { path: '/dashboard', name: 'ภาพรวมระบบ', icon: <FaChartLine /> },
        { path: '/approve', name: 'คำขอ/การอนุมัติ', icon: <FaClipboardCheck /> },
        { path: '/admin/reports', name: 'แจ้งปัญหา (Admin)', icon: <FaTools /> },
        { path: '/rooms-manage', name: 'จัดการห้อง', icon: <FaBuilding /> },
        { path: '/settings', name: 'การตั้งค่า', icon: <FaCog /> },
    ];

    return (
        <aside className="bg-white shadow-lg border-r border-gray-100 flex-shrink-0 flex flex-col justify-between w-64 h-full">
            <div className="w-64">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800">เมนูหลัก</h2>
                </div>
                <nav className="mt-2">
                    <ul>
                        {/* Public Items */}
                        {publicItems.map((item, index) => (
                            <li key={index}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl transition-all duration-200 group ${isActive(item.path)
                                        ? 'bg-gradient-to-r from-green-50 to-green-100 text-primary shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive(item.path) ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="font-medium whitespace-nowrap text-sm tracking-wide">{item.name}</span>
                                </Link>
                            </li>
                        ))}

                        {/* Admin Sub-items */}
                        {isAdmin && (
                            <>
                                <div className="px-6 py-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ผู้ดูแลระบบ</h3>
                                </div>

                                {/* Always Visible for Admin */}
                                <li key="dashboard">
                                    <Link
                                        to="/dashboard"
                                        className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl transition-all duration-200 group ${isActive('/dashboard')
                                            ? 'bg-gradient-to-r from-green-50 to-green-100 text-primary shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive('/dashboard') ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                            <FaChartLine />
                                        </span>
                                        <span className="font-medium whitespace-nowrap text-sm tracking-wide">ภาพรวมระบบ</span>
                                    </Link>
                                </li>

                                {/* Protected Items (Need PIN) */}
                                {isAdminUnlocked && adminItems.slice(1).map((item, index) => (
                                    <li key={`admin-${index}`}>
                                        <Link
                                            to={item.path}
                                            className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl transition-all duration-200 group ${isActive(item.path)
                                                ? 'bg-gradient-to-r from-green-50 to-green-100 text-primary shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <span className={`text-lg transition-transform duration-200 group-hover:scale-110 ${isActive(item.path) ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="font-medium whitespace-nowrap text-sm tracking-wide">{item.name}</span>
                                        </Link>
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
