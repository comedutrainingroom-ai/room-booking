import { useMemo } from 'react';
import { FaChartBar } from 'react-icons/fa';

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

        return {
            thisYear: thisYearBookings.length,
            lastYear: lastYearBookings.length,
            approved: thisYearBookings.filter(b => b.status === 'approved').length,
            rejected: thisYearBookings.filter(b => b.status === 'rejected').length,
            monthlyCount,
            maxMonthly
        };
    }, [bookings, currentYear]);

    const growth = yearlyData.lastYear > 0
        ? Math.round(((yearlyData.thisYear - yearlyData.lastYear) / yearlyData.lastYear) * 100)
        : yearlyData.thisYear > 0 ? 100 : 0;

    const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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

            {/* Approval Rate */}
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">อัตราอนุมัติ</span>
                    <span className="font-bold text-gray-800">
                        {yearlyData.thisYear > 0 ? Math.round((yearlyData.approved / yearlyData.thisYear) * 100) : 0}%
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${yearlyData.thisYear > 0 ? (yearlyData.approved / yearlyData.thisYear) * 100 : 0}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default YearlyStats;
