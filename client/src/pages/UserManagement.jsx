import { useState, useEffect, useCallback, useMemo } from 'react';
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
    const [showBanConfirm, setShowBanConfirm] = useState(null);
    const [banReason, setBanReason] = useState('');
    const toast = useToast();
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = useCallback(async () => {
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
    }, [toast]);

    const handleRoleChange = useCallback(async (userId, newRole) => {
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
    }, [toast, fetchUsers]);

    const handleBanToggle = useCallback(async (userId, isBanned, reason) => {
        setActionLoading(userId);
        try {
            const res = await api.put(`/users/${userId}/ban`, { isBanned, reason: reason || undefined });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        }
        setActionLoading(null);
    }, [toast, fetchUsers]);

    const handleDelete = useCallback(async (userId) => {
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
    }, [toast, fetchUsers]);

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

    const filteredUsers = useMemo(() => users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        banned: users.filter(u => u.isBanned).length
    };

    return (
        <div className="w-full h-full px-0 sm:px-4 py-6 sm:py-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">สมาชิกทั้งหมด</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="text-2xl font-bold text-primary">{stats.admins}</div>
                    <div className="text-sm text-gray-500">ผู้ดูแลระบบ</div>
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
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">สมาชิก</th>
                                        <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">รหัส/อีเมล</th>
                                        <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">บทบาท</th>
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
                                                            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold cursor-pointer
                                                            appearance-none pr-8 bg-no-repeat bg-[length:12px] bg-[right_8px_center]
                                                            ${user.role === 'admin'
                                                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 text-emerald-800 shadow-sm shadow-emerald-100'
                                                                    : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300 text-slate-700 shadow-sm'
                                                                } disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md`}
                                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E")` }}
                                                        >
                                                            <option value="student">นักศึกษา</option>
                                                            <option value="admin">ผู้ดูแลระบบ</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {user.isBanned ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                ถูกระงับ
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                ใช้งานปกติ
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
                                                                        onClick={() => setShowBanConfirm({ userId: user._id, isBanned: false, userName: user.name })}
                                                                        disabled={actionLoading === user._id}
                                                                        className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                                                                        title="คืนสิทธิ์การใช้งาน"
                                                                    >
                                                                        <FaCheck className="text-[10px]" /> คืนสิทธิ์
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setShowBanConfirm({ userId: user._id, isBanned: true, userName: user.name })}
                                                                        disabled={actionLoading === user._id}
                                                                        className="px-3.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                                                                        title="ระงับสิทธิ์การใช้งาน"
                                                                    >
                                                                        <FaBan className="text-[10px]" /> ระงับสิทธิ์
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setShowConfirm(user._id)}
                                                                    disabled={actionLoading === user._id}
                                                                    className="px-3.5 py-1.5 bg-gray-500 text-white text-xs font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                                                                    title="ลบบัญชีผู้ใช้"
                                                                >
                                                                    <FaTrash className="text-[10px]" /> ลบ
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

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                                const isCurrentUser = currentUser?.email === user.email;
                                return (
                                    <div key={user._id} className={`bg-white rounded-xl border shadow-sm p-4 ${user.isBanned ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                <img
                                                    src={user.picture || `https://ui-avatars.com/api/?name=${user.name || 'U'}`}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-gray-800 truncate">{user.name || 'ไม่ระบุชื่อ'}</span>
                                                    {isCurrentUser && <span className="text-xs text-primary font-medium">(คุณ)</span>}
                                                    {user.isBanned ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700">ถูกระงับ</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">ปกติ</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">{user.faculty || '-'}</div>
                                                <div className="text-xs text-gray-500 mt-1">{user.studentId || '-'} · {user.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                    disabled={isCurrentUser || actionLoading === user._id}
                                                    className={`px-2 py-1 rounded-lg border text-xs font-semibold
                                                    ${user.role === 'admin'
                                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                                            : 'bg-gray-50 border-gray-300 text-gray-700'
                                                        } disabled:opacity-40`}
                                                >
                                                    <option value="student">นักศึกษา</option>
                                                    <option value="admin">ผู้ดูแลระบบ</option>
                                                </select>
                                                <span className="text-[10px] text-gray-400">{formatDate(user.lastLogin)}</span>
                                            </div>

                                            {!isCurrentUser && (
                                                <div className="flex gap-2">
                                                    {user.isBanned ? (
                                                        <button
                                                            onClick={() => setShowBanConfirm({ userId: user._id, isBanned: false, userName: user.name })}
                                                            disabled={actionLoading === user._id}
                                                            className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40 flex items-center gap-1"
                                                        >
                                                            <FaCheck className="text-[10px]" /> คืนสิทธิ์
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setShowBanConfirm({ userId: user._id, isBanned: true, userName: user.name })}
                                                            disabled={actionLoading === user._id}
                                                            className="px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40 flex items-center gap-1"
                                                        >
                                                            <FaBan className="text-[10px]" /> ระงับสิทธิ์
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowConfirm(user._id)}
                                                        disabled={actionLoading === user._id}
                                                        className="px-2.5 py-1.5 bg-gray-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 flex items-center gap-1"
                                                    >
                                                        <FaTrash className="text-[10px]" /> ลบ
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-gray-400">
                                <FaUsers className="text-4xl text-gray-200 mx-auto mb-3" />
                                <p>ไม่พบสมาชิก</p>
                            </div>
                        )}
                    </div>
                </>
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

            {/* Confirm Ban/Unban Modal */}
            {showBanConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowBanConfirm(null); setBanReason(''); }}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${showBanConfirm.isBanned ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                {showBanConfirm.isBanned
                                    ? <FaBan className="text-red-500 text-2xl" />
                                    : <FaCheck className="text-emerald-500 text-2xl" />
                                }
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                {showBanConfirm.isBanned ? 'ยืนยันระงับสิทธิ์การใช้งาน?' : 'ยืนยันคืนสิทธิ์การใช้งาน?'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {showBanConfirm.isBanned
                                    ? <>คุณต้องการระงับสิทธิ์การใช้งานของ <span className="font-semibold text-gray-700">{showBanConfirm.userName || 'ผู้ใช้นี้'}</span> ใช่หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้</>
                                    : <>คุณต้องการคืนสิทธิ์การใช้งานให้ <span className="font-semibold text-gray-700">{showBanConfirm.userName || 'ผู้ใช้นี้'}</span> ใช่หรือไม่? ผู้ใช้จะสามารถเข้าสู่ระบบได้ตามปกติ</>
                                }
                            </p>

                            {/* Ban reason textarea - only show when banning */}
                            {showBanConfirm.isBanned && (
                                <div className="w-full mb-4 text-left">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">เหตุผลการระงับ (จะส่งไปยังอีเมลผู้ใช้)</label>
                                    <textarea
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        placeholder="เช่น ใช้ห้องไม่เหมาะสม, ผิดกฎการใช้ห้อง..."
                                        maxLength={200}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-colors"
                                        rows={3}
                                    />
                                    <div className="text-right text-[10px] text-gray-400 mt-1">{banReason.length}/200</div>
                                </div>
                            )}

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setShowBanConfirm(null); setBanReason(''); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => {
                                        handleBanToggle(showBanConfirm.userId, showBanConfirm.isBanned, banReason);
                                        setShowBanConfirm(null);
                                        setBanReason('');
                                    }}
                                    className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${showBanConfirm.isBanned
                                            ? 'bg-red-500 hover:bg-red-600'
                                            : 'bg-emerald-500 hover:bg-emerald-600'
                                        }`}
                                >
                                    {showBanConfirm.isBanned
                                        ? <><FaBan className="text-xs" /> ระงับสิทธิ์</>
                                        : <><FaCheck className="text-xs" /> คืนสิทธิ์</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
