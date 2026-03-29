import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaBan, FaEnvelope } from 'react-icons/fa';
import { getBookingStatusLabel } from '../utils/bookingStatus';

const HistoryTableView = ({ bookings, onCancel, settings, isAdmin }) => {

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                                    {booking.cancellationReason && (
                                        <div className="mt-1 max-w-[240px] truncate text-xs font-medium text-red-600">
                                            เหตุผลการยกเลิก: {booking.cancellationReason}
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
                                    {getStatusBadge(booking)}
                                </td>
                                {!isAdmin && (
                                    <td className="py-4 px-6">
                                        {booking.status === 'pending' && (
                                            <button
                                                onClick={() => onCancel(booking)}
                                                className="inline-flex w-[148px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold leading-none text-red-600 transition hover:bg-red-100"
                                            >
                                                <FaBan /> ยกเลิก
                                            </button>
                                        )}
                                        {booking.status === 'approved' && (
                                            <a
                                                href={`mailto:${settings?.contactEmail || 'admin@email.com'}`}
                                                className="inline-flex w-[148px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold leading-none text-primary transition hover:bg-primary/20"
                                            >
                                                <FaEnvelope /> ติดต่อ
                                            </a>
                                        )}
                                        {booking.status === 'cancelled' && (
                                            <div className="inline-flex w-[148px] items-center justify-center whitespace-nowrap rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold leading-none text-red-600">
                                                <span>ทำการยกเลิกแล้ว</span>
                                            </div>
                                        )}
                                        {booking.status === 'rejected' && (
                                            <div className="inline-flex w-[148px] flex-col rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                                                <span className="text-[11px] font-semibold text-gray-600">รายการสิ้นสุดแล้ว</span>
                                                <span className="mt-0.5 text-[10px] text-gray-400">ไม่สามารถดำเนินการต่อได้</span>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
                {bookings.map((booking) => (
                    <div key={booking._id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <div className="font-bold text-gray-800 text-sm mb-0.5">{booking.topic}</div>
                                {booking.note && <div className="text-xs text-gray-500 line-clamp-1">{booking.note}</div>}
                                {booking.cancellationReason && (
                                    <div className="mt-1 text-xs font-medium text-red-600 line-clamp-2">
                                        เหตุผลการยกเลิก: {booking.cancellationReason}
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0">{getStatusBadge(booking)}</div>
                        </div>

                        {isAdmin && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <div className="font-medium text-gray-800">{booking.user?.name || '-'}</div>
                                {booking.user?.department && (
                                    <>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-blue-600">{booking.user.department}</span>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <div className="text-gray-500 mb-1">ห้อง</div>
                                <div className="font-medium text-primary">{booking.room?.name || '-'}</div>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <div className="text-gray-500 mb-1">เวลา</div>
                                <div className="font-medium text-gray-800">
                                    {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                            <div>
                                {new Date(booking.startTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>

                            {!isAdmin && (
                                <div className="flex gap-2">
                                    {booking.status === 'pending' && (
                                        <button
                                            onClick={() => onCancel(booking)}
                                            className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-medium"
                                        >
                                            <FaBan /> ยกเลิก
                                        </button>
                                    )}
                                    {booking.status === 'approved' && (
                                        <a
                                            href={`mailto:${settings?.contactEmail || 'admin@email.com'}`}
                                            className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition font-medium"
                                        >
                                            <FaEnvelope /> ติดต่อ
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
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

const getStatusBadge = (booking) => {
    const status = booking?.status;
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

    return (
        <span className={`inline-flex w-[152px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {icons[status]} {getBookingStatusLabel(booking)}
        </span>
    );
};

export default HistoryTableView;

