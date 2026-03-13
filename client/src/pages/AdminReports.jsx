import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { FaExclamationTriangle, FaTools, FaBuilding, FaClock, FaCheckCircle, FaSearch, FaWrench, FaCheck, FaHistory } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
    const [confirmResolve, setConfirmResolve] = useState(null); // reportId to confirm
    const toast = useToast();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = useCallback(async () => {
        try {
            const res = await api.get('/reports');
            if (res.data.success) {
                setReports(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch reports", error);
        }
        setLoading(false);
    }, []);

    const handleMaintenance = useCallback(async (reportId, isActive) => {
        setActionLoading(reportId);
        try {
            const res = await api.put(`/reports/${reportId}/maintenance`, { isActive });
            if (res.data.success) {
                toast.success(res.data.message);
                fetchReports(); // Refresh list
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        }
        setActionLoading(null);
    }, [toast, fetchReports]);

    const getUrgencyBadge = (urgency) => {
        switch (urgency) {
            case 'emergency':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 w-fit"><FaExclamationTriangle /> ฉุกเฉิน</span>;
            case 'urgent':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1 w-fit"><FaExclamationTriangle /> ด่วน</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><FaTools /> ปกติ</span>;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'in_progress':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1 w-fit"><FaWrench /> กำลังซ่อมห้อง</span>;
            case 'resolved':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1 w-fit"><FaCheckCircle /> ซ่อมเสร็จ</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 w-fit">❌ ปฏิเสธ</span>;
            case 'pending':
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><FaClock /> รอดำเนินการ</span>;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const activeReportsCount = useMemo(() => {
        return reports.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    }, [reports]);

    const historyReportsCount = useMemo(() => {
        return reports.filter(r => r.status === 'resolved' || r.status === 'rejected').length;
    }, [reports]);

    const filteredReports = useMemo(() => {
        let filtered;
        if (activeTab === 'active') {
            filtered = reports.filter(report => report.status === 'pending' || report.status === 'in_progress');
        } else {
            filtered = reports.filter(report => report.status === 'resolved' || report.status === 'rejected');
        }

        if (searchTerm) {
            filtered = filtered.filter(report =>
                report.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (report.room?.name || 'Common Area').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (report.reporter?.name || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [reports, searchTerm, activeTab]);

    const isHistory = activeTab === 'history';

    return (
        <div className="w-full h-full px-0 sm:px-4 py-6 sm:py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaTools className="text-red-500" /> จัดการแจ้งซ่อม (Admin)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">รายการแจ้งปัญหาทั้งหมดจากผู้ใช้งาน</p>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา (หัวข้อ, ห้อง, ผู้แจ้ง)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'active'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaTools className={`text-xs ${activeTab === 'active' ? 'text-red-500' : ''}`} />
                    รายการแจ้งซ่อม
                    {activeReportsCount > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === 'active' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {activeReportsCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'history'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaHistory className={`text-xs ${activeTab === 'history' ? 'text-green-500' : ''}`} />
                    ประวัติการแจ้งซ่อม
                    {historyReportsCount > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                            activeTab === 'history' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {historyReportsCount}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                </div>
            ) : (
                <>
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-fixed">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '16%' : '14%'}}>วันที่แจ้ง</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '11%' : '10%'}}>ความเร่งด่วน</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '13%' : '12%'}}>ห้อง/สถานที่</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '26%' : '22%'}}>หัวข้อปัญหา</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '18%' : '16%'}}>ผู้แจ้ง</th>
                                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider" style={{width: isHistory ? '16%' : '12%'}}>สถานะ</th>
                                    {!isHistory && (
                                        <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center" style={{width: '14%'}}>จัดการ</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <FaClock className="text-gray-400" />
                                                    {formatDate(report.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {getUrgencyBadge(report.urgency)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <FaBuilding className="text-gray-400" />
                                                    <div>
                                                        {report.room ? report.room.name : <span className="text-gray-400 italic">พื้นที่ส่วนกลาง</span>}
                                                        {report.room && report.room.isActive === false && (
                                                            <span className="ml-2 text-xs text-red-500 font-bold">🔒 ปิดซ่อม</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-800">
                                                <div className="font-bold mb-0.5">{report.topic}</div>
                                                <div className="text-gray-500 text-xs truncate max-w-xs">{report.description}</div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
                                                        <img
                                                            src={report.reporter?.picture || `https://ui-avatars.com/api/?name=${report.reporter?.name || 'Unknown'}`}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-800">{report.reporter?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-400">{report.reporter?.phone || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {getStatusBadge(report.status)}
                                            </td>
                                            {!isHistory && (
                                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                                    {report.room ? (
                                                        <div className="flex gap-2 justify-center min-w-[130px]">
                                                            {report.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleMaintenance(report._id, false)}
                                                                    disabled={actionLoading === report._id}
                                                                    className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    title="ปิดห้องเพื่อดำเนินการซ่อม"
                                                                >
                                                                    {actionLoading === report._id ? (
                                                                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                                    ) : (
                                                                        <><FaWrench /> ดำเนินการซ่อม</>
                                                                    )}
                                                                </button>
                                                            )}
                                                            {report.status === 'in_progress' && (
                                                                <button
                                                                    onClick={() => setConfirmResolve(report._id)}
                                                                    disabled={actionLoading === report._id}
                                                                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    title="ซ่อมเสร็จแล้ว เปิดให้จองห้องได้ปกติ"
                                                                >
                                                                    {actionLoading === report._id ? (
                                                                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                                    ) : (
                                                                        <><FaCheck /> ซ่อมเสร็จแล้ว</>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isHistory ? 6 : 7} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                {isHistory ? (
                                                    <>
                                                        <FaHistory className="text-4xl text-gray-200" />
                                                        <p>ยังไม่มีประวัติการแจ้งซ่อม</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCheckCircle className="text-4xl text-green-100" />
                                                        <p>ยังไม่มีรายการแจ้งซ่อม</p>
                                                    </>
                                                )}
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
                    {filteredReports.length > 0 ? (
                        filteredReports.map((report) => (
                            <div key={report._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getUrgencyBadge(report.urgency)}
                                        {getStatusBadge(report.status)}
                                    </div>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                                        <FaClock className="text-[8px]" />
                                        {formatDate(report.createdAt)}
                                    </span>
                                </div>

                                <h3 className="font-bold text-gray-800 text-sm mb-1">{report.topic}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{report.description}</p>

                                <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                                    <span className="flex items-center gap-1">
                                        <FaBuilding className="text-gray-400 text-[10px]" />
                                        {report.room ? report.room.name : 'พื้นที่ส่วนกลาง'}
                                        {report.room && report.room.isActive === false && (
                                            <span className="text-red-500 font-bold">🔒</span>
                                        )}
                                    </span>
                                    <span className="text-gray-300">·</span>
                                    <span className="flex items-center gap-1">
                                        <div className="h-4 w-4 rounded-full bg-gray-200 overflow-hidden">
                                            <img
                                                src={report.reporter?.picture || `https://ui-avatars.com/api/?name=${report.reporter?.name || 'U'}&size=32`}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        {report.reporter?.name || 'Unknown'}
                                    </span>
                                </div>

                                {!isHistory && report.room && (
                                    <div className="pt-2 border-t border-gray-100">
                                        {report.status === 'pending' && (
                                            <button
                                                onClick={() => handleMaintenance(report._id, false)}
                                                disabled={actionLoading === report._id}
                                                className="w-full px-3 py-2 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {actionLoading === report._id ? (
                                                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (
                                                    <><FaWrench /> ดำเนินการซ่อม</>
                                                )}
                                            </button>
                                        )}
                                        {report.status === 'in_progress' && (
                                            <button
                                                onClick={() => setConfirmResolve(report._id)}
                                                disabled={actionLoading === report._id}
                                                className="w-full px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {actionLoading === report._id ? (
                                                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (
                                                    <><FaCheck /> ซ่อมเสร็จแล้ว</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-gray-400">
                            {isHistory ? (
                                <>
                                    <FaHistory className="text-4xl text-gray-200 mx-auto mb-3" />
                                    <p>ยังไม่มีประวัติการแจ้งซ่อม</p>
                                </>
                            ) : (
                                <>
                                    <FaCheckCircle className="text-4xl text-green-100 mx-auto mb-3" />
                                    <p>ยังไม่มีรายการแจ้งซ่อม</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
                </>
            )}

            {/* Confirm Resolve Modal */}
            {confirmResolve && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmResolve(null)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <FaCheckCircle className="text-green-500 text-2xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันซ่อมเสร็จแล้ว?</h3>
                            <p className="text-sm text-gray-500 mb-6">ซ่อมเสร็จเรียบร้อยแล้ว พร้อมเปิดการใช้งานห้องเป็นปกติ</p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirmResolve(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => {
                                        handleMaintenance(confirmResolve, true);
                                        setConfirmResolve(null);
                                    }}
                                    disabled={actionLoading === confirmResolve}
                                    className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading === confirmResolve ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <><FaCheck /> ยืนยัน</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
