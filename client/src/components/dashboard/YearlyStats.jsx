import { useMemo } from 'react';
import { FaChartLine, FaClock, FaCalendarCheck } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#ef4444', '#9ca3af']; // Purple, Red, Gray

const YearlyStats = ({ bookings }) => {
    const currentYear = new Date().getFullYear();

    const yearlyData = useMemo(() => {
        const thisYearBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected' && new Date(b.startTime).getFullYear() === currentYear);
        const allThisYearBookings = bookings.filter(b => new Date(b.startTime).getFullYear() === currentYear);

        const monthlyCount = Array(12).fill(0);
        let totalDurationMs = 0;

        thisYearBookings.forEach(b => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const month = start.getMonth();
            monthlyCount[month]++;
            totalDurationMs += (end - start);
        });

        const totalHours = Math.round(totalDurationMs / (1000 * 60 * 60));
        const maxMonthly = Math.max(...monthlyCount, 0);
        const peakMonthIndex = monthlyCount.indexOf(maxMonthly);

        const chartData = monthlyCount.map((count, index) => ({
            name: new Date(currentYear, index).toLocaleDateString('th-TH', { month: 'short' }),
            bookings: count
        }));

        // Status counts for Pie Chart
        const approved = allThisYearBookings.filter(b => b.status === 'approved').length;
        const rejected = allThisYearBookings.filter(b => b.status === 'rejected').length;
        const cancelled = allThisYearBookings.filter(b => b.status === 'cancelled').length;

        return {
            totalBookings: thisYearBookings.length,
            totalHours,
            peakMonthIndex,
            maxMonthly,
            chartData,
            approved,
            rejected,
            cancelled
        };
    }, [bookings, currentYear]);

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    // Pie chart data
    const statusData = [
        { name: 'อนุมัติ', value: yearlyData.approved },
        { name: 'ปฏิเสธ', value: yearlyData.rejected },
        { name: 'ยกเลิก', value: yearlyData.cancelled }
    ].filter(item => item.value > 0);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                    <p className="text-xs text-purple-600 font-medium">
                        {payload[0].value} การจอง
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                        <FaChartLine />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">สรุปรายปี</h3>
                        <p className="text-xs text-gray-400 font-medium">ปี {currentYear + 543}</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Total Hours */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                        <FaClock className="text-xs" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">เวลาใช้งานรวม</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">{yearlyData.totalHours.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 font-medium">ชม.</span>
                    </div>
                </div>

                {/* Peak Month */}
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                        <FaCalendarCheck className="text-xs" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">เดือนพีคสุด</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 truncate">
                            {yearlyData.totalBookings > 0 ? thaiMonths[yearlyData.peakMonthIndex] : '-'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                            {yearlyData.totalBookings > 0 ? `${yearlyData.maxMonthly} การจอง` : 'ไม่มีข้อมูล'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Area Chart */}
            <div className="flex-1 w-full min-h-[180px] mb-6">
                <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <AreaChart data={yearlyData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval={1}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="bookings"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorBookings)"
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Status Pie Chart */}
            {statusData.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">สัดส่วนสถานะการจอง</div>
                    <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
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
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px' }}
                                    formatter={(value, entry) => `${value} (${entry.payload.value})`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YearlyStats;
