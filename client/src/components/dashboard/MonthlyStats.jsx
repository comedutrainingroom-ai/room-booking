import { useMemo } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#6b7280'];

const MonthlyStats = ({ bookings }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate monthly data
    const monthlyData = useMemo(() => {
        const thisMonthBookings = bookings.filter(b => {
            const d = new Date(b.startTime);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthBookings = bookings.filter(b => {
            const d = new Date(b.startTime);
            return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
        });

        // Daily breakdown for current month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyCount = Array(daysInMonth).fill(0);
        thisMonthBookings.forEach(b => {
            const day = new Date(b.startTime).getDate() - 1;
            if (day >= 0 && day < daysInMonth) dailyCount[day]++;
        });

        const maxDaily = Math.max(...dailyCount, 1);

        // Status counts
        const approved = thisMonthBookings.filter(b => b.status === 'approved').length;
        const rejected = thisMonthBookings.filter(b => b.status === 'rejected').length;
        const cancelled = thisMonthBookings.filter(b => b.status === 'cancelled').length;

        return {
            thisMonth: thisMonthBookings.length,
            lastMonth: lastMonthBookings.length,
            approved,
            rejected,
            cancelled,
            dailyCount,
            maxDaily
        };
    }, [bookings, currentMonth, currentYear]);

    const growth = monthlyData.lastMonth > 0
        ? Math.round(((monthlyData.thisMonth - monthlyData.lastMonth) / monthlyData.lastMonth) * 100)
        : monthlyData.thisMonth > 0 ? 100 : 0;

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    // Pie chart data
    const statusData = [
        { name: 'อนุมัติ', value: monthlyData.approved },
        { name: 'ปฏิเสธ', value: monthlyData.rejected },
        { name: 'ยกเลิก', value: monthlyData.cancelled }
    ].filter(item => item.value > 0);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                    <FaCalendarAlt />
                </div>
                <h3 className="font-bold text-gray-800">สรุปรายเดือน</h3>
                <span className="text-xs text-gray-400 ml-auto">
                    {thaiMonths[currentMonth]} {currentYear + 543}
                </span>
            </div>

            {/* Stats */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <div className="text-4xl font-bold text-gray-800">{monthlyData.thisMonth}</div>
                    <div className="text-sm text-gray-500">การจองเดือนนี้</div>
                </div>
                <div className={`text-sm font-bold px-2 py-1 rounded ${growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                </div>
            </div>

            {/* Mini Bar Chart */}
            <div className="border-t border-gray-100 pt-4">
                <div className="flex items-end gap-0.5 h-16">
                    {monthlyData.dailyCount.map((count, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                            style={{ height: `${(count / monthlyData.maxDaily) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                            title={`วันที่ ${i + 1}: ${count} รายการ`}
                        />
                    ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>{monthlyData.dailyCount.length}</span>
                </div>
            </div>

            {/* Status Pie Chart */}
            {statusData.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">สถานะการจอง</div>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={55}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} รายการ`, '']} />
                            <Legend
                                iconSize={10}
                                wrapperStyle={{ fontSize: '12px' }}
                                formatter={(value, entry) => `${value} (${entry.payload.value})`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* No data state */}
            {statusData.length === 0 && monthlyData.thisMonth === 0 && (
                <div className="mt-4 bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                    ยังไม่มีข้อมูลการจองในเดือนนี้
                </div>
            )}
        </div>
    );
};

export default MonthlyStats;
