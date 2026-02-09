import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaExclamationTriangle, FaTools, FaBuilding, FaClock, FaCheckCircle, FaSearch, FaWrench, FaCheck } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const toast = useToast();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/reports');
            if (res.data.success) {
                setReports(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch reports", error);
        }
        setLoading(false);
    };

    const handleMaintenance = async (reportId, isActive) => {
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
    };

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
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">🔧 กำลังซ่อม</span>;
            case 'resolved':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">✅ ซ่อมเสร็จ</span>;
            case 'rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">❌ ปฏิเสธ</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">⏳ รอดำเนินการ</span>;
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

    const filteredReports = reports.filter(report =>
        report.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.room?.name || 'Common Area').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.reporter?.name || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full h-full px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">วันที่แจ้ง</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ความเร่งด่วน</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ห้อง/สถานที่</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">หัวข้อปัญหา</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้แจ้ง</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <FaClock className="text-gray-400" />
                                                    {formatDate(report.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {getUrgencyBadge(report.urgency)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
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
                                            <td className="px-4 py-4 text-sm text-gray-800">
                                                <div className="font-bold mb-0.5">{report.topic}</div>
                                                <div className="text-gray-500 text-xs truncate max-w-xs">{report.description}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
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
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {getStatusBadge(report.status)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                {report.room ? (
                                                    <div className="flex gap-2 justify-center">
                                                        {report.status !== 'in_progress' ? (
                                                            <button
                                                                onClick={() => handleMaintenance(report._id, false)}
                                                                disabled={actionLoading === report._id}
                                                                className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                {actionLoading === report._id ? (
                                                                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                                ) : (
                                                                    <><FaWrench /> กำลังซ่อม</>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleMaintenance(report._id, true)}
                                                                disabled={actionLoading === report._id}
                                                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                {actionLoading === report._id ? (
                                                                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                                ) : (
                                                                    <><FaCheck /> ซ่อมเสร็จ</>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <FaCheckCircle className="text-4xl text-green-100" />
                                                <p>ยังไม่มีรายการแจ้งซ่อม</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
