import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaUsers, FaSearch, FaUserShield, FaUser, FaBan, FaCheck, FaTrash, FaCrown } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [showConfirm, setShowConfirm] = useState(null);
    const toast = useToast();
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId, newRole) => {
        setActionLoading(userId);
        try {
            const res = await api.put(`/users/${userId}/role`, { role: newRole });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        }
        setActionLoading(null);
    };

    const handleBanToggle = async (userId, isBanned) => {
        setActionLoading(userId);
        try {
            const res = await api.put(`/users/${userId}/ban`, { isBanned });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        }
        setActionLoading(null);
    };

    const handleDelete = async (userId) => {
        setActionLoading(userId);
        try {
            const res = await api.delete(`/users/${userId}`);
            if (res.data.success) {
                toast.success(res.data.message);
                setShowConfirm(null);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        }
        setActionLoading(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        banned: users.filter(u => u.isBanned).length
    };

    return (
        <div className="w-full h-full px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUsers className="text-primary" /> จัดการสมาชิก
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">ดูและจัดการสมาชิกในระบบ</p>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา (ชื่อ, อีเมล, รหัส)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">สมาชิกทั้งหมด</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-2xl font-bold text-primary">{stats.admins}</div>
                    <div className="text-sm text-gray-500">Admin</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-2xl font-bold text-red-500">{stats.banned}</div>
                    <div className="text-sm text-gray-500">ถูกแบน</div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">สมาชิก</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">รหัส/อีเมล</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">เข้าล่าสุด</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => {
                                        const isCurrentUser = currentUser?.email === user.email;
                                        return (
                                            <tr key={user._id} className={`hover:bg-gray-50/50 transition-colors ${user.isBanned ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={user.picture || `https://ui-avatars.com/api/?name=${user.name || 'U'}`}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-800 flex items-center gap-2">
                                                                {user.name || 'ไม่ระบุชื่อ'}
                                                                {isCurrentUser && <span className="text-xs text-primary">(คุณ)</span>}
                                                            </div>
                                                            <div className="text-xs text-gray-400">{user.faculty || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                    <div className="text-gray-800">{user.studentId || '-'}</div>
                                                    <div className="text-xs text-gray-400">{user.email}</div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                        disabled={isCurrentUser || actionLoading === user._id}
                                                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${user.role === 'admin'
                                                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                                                : 'bg-gray-50 border-gray-200 text-gray-700'
                                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        <option value="student">👤 Student</option>
                                                        <option value="admin">👑 Admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {user.isBanned ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                            🚫 ถูกแบน
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                            ✅ ปกติ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(user.lastLogin)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    {!isCurrentUser && (
                                                        <div className="flex gap-2 justify-center">
                                                            {user.isBanned ? (
                                                                <button
                                                                    onClick={() => handleBanToggle(user._id, false)}
                                                                    disabled={actionLoading === user._id}
                                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    title="ปลดแบน"
                                                                >
                                                                    <FaCheck /> ปลดแบน
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleBanToggle(user._id, true)}
                                                                    disabled={actionLoading === user._id}
                                                                    className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    title="แบน"
                                                                >
                                                                    <FaBan /> แบน
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setShowConfirm(user._id)}
                                                                disabled={actionLoading === user._id}
                                                                className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                title="ลบ"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <FaUsers className="text-4xl text-gray-200" />
                                                <p>ไม่พบสมาชิก</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการลบ</h3>
                        <p className="text-gray-500 text-sm mb-6">คุณต้องการลบผู้ใช้นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleDelete(showConfirm)}
                                disabled={actionLoading === showConfirm}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {actionLoading === showConfirm ? 'กำลังลบ...' : 'ลบ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
