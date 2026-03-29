import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import {
    FaTools,
    FaBuilding,
    FaClock,
    FaCheckCircle,
    FaSearch,
    FaWrench,
    FaCheck,
    FaHistory,
    FaBan
} from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const ACTIVE_REPORT_STATUSES = ['pending', 'in_progress'];
const HISTORY_REPORT_STATUSES = ['resolved', 'rejected'];

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const toast = useToast();

    const fetchReports = useCallback(async () => {
        try {
            const res = await api.get('/reports');
            if (res.data.success) {
                setReports(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleUpdateStatus = useCallback(async (reportId, status, successMessage) => {
        setActionLoading(reportId);
        try {
            const res = await api.put(`/reports/${reportId}/status`, { status });
            if (res.data.success) {
                toast.success(successMessage);
                fetchReports();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    }, [fetchReports, toast]);

    const handleStartRepair = useCallback((reportId) => {
        handleUpdateStatus(reportId, 'in_progress', 'อัปเดตสถานะเป็นดำเนินการซ่อมแล้ว');
    }, [handleUpdateStatus]);

    const handleResolveReport = useCallback(async (reportId) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันปรับปรุงเสร็จแล้ว',
            message: 'รายการนี้จะถูกย้ายไปยังประวัติการแจ้งซ่อม',
            type: 'info'
        });

        if (!confirmed) {
            return;
        }

        await handleUpdateStatus(reportId, 'resolved', 'บันทึกสถานะเป็นซ่อมเสร็จแล้ว');
    }, [handleUpdateStatus, toast]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'in_progress':
                return (
                    <span className="flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                        <FaWrench />
                        ดำเนินการซ่อม
                    </span>
                );
            case 'resolved':
                return (
                    <span className="flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        <FaCheckCircle />
                        ซ่อมเสร็จแล้ว
                    </span>
                );
            case 'rejected':
                return (
                    <span className="flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                        <FaBan />
                        ปฏิเสธ
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="flex w-fit items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                        <FaClock />
                        รอดำเนินการ
                    </span>
                );
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const activeReportsCount = useMemo(() => (
        reports.filter((report) => ACTIVE_REPORT_STATUSES.includes(report.status)).length
    ), [reports]);

    const historyReportsCount = useMemo(() => (
        reports.filter((report) => HISTORY_REPORT_STATUSES.includes(report.status)).length
    ), [reports]);

    const filteredReports = useMemo(() => {
        const statusPool = activeTab === 'active' ? ACTIVE_REPORT_STATUSES : HISTORY_REPORT_STATUSES;
        let filtered = reports.filter((report) => statusPool.includes(report.status));

        if (searchTerm.trim()) {
            const query = searchTerm.trim().toLowerCase();
            filtered = filtered.filter((report) =>
                report.topic.toLowerCase().includes(query) ||
                report.description.toLowerCase().includes(query) ||
                (report.room?.name || 'พื้นที่ส่วนกลาง').toLowerCase().includes(query) ||
                (report.reporter?.name || 'unknown').toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [activeTab, reports, searchTerm]);

    const isHistory = activeTab === 'history';

    const renderActionButton = (report, fullWidth = false) => {
        const baseClass = fullWidth
            ? 'w-full justify-center'
            : '';

        if (report.status === 'pending') {
            return (
                <button
                    onClick={() => handleStartRepair(report._id)}
                    disabled={actionLoading === report._id}
                    className={`flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 ${baseClass}`}
                    title="เปลี่ยนสถานะเป็นดำเนินการซ่อม"
                >
                    {actionLoading === report._id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <>
                            <FaWrench />
                            ปรับปรุง
                        </>
                    )}
                </button>
            );
        }

        if (report.status === 'in_progress') {
            return (
                <button
                    onClick={() => handleResolveReport(report._id)}
                    disabled={actionLoading === report._id}
                    className={`flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 ${baseClass}`}
                    title="บันทึกสถานะซ่อมเสร็จแล้ว"
                >
                    {actionLoading === report._id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <>
                            <FaCheck />
                            ปรับปรุงเสร็จแล้ว
                        </>
                    )}
                </button>
            );
        }

        return <span className="text-xs text-gray-400">-</span>;
    };

    return (
        <div className="h-full w-full px-0 py-6 sm:px-4 sm:py-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">
                        จัดการแจ้งซ่อม
                    </h1>
                    <p className="mt-1 text-xs text-gray-400 md:text-base">
                        รายการแจ้งปัญหาทั้งหมดจากผู้ใช้งาน
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="ค้นหา (หัวข้อ, ห้อง, ผู้แจ้ง)..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                </div>
            </div>

            <div className="mb-6 flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'active'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaTools className={`text-xs ${activeTab === 'active' ? 'text-red-500' : ''}`} />
                    รายการแจ้งซ่อม
                    {activeReportsCount > 0 && (
                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                            activeTab === 'active' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {activeReportsCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'history'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaHistory className={`text-xs ${activeTab === 'history' ? 'text-green-500' : ''}`} />
                    ประวัติการแจ้งซ่อม
                    {historyReportsCount > 0 && (
                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                            activeTab === 'history' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {historyReportsCount}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-green-500" />
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed text-left">
                                <thead className="border-b border-gray-100 bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: isHistory ? '18%' : '16%' }}>วันที่แจ้ง</th>
                                        <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: isHistory ? '15%' : '14%' }}>ห้อง/สถานที่</th>
                                        <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: isHistory ? '30%' : '26%' }}>หัวข้อปัญหา</th>
                                        <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: isHistory ? '20%' : '18%' }}>ผู้แจ้ง</th>
                                        <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: isHistory ? '17%' : '14%' }}>สถานะ</th>
                                        {!isHistory && (
                                            <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500" style={{ width: '12%' }}>จัดการ</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredReports.length > 0 ? (
                                        filteredReports.map((report) => (
                                            <tr key={report._id} className="transition-colors hover:bg-gray-50/50">
                                                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <FaClock className="text-gray-400" />
                                                        {formatDate(report.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <FaBuilding className="text-gray-400" />
                                                        <div>
                                                            {report.room ? report.room.name : <span className="italic text-gray-400">พื้นที่ส่วนกลาง</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-800">
                                                    <div className="mb-0.5 font-bold">{report.topic}</div>
                                                    <div className="max-w-xs truncate text-xs text-gray-500">{report.description}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
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
                                                <td className="whitespace-nowrap px-3 py-3">
                                                    {getStatusBadge(report.status)}
                                                </td>
                                                {!isHistory && (
                                                    <td className="whitespace-nowrap px-3 py-3 text-center">
                                                        <div className="flex min-w-[130px] justify-center gap-2">
                                                            {renderActionButton(report)}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={isHistory ? 5 : 6} className="px-6 py-12 text-center text-gray-400">
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

                    <div className="space-y-3 md:hidden">
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report) => (
                                <div key={report._id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getStatusBadge(report.status)}
                                        </div>
                                        <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-gray-400">
                                            <FaClock className="text-[8px]" />
                                            {formatDate(report.createdAt)}
                                        </span>
                                    </div>

                                    <h3 className="mb-1 text-sm font-bold text-gray-800">{report.topic}</h3>
                                    <p className="mb-3 line-clamp-2 text-xs text-gray-500">{report.description}</p>

                                    <div className="mb-3 flex items-center gap-3 text-xs text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <FaBuilding className="text-[10px] text-gray-400" />
                                            {report.room ? report.room.name : 'พื้นที่ส่วนกลาง'}
                                        </span>
                                        <span className="text-gray-300">·</span>
                                        <span className="flex items-center gap-1">
                                            <div className="h-4 w-4 overflow-hidden rounded-full bg-gray-200">
                                                <img
                                                    src={report.reporter?.picture || `https://ui-avatars.com/api/?name=${report.reporter?.name || 'U'}&size=32`}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            {report.reporter?.name || 'Unknown'}
                                        </span>
                                    </div>

                                    {!isHistory && (
                                        <div className="border-t border-gray-100 pt-2">
                                            {renderActionButton(report, true)}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-400">
                                {isHistory ? (
                                    <>
                                        <FaHistory className="mx-auto mb-3 text-4xl text-gray-200" />
                                        <p>ยังไม่มีประวัติการแจ้งซ่อม</p>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle className="mx-auto mb-3 text-4xl text-green-100" />
                                        <p>ยังไม่มีรายการแจ้งซ่อม</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminReports;
