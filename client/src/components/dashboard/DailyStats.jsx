import { FaSun, FaCheckCircle, FaHourglassHalf, FaTimesCircle, FaBan } from 'react-icons/fa';

const DailyStats = ({ bookings }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);

    // Filter today's bookings
    const todayBookings = bookings.filter(b => {
        const start = new Date(b.startTime);
        return start >= today && start < tomorrow;
    });

    const approved = todayBookings.filter(b => b.status === 'approved').length;
    const pending = todayBookings.filter(b => b.status === 'pending').length;
    const cancelled = todayBookings.filter(b => b.status === 'cancelled').length;
    const rejected = todayBookings.filter(b => b.status === 'rejected').length;

    // Group by hour for timeline
    const hourlyData = {};
    todayBookings.forEach(b => {
        const hour = new Date(b.startTime).getHours();
        if (!hourlyData[hour]) hourlyData[hour] = [];
        hourlyData[hour].push(b);
    });

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-500">
                    <FaSun />
                </div>
                <h3 className="font-bold text-gray-800">สรุปวันนี้</h3>
                <span className="text-xs text-gray-400 ml-auto">
                    {today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-green-50 rounded-xl p-2 text-center">
                    <FaCheckCircle className="text-green-500 mx-auto mb-1 text-sm" />
                    <div className="text-xl font-bold text-green-700">{approved}</div>
                    <div className="text-xs text-green-600">อนุมัติ</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-2 text-center">
                    <FaHourglassHalf className="text-yellow-500 mx-auto mb-1 text-sm" />
                    <div className="text-xl font-bold text-yellow-700">{pending}</div>
                    <div className="text-xs text-yellow-600">รอ</div>
                </div>
                <div className="bg-gray-100 rounded-xl p-2 text-center">
                    <FaBan className="text-gray-500 mx-auto mb-1 text-sm" />
                    <div className="text-xl font-bold text-gray-700">{cancelled}</div>
                    <div className="text-xs text-gray-600">ยกเลิก</div>
                </div>
                <div className="bg-red-50 rounded-xl p-2 text-center">
                    <FaTimesCircle className="text-red-500 mx-auto mb-1 text-sm" />
                    <div className="text-xl font-bold text-red-700">{rejected}</div>
                    <div className="text-xs text-red-600">ปฏิเสธ</div>
                </div>
            </div>

            {/* Today's Timeline */}
            <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">กำหนดการวันนี้</h4>
                {todayBookings.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">ไม่มีการจองวันนี้</p>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {todayBookings.slice(0, 5).map(booking => (
                            <div key={booking._id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-50">
                                <span className="text-gray-500 font-mono">
                                    {new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="font-medium text-gray-700 truncate flex-1">{booking.topic}</span>
                                <span className={`w-2 h-2 rounded-full ${booking.status === 'approved' ? 'bg-green-500' : booking.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyStats;
