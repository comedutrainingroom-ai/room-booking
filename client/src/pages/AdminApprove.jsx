import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { FaCheck, FaTimes, FaCalendarAlt, FaClock, FaUser, FaBuilding, FaEdit, FaSave, FaBan, FaFilter } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const AdminApprove = () => {
    const toast = useToast();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingBooking, setEditingBooking] = useState(null);
    const [editForm, setEditForm] = useState({ startTime: '', endTime: '' });
    const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'all'

    const fetchBookings = useCallback(async () => {
        try {
            const res = await api.get('/bookings');
            let filteredBookings = res.data.data;

            // Filter based on selected filter
            if (filter === 'pending') {
                filteredBookings = filteredBookings.filter(b => b.status === 'pending');
            } else if (filter === 'approved') {
                filteredBookings = filteredBookings.filter(b => b.status === 'approved');
            } else if (filter === 'all') {
                filteredBookings = filteredBookings.filter(b => b.status !== 'rejected');
            }

            // Only show future bookings (endTime > now)
            const now = new Date();
            filteredBookings = filteredBookings.filter(b => new Date(b.endTime) > now);

            filteredBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            setBookings(filteredBookings);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bookings", error);
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleApprove = useCallback(async (id) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันการอนุมัติ',
            message: 'ยืนยันการอนุมัติการจองนี้?',
            type: 'info'
        });
        if (!confirmed) return;

        // Optimistic update
        setBookings(prev => {
            if (filter === 'pending') {
                return prev.filter(b => b._id !== id);
            }
            return prev.map(b => b._id === id ? { ...b, status: 'approved' } : b);
        });
        toast.success('อนุมัติการจองเรียบร้อยแล้ว');

        try {
            await api.put(`/bookings/${id}`, { status: 'approved' });
        } catch (error) {
            console.error("Error approving booking", error);
            toast.error('เกิดข้อผิดพลาดในการอนุมัติ');
            fetchBookings(); // Revert
        }
    }, [toast, filter, fetchBookings]);

    const handleReject = useCallback(async (id) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันการไม่อนุมัติ',
            message: 'ยืนยันการไม่อนุมัติการจองนี้?',
            type: 'danger'
        });
        if (!confirmed) return;

        // Optimistic update - Always remove as rejected are hidden in all views
        setBookings(prev => prev.filter(b => b._id !== id));
        toast.success('ไม่อนุมัติการจองแล้ว');

        try {
            await api.put(`/bookings/${id}`, { status: 'rejected' });
        } catch (error) {
            console.error("Error rejecting booking", error);
            toast.error('เกิดข้อผิดพลาดในการไม่อนุมัติ');
            fetchBookings(); // Revert
        }
    }, [toast, fetchBookings]);

    const handleCancel = useCallback(async (id) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันการยกเลิก',
            message: 'การจองที่ถูกยกเลิกจะหายไปจากปฏิทิน',
            type: 'danger'
        });
        if (!confirmed) return;

        // Optimistic update
        setBookings(prev => {
            if (filter === 'approved') {
                return prev.filter(b => b._id !== id);
            }
            return prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b);
        });
        toast.success('ยกเลิกการจองเรียบร้อยแล้ว');

        try {
            await api.put(`/bookings/${id}`, { status: 'cancelled' });
        } catch (error) {
            console.error("Error cancelling booking", error);
            toast.error('เกิดข้อผิดพลาดในการยกเลิก');
            fetchBookings(); // Revert
        }
    }, [toast, filter, fetchBookings]);

    const openEditModal = useCallback((booking) => {
        setEditingBooking(booking);
        const formatForInput = (dateStr) => {
            const d = new Date(dateStr);
            return d.toISOString().slice(0, 16);
        };
        setEditForm({
            startTime: formatForInput(booking.startTime),
            endTime: formatForInput(booking.endTime)
        });
    }, []);

    const handleEditSave = useCallback(async () => {
        if (!editingBooking) return;
        try {
            await api.put(`/bookings/${editingBooking._id}`, {
                startTime: new Date(editForm.startTime).toISOString(),
                endTime: new Date(editForm.endTime).toISOString()
            });
            toast.success('แก้ไขเวลาเรียบร้อยแล้ว ระบบจะส่งอีเมลแจ้งผู้จอง');
            setEditingBooking(null);
            fetchBookings();
        } catch (error) {
            console.error("Error updating booking time", error);
            toast.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.error || error.message));
        }
    }, [editingBooking, editForm, toast, fetchBookings]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-bold">รออนุมัติ</span>;
            case 'approved':
                return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">อนุมัติแล้ว</span>;
            case 'cancelled':
                return <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-bold">ยกเลิกแล้ว</span>;
            default:
                return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full font-bold">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaCalendarAlt className="text-primary" /> จัดการคำขอจอง
                </h1>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'pending' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        รออนุมัติ
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'approved' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        อนุมัติแล้ว
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        ทั้งหมด
                    </button>
                </div>
            </div>

            {bookings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="text-gray-300 text-6xl mb-4 flex justify-center">
                        <FaCheck />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                        {filter === 'pending' ? 'ไม่มีคำขอที่รออนุมัติ' : 'ไม่มีรายการ'}
                    </h3>
                    <p className="text-gray-500">
                        {filter === 'pending' ? 'คำขอจองทั้งหมดได้รับการจัดการเรียบร้อยแล้ว' : 'ไม่พบรายการในหมวดนี้'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
                            <div className="flex-grow space-y-3">
                                <div className="flex items-start justify-between">
                                    <h3 className="text-lg font-bold text-gray-800">{booking.topic}</h3>
                                    {getStatusBadge(booking.status)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <FaBuilding className="text-gray-400" />
                                        <span>ห้อง: <span className="font-medium text-gray-800">{booking.room?.name || 'Unknown Room'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaUser className="text-gray-400" />
                                        <span>ผู้จอง: <span className="font-medium text-gray-800">{booking.user?.name}</span> ({booking.user?.department || '-'})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-gray-400" />
                                        <span>วันที่: <span className="font-medium text-gray-800">
                                            {new Date(booking.startTime).toLocaleDateString('th-TH', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaClock className="text-gray-400" />
                                        <span>เวลา: <span className="font-medium text-gray-800">
                                            {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                        </span></span>
                                    </div>
                                </div>

                                {booking.note && (
                                    <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 mt-2">
                                        <span className="font-bold text-gray-700 block mb-1">รายละเอียดเพิ่มเติม:</span>
                                        <p className="text-gray-600">{booking.note}</p>
                                    </div>
                                )}

                                {booking.user?.phone && (
                                    <div className="text-sm text-gray-500">
                                        เบอร์โทร: {booking.user.phone}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                                {booking.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(booking._id)}
                                            className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition font-medium flex items-center justify-center gap-2"
                                        >
                                            <FaCheck /> อนุมัติ
                                        </button>
                                        <button
                                            onClick={() => openEditModal(booking)}
                                            className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-medium flex items-center justify-center gap-2"
                                        >
                                            <FaEdit /> แก้ไขเวลา
                                        </button>
                                        <button
                                            onClick={() => handleReject(booking._id)}
                                            className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-medium flex items-center justify-center gap-2"
                                        >
                                            <FaTimes /> ปฏิเสธ
                                        </button>
                                    </>
                                )}
                                {booking.status === 'approved' && (
                                    <>
                                        <button
                                            onClick={() => openEditModal(booking)}
                                            className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-medium flex items-center justify-center gap-2"
                                        >
                                            <FaEdit /> แก้ไขเวลา
                                        </button>
                                        <button
                                            onClick={() => handleCancel(booking._id)}
                                            className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-medium flex items-center justify-center gap-2"
                                        >
                                            <FaBan /> ยกเลิกการจอง
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Time Modal */}
            {editingBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FaEdit className="text-blue-500" /> แก้ไขเวลาจอง
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            หัวข้อ: <span className="font-medium text-gray-700">{editingBooking.topic}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">เวลาเริ่มต้น</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.startTime}
                                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">เวลาสิ้นสุด</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.endTime}
                                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingBooking(null)}
                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium flex items-center justify-center gap-2"
                            >
                                <FaSave /> บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApprove;
