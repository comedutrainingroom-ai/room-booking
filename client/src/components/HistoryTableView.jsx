import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaBan, FaEnvelope } from 'react-icons/fa';

const HistoryTableView = ({ bookings, onCancel, settings, isAdmin }) => {

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">#</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">หัวข้อ</th>
                            {isAdmin && <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">ผู้จอง</th>}
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">ห้อง</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">วันที่</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">เวลา</th>
                            <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">สถานะ</th>
                            {!isAdmin && <th className="text-left py-4 px-6 font-bold text-gray-600 text-sm">จัดการ</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((booking, index) => (
                            <tr
                                key={booking._id}
                                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                            >
                                <td className="py-4 px-6 text-gray-400 font-medium">{index + 1}</td>
                                <td className="py-4 px-6">
                                    <div className="font-bold text-gray-800 group-hover:text-primary transition-colors">
                                        {booking.topic}
                                    </div>
                                    {booking.note && (
                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]">
                                            {booking.note}
                                        </div>
                                    )}
                                </td>
                                {isAdmin && (
                                    <td className="py-4 px-6">
                                        <div className="font-medium text-gray-800">{booking.user?.name || '-'}</div>
                                        {booking.user?.department && (
                                            <div className="text-xs text-blue-600">{booking.user.department}</div>
                                        )}
                                    </td>
                                )}
                                <td className="py-4 px-6">
                                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-lg text-sm font-medium">
                                        {booking.room?.name || '-'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-gray-600">
                                    <div className="font-medium">
                                        {new Date(booking.startTime).toLocaleDateString('th-TH', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(booking.startTime).toLocaleDateString('th-TH', { weekday: 'long' })}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-gray-600 font-medium">
                                    {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    <span className="text-gray-300 mx-1">-</span>
                                    {new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-4 px-6">
                                    {getStatusBadge(booking.status)}
                                </td>
                                {!isAdmin && (
                                    <td className="py-4 px-6">
                                        {booking.status === 'pending' && (
                                            <button
                                                onClick={() => onCancel(booking._id)}
                                                className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition text-xs font-medium"
                                            >
                                                <FaBan /> ยกเลิก
                                            </button>
                                        )}
                                        {booking.status === 'approved' && (
                                            <a
                                                href={`mailto:${settings?.contactEmail || 'admin@email.com'}`}
                                                className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition text-xs font-medium"
                                            >
                                                <FaEnvelope /> ติดต่อ
                                            </a>
                                        )}
                                        {(booking.status === 'cancelled' || booking.status === 'rejected') && (
                                            <span className="text-gray-300 text-xs">-</span>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {bookings.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                    ไม่พบข้อมูลการจอง
                </div>
            )}

            {/* Table Footer */}
            {bookings.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
                    แสดง {bookings.length} รายการ
                </div>
            )}
        </div>
    );
};

const getStatusBadge = (status) => {
    const styles = {
        approved: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        cancelled: 'bg-red-100 text-red-700',
        rejected: 'bg-red-100 text-red-700'
    };
    const icons = {
        approved: <FaCheckCircle />,
        pending: <FaHourglassHalf />,
        cancelled: <FaBan />,
        rejected: <FaTimesCircle />
    };
    const labels = {
        approved: 'อนุมัติ',
        pending: 'รออนุมัติ',
        cancelled: 'ยกเลิก',
        rejected: 'ปฏิเสธ'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {icons[status]} {labels[status] || status}
        </span>
    );
};

export default HistoryTableView;

