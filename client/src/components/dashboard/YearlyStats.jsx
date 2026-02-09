import { useMemo } from 'react';
import { FaChartBar } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#6b7280'];

const YearlyStats = ({ bookings }) => {
    const currentYear = new Date().getFullYear();

    // Calculate yearly data
    const yearlyData = useMemo(() => {
        const thisYearBookings = bookings.filter(b => new Date(b.startTime).getFullYear() === currentYear);
        const lastYearBookings = bookings.filter(b => new Date(b.startTime).getFullYear() === currentYear - 1);

        // Monthly breakdown
        const monthlyCount = Array(12).fill(0);
        thisYearBookings.forEach(b => {
            const month = new Date(b.startTime).getMonth();
            monthlyCount[month]++;
        });

        const maxMonthly = Math.max(...monthlyCount, 1);

        // Status counts
        const approved = thisYearBookings.filter(b => b.status === 'approved').length;
        const rejected = thisYearBookings.filter(b => b.status === 'rejected').length;
        const cancelled = thisYearBookings.filter(b => b.status === 'cancelled').length;

        return {
            thisYear: thisYearBookings.length,
            lastYear: lastYearBookings.length,
            approved,
            rejected,
            cancelled,
            monthlyCount,
            maxMonthly
        };
    }, [bookings, currentYear]);

    const growth = yearlyData.lastYear > 0
        ? Math.round(((yearlyData.thisYear - yearlyData.lastYear) / yearlyData.lastYear) * 100)
        : yearlyData.thisYear > 0 ? 100 : 0;

    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Pie chart data
    const statusData = [
        { name: 'อนุมัติ', value: yearlyData.approved },
        { name: 'ปฏิเสธ', value: yearlyData.rejected },
        { name: 'ยกเลิก', value: yearlyData.cancelled }
    ].filter(item => item.value > 0);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-500">
                    <FaChartBar />
                </div>
                <h3 className="font-bold text-gray-800">สรุปรายปี</h3>
                <span className="text-xs text-gray-400 ml-auto">
                    ปี {currentYear + 543}
                </span>
            </div>

            {/* Stats */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <div className="text-4xl font-bold text-gray-800">{yearlyData.thisYear}</div>
                    <div className="text-sm text-gray-500">การจองปีนี้</div>
                </div>
                <div className="text-right">
                    <div className={`text-sm font-bold px-2 py-1 rounded inline-block ${growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">เทียบกับปีที่แล้ว ({yearlyData.lastYear})</div>
                </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="border-t border-gray-100 pt-4">
                <div className="flex items-end gap-1 h-20">
                    {yearlyData.monthlyCount.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                            <div
                                className="w-full bg-purple-200 hover:bg-purple-400 transition-colors rounded-t"
                                style={{ height: `${(count / yearlyData.maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                title={`${thaiMonthsShort[i]}: ${count} รายการ`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    {thaiMonthsShort.map((m, i) => (
                        <span key={i} className="flex-1 text-center" style={{ fontSize: '9px' }}>
                            {i % 2 === 0 ? m : ''}
                        </span>
                    ))}
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
            {statusData.length === 0 && yearlyData.thisYear === 0 && (
                <div className="mt-4 bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                    ยังไม่มีข้อมูลการจองในปีนี้
                </div>
            )}
        </div>
    );
};

export default YearlyStats;
