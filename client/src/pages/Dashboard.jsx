import {
    startTransition,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FiAlertCircle,
    FiArrowUpRight,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiFilter,
    FiPieChart,
    FiRefreshCw,
    FiSearch,
    FiUsers,
    FiXCircle
} from 'react-icons/fi';
import { FaFileExcel, FaFilePdf } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
    createDashboardExportReport,
    filterDashboardBookingsBySearch
} from '../services/dashboardReportBuilder';
import { getBookingStatusLabel } from '../utils/bookingStatus';

const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const PIE_COLORS = ['#0f766e', '#10b981', '#38bdf8', '#f59e0b', '#94a3b8'];

const STATUS_META = {
    approved: {
        label: 'อนุมัติแล้ว',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        icon: FiCheckCircle
    },
    pending: {
        label: 'รอตรวจสอบ',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-100',
        icon: FiClock
    },
    rejected: {
        label: 'ไม่อนุมัติ / ยกเลิก',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-100',
        icon: FiXCircle
    },
    cancelled: {
        label: 'ยกเลิกแล้ว',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-100',
        icon: FiXCircle
    }
};

const formatNumber = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

const formatShortDate = (value) => new Date(value).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const formatCreatedAt = (value) => new Date(value).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

const formatTimeRange = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return `${start.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    })} - ${end.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    })}`;
};

const getStatusGroup = (status) => (status === 'rejected' || status === 'cancelled' ? 'rejected' : status);
const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.rejected;

const getRoomName = (booking) => {
    if (booking?.room && typeof booking.room === 'object') {
        return booking.room.name || 'ไม่ระบุห้อง';
    }

    return 'ไม่ระบุห้อง';
};

const getBookingCode = (booking) => {
    const fallback = String(booking?._id || '').slice(-6).toUpperCase();
    return `BK-${fallback || '------'}`;
};

const getUserName = (booking) => booking?.user?.name || 'ไม่ทราบชื่อ';

const getUserInitial = (booking) => {
    const normalized = getUserName(booking).replace(/^คุณ/, '').trim();
    return normalized.charAt(0).toUpperCase() || '?';
};

const getRangeConfig = (timeFilter, now = new Date()) => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    if (timeFilter === 'day') {
        return {
            label: 'วันนี้',
            currentStart: new Date(year, month, date, 0, 0, 0, 0),
            currentEnd: new Date(year, month, date, 23, 59, 59, 999),
            previousStart: new Date(year, month, date - 1, 0, 0, 0, 0),
            previousEnd: new Date(year, month, date - 1, 23, 59, 59, 999)
        };
    }

    if (timeFilter === 'month') {
        const currentStart = new Date(year, month, 1, 0, 0, 0, 0);
        const currentEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        const previousStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const previousEnd = new Date(year, month, 0, 23, 59, 59, 999);

        return {
            label: new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(currentStart),
            currentStart,
            currentEnd,
            previousStart,
            previousEnd
        };
    }

    if (timeFilter === 'quarter') {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const quarterNumber = Math.floor(month / 3) + 1;

        return {
            label: `ไตรมาส ${quarterNumber}`,
            currentStart: new Date(year, quarterStartMonth, 1, 0, 0, 0, 0),
            currentEnd: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999),
            previousStart: new Date(year, quarterStartMonth - 3, 1, 0, 0, 0, 0),
            previousEnd: new Date(year, quarterStartMonth, 0, 23, 59, 59, 999)
        };
    }

    return {
        label: `ปี ${new Intl.DateTimeFormat('th-TH', { year: 'numeric' }).format(new Date(year, 0, 1))}`,
        currentStart: new Date(year, 0, 1, 0, 0, 0, 0),
        currentEnd: new Date(year, 11, 31, 23, 59, 59, 999),
        previousStart: new Date(year - 1, 0, 1, 0, 0, 0, 0),
        previousEnd: new Date(year - 1, 11, 31, 23, 59, 59, 999)
    };
};

const isDateInRange = (value, start, end) => {
    const target = new Date(value).getTime();
    return target >= start.getTime() && target <= end.getTime();
};

const countGroupedStatuses = (bookings) => bookings.reduce((summary, booking) => {
    const group = getStatusGroup(booking.status);
    summary.total += 1;
    summary[group] += 1;
    return summary;
}, { total: 0, approved: 0, pending: 0, rejected: 0 });

const createEmptyBucket = (label) => ({ label, approved: 0, pending: 0, rejected: 0 });
const addBookingToBucket = (bucket, booking) => {
    bucket[getStatusGroup(booking.status)] += 1;
};

const buildChartData = (bookings, timeFilter, rangeConfig) => {
    if (timeFilter === 'day') {
        const buckets = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'].map(createEmptyBucket);

        bookings.forEach((booking) => {
            const hour = new Date(booking.startTime).getHours();
            const bucketIndex = Math.min(Math.floor(hour / 4), buckets.length - 1);
            addBookingToBucket(buckets[bucketIndex], booking);
        });

        return buckets;
    }

    if (timeFilter === 'month') {
        const daysInMonth = new Date(
            rangeConfig.currentStart.getFullYear(),
            rangeConfig.currentStart.getMonth() + 1,
            0
        ).getDate();
        const bucketCount = Math.ceil(daysInMonth / 7);
        const buckets = Array.from({ length: bucketCount }, (_, index) => createEmptyBucket(`สัปดาห์ ${index + 1}`));

        bookings.forEach((booking) => {
            const dayOfMonth = new Date(booking.startTime).getDate();
            const bucketIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), buckets.length - 1);
            addBookingToBucket(buckets[bucketIndex], booking);
        });

        return buckets;
    }

    if (timeFilter === 'quarter') {
        const startMonth = rangeConfig.currentStart.getMonth();
        const buckets = Array.from({ length: 3 }, (_, index) => createEmptyBucket(MONTH_LABELS[startMonth + index]));

        bookings.forEach((booking) => {
            const monthIndex = new Date(booking.startTime).getMonth() - startMonth;
            if (monthIndex >= 0 && monthIndex < buckets.length) {
                addBookingToBucket(buckets[monthIndex], booking);
            }
        });

        return buckets;
    }

    const buckets = MONTH_LABELS.map(createEmptyBucket);
    bookings.forEach((booking) => {
        const monthIndex = new Date(booking.startTime).getMonth();
        addBookingToBucket(buckets[monthIndex], booking);
    });

    return buckets;
};

const buildRoomShareData = (bookings) => {
    if (bookings.length === 0) {
        return [];
    }

    const roomCounts = bookings.reduce((accumulator, booking) => {
        const roomName = getRoomName(booking);
        accumulator.set(roomName, (accumulator.get(roomName) || 0) + 1);
        return accumulator;
    }, new Map());

    const rankedRooms = Array.from(roomCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count);
    const primaryRooms = rankedRooms.slice(0, 4);
    const remainingCount = rankedRooms.slice(4).reduce((sum, item) => sum + item.count, 0);
    const combined = remainingCount > 0
        ? [...primaryRooms, { label: 'อื่นๆ', count: remainingCount }]
        : primaryRooms;
    const total = combined.reduce((sum, item) => sum + item.count, 0);

    return combined.map((item, index) => ({
        ...item,
        percent: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
        color: PIE_COLORS[index % PIE_COLORS.length]
    }));
};

const LoadingCards = () => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
            <div
                key={index}
                className="h-44 animate-pulse rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
            />
        ))}
    </div>
);

const StatCard = ({ icon: Icon, label, value, accentClass }) => {
    return (
        <div className="group relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] border ${accentClass}`}>
                    <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-5 text-slate-700">{label}</p>
                    <h2 className="mt-1 text-4xl font-black leading-none tracking-tight text-slate-900">
                        {formatNumber(value)}
                    </h2>
                </div>
            </div>
        </div>
    );
};

const CustomBarChart = ({ data, statusFilter }) => {
    const [hoveredData, setHoveredData] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const chartRef = useRef(null);

    const maxValue = Math.max(1, ...data.map((item) => item.approved + item.pending + item.rejected));
    const chartHeight = 252;
    const chartWidth = Math.max(720, data.length * 82);
    const padding = 52;
    const gap = (chartWidth - padding * 2) / Math.max(data.length, 1);
    const barWidth = Math.min(34, gap * 0.42);

    const opacityFor = (key) => (statusFilter === 'all' || statusFilter === key ? 1 : 0.28);

    const handleMouseMove = (event, item) => {
        if (!chartRef.current) {
            return;
        }

        const rect = chartRef.current.getBoundingClientRect();
        setTooltipPos({
            x: event.clientX - rect.left + chartRef.current.scrollLeft,
            y: event.clientY - rect.top
        });
        setHoveredData(item);
    };

    return (
        <div className="relative w-full overflow-x-auto pt-2" ref={chartRef}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 42}`} className="h-full min-w-[620px] w-full">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding + (chartHeight - padding) * (1 - ratio);
                    return (
                        <g key={ratio}>
                            <line
                                x1={padding}
                                y1={y}
                                x2={chartWidth - padding}
                                y2={y}
                                stroke="#dbe4ee"
                                strokeWidth="1"
                                strokeDasharray="4 6"
                            />
                            <text x={padding - 12} y={y + 4} fontSize="12" fill="#64748b" textAnchor="end">
                                {Math.round(maxValue * ratio)}
                            </text>
                        </g>
                    );
                })}

                {data.map((item, index) => {
                    const x = padding + gap * index + gap / 2 - barWidth / 2;
                    const approvedHeight = (item.approved / maxValue) * (chartHeight - padding);
                    const pendingHeight = (item.pending / maxValue) * (chartHeight - padding);
                    const rejectedHeight = (item.rejected / maxValue) * (chartHeight - padding);
                    const approvedY = chartHeight - approvedHeight;
                    const pendingY = approvedY - pendingHeight;
                    const rejectedY = pendingY - rejectedHeight;

                    return (
                        <g
                            key={item.label}
                            className="cursor-pointer"
                            onMouseMove={(event) => handleMouseMove(event, item)}
                            onMouseLeave={() => setHoveredData(null)}
                        >
                            <rect
                                x={x - 10}
                                y={padding}
                                width={barWidth + 20}
                                height={chartHeight - padding}
                                fill="transparent"
                            />
                            <rect x={x} y={rejectedY} width={barWidth} height={rejectedHeight} fill="#fb7185" rx="5" opacity={opacityFor('rejected')} />
                            <rect x={x} y={pendingY} width={barWidth} height={pendingHeight} fill="#f59e0b" rx="5" opacity={opacityFor('pending')} />
                            <rect x={x} y={approvedY} width={barWidth} height={approvedHeight} fill="#10b981" rx="5" opacity={opacityFor('approved')} />
                            <text x={x + barWidth / 2} y={chartHeight + 24} fontSize="12" fill="#64748b" textAnchor="middle">
                                {item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {hoveredData && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl"
                    style={{ left: tooltipPos.x, top: tooltipPos.y - 16 }}
                >
                    <div className="mb-2 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                        {hoveredData.label}
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                อนุมัติ
                            </span>
                            <span className="font-semibold text-slate-800">{hoveredData.approved}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                รอตรวจสอบ
                            </span>
                            <span className="font-semibold text-slate-800">{hoveredData.pending}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-slate-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                ปฏิเสธ / ยกเลิก
                            </span>
                            <span className="font-semibold text-slate-800">{hoveredData.rejected}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomPieChart = ({ data }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const chartRef = useRef(null);

    const total = data.reduce((sum, item) => sum + item.count, 0);
    const cx = 100;
    const cy = 100;
    const outerRadius = 82;
    const slices = useMemo(() => data.reduce((state, item) => {
            const angle = total > 0 ? (item.count / total) * Math.PI * 2 : 0;
            const startAngle = state.currentAngle;
            const endAngle = startAngle + angle;
            const x1 = cx + outerRadius * Math.cos(startAngle);
            const y1 = cy + outerRadius * Math.sin(startAngle);
            const x2 = cx + outerRadius * Math.cos(endAngle);
            const y2 = cy + outerRadius * Math.sin(endAngle);
            const largeArcFlag = angle > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            return {
                currentAngle: endAngle,
                items: [...state.items, { ...item, path }]
            };
        }, {
            currentAngle: -Math.PI / 2,
            items: []
        }).items, [cx, cy, data, outerRadius, total]);

    const handleMouseMove = (event, item) => {
        if (!chartRef.current) {
            return;
        }

        const rect = chartRef.current.getBoundingClientRect();
        setTooltipPos({
            x: event.clientX - rect.left + chartRef.current.scrollLeft,
            y: event.clientY - rect.top
        });
        setHoveredSlice(item);
    };

    if (data.length === 0) {
        return (
            <div className="flex h-full min-h-[270px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 text-center">
                <FiPieChart className="mb-3 text-3xl text-slate-300" />
                <p className="text-sm font-medium text-slate-500">ยังไม่มีข้อมูลการใช้งานห้องในช่วงที่เลือก</p>
            </div>
        );
    }

    return (
        <div className="relative flex w-full flex-col items-center justify-center pt-2" ref={chartRef}>
            <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[200px] overflow-visible">
                {slices.map((slice) => (
                    <path
                        key={slice.label}
                        d={slice.path}
                        fill={slice.color}
                        className="cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
                        style={{ transformOrigin: '100px 100px' }}
                        onMouseMove={(event) => handleMouseMove(event, slice)}
                        onMouseLeave={() => setHoveredSlice(null)}
                    />
                ))}
                <circle cx="100" cy="100" r="48" fill="#ffffff" />
                <text x="100" y="94" textAnchor="middle" className="fill-slate-400 text-[11px] font-medium">
                    รวม
                </text>
                <text x="100" y="116" textAnchor="middle" className="fill-slate-900 text-[22px] font-black">
                    {formatNumber(total)}
                </text>
            </svg>

            <div className="mt-5 flex w-full flex-col gap-2">
                {data.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="truncate">{item.label}</span>
                        </div>
                        <div className="text-right text-sm">
                            <div className="font-semibold text-slate-800">{formatNumber(item.count)}</div>
                            <div className="text-xs text-slate-400">{item.percent}%</div>
                        </div>
                    </div>
                ))}
            </div>

            {hoveredSlice && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-2xl"
                    style={{ left: tooltipPos.x, top: tooltipPos.y - 18 }}
                >
                    <div className="text-sm font-semibold text-slate-800">{hoveredSlice.label}</div>
                    <div className="mt-1 text-xl font-black" style={{ color: hoveredSlice.color }}>
                        {hoveredSlice.percent}%
                    </div>
                    <div className="text-xs text-slate-400">{formatNumber(hoveredSlice.count)} รายการ</div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ booking }) => {
    const meta = getStatusMeta(booking?.status);
    const Icon = meta.icon;

    return (
        <span className={`inline-flex w-[148px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-center text-xs font-semibold leading-none ${meta.badgeClass}`}>
            <Icon size={14} />
            {getBookingStatusLabel(booking)}
        </span>
    );
};

const Dashboard = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [timeFilter, setTimeFilter] = useState('year');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [exporting, setExporting] = useState(null);
    const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

    useEffect(() => {
        let isMounted = true;

        const loadDashboard = async () => {
            try {
                setLoading(true);
                setFetchError('');

                const response = await api.get('/bookings');
                if (!isMounted) {
                    return;
                }

                const normalizedBookings = (response.data?.data || []).filter((booking) => !booking.isImported && booking.user?.department !== 'Imported');
                // Remove startTransition so this batches synchronously with setLoading(false) in finally block
                // This prevents the numbers from flickering at "0" before rendering
                setBookings(normalizedBookings);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                const message = error.response?.data?.error || 'ไม่สามารถโหลดข้อมูล Dashboard ได้';
                setFetchError(message);
                toast.error(message);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadDashboard();

        return () => {
            isMounted = false;
        };
    }, [reloadKey, toast]);

    const rangeConfig = useMemo(() => getRangeConfig(timeFilter), [timeFilter]);

    const currentRangeBookings = useMemo(() => bookings.filter((booking) => (
        isDateInRange(booking.startTime, rangeConfig.currentStart, rangeConfig.currentEnd)
    )), [bookings, rangeConfig]);

    const previousRangeBookings = useMemo(() => bookings.filter((booking) => (
        isDateInRange(booking.startTime, rangeConfig.previousStart, rangeConfig.previousEnd)
    )), [bookings, rangeConfig]);

    const summary = useMemo(() => countGroupedStatuses(currentRangeBookings), [currentRangeBookings]);
    const uniqueUsers = useMemo(() => (
        new Set(currentRangeBookings.map((booking) => booking.user?.email || booking.user?.name).filter(Boolean)).size
    ), [currentRangeBookings]);

    const activeRooms = useMemo(() => (
        new Set(currentRangeBookings.map((booking) => getRoomName(booking))).size
    ), [currentRangeBookings]);

    const chartData = useMemo(() => buildChartData(currentRangeBookings, timeFilter, rangeConfig), [currentRangeBookings, timeFilter, rangeConfig]);

    const statusScopedBookings = useMemo(() => {
        if (statusFilter === 'all') {
            return currentRangeBookings;
        }

        return currentRangeBookings.filter((booking) => getStatusGroup(booking.status) === statusFilter);
    }, [currentRangeBookings, statusFilter]);

    const roomShareData = useMemo(() => buildRoomShareData(statusScopedBookings), [statusScopedBookings]);
    const exportFilename = useMemo(() => (
        `dashboard_${timeFilter}_${statusFilter}`
    ), [statusFilter, timeFilter]);
    const sortedStatusScopedBookings = useMemo(() => (
        [...statusScopedBookings].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    ), [statusScopedBookings]);
    const dashboardExportReport = useMemo(() => createDashboardExportReport({
        timeFilter,
        statusFilter,
        rangeLabel: rangeConfig.label,
        currentRangeBookings,
        previousRangeBookings,
        statusScopedBookings,
        chartData,
        roomShareData,
        searchQuery
    }), [
        chartData,
        currentRangeBookings,
        previousRangeBookings,
        rangeConfig.label,
        roomShareData,
        searchQuery,
        statusFilter,
        statusScopedBookings,
        timeFilter
    ]);

    const recentBookings = useMemo(() => (
        filterDashboardBookingsBySearch(sortedStatusScopedBookings, deferredSearch).slice(0, 8)
    ), [deferredSearch, sortedStatusScopedBookings]);

    const handleRetry = () => {
        startTransition(() => {
            setReloadKey((value) => value + 1);
        });
    };

    const handleRowAction = (booking) => {
        navigate(booking.status === 'pending' ? '/approve' : '/history');
    };

    const handleExport = async (type) => {
        if (dashboardExportReport.summary.overviewBookings === 0) {
            toast.warning('ไม่มีข้อมูล Dashboard สำหรับช่วงที่เลือก');
            return;
        }

        setExporting(type);
        try {
            const { exportDashboardToExcel, exportDashboardToPDF } = await import('../services/dashboardExportService');
            if (type === 'excel') {
                await exportDashboardToExcel(dashboardExportReport, exportFilename);
            } else {
                await exportDashboardToPDF(dashboardExportReport, exportFilename);
            }

            toast.success(`ส่งออกรายงาน ${type === 'excel' ? 'Excel' : 'PDF'} เรียบร้อยแล้ว`);
        } catch (error) {
            console.error('Dashboard export failed:', error);
            toast.error('ไม่สามารถส่งออกรายงานได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setExporting(null);
        }
    };

    if (loading) {
        return (
            <div className="relative h-full w-full px-0 py-6 sm:px-4 sm:py-8">
                <div className="mb-8 h-28 animate-pulse rounded-[2.25rem] border border-white/70 bg-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.05)]" />
                <LoadingCards />
            </div>
        );
    }

    if (fetchError && bookings.length === 0) {
        return (
            <div className="relative h-full w-full px-0 py-6 sm:px-4 sm:py-8">
                <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[2.2rem] border border-white/80 bg-white/85 px-8 py-14 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <FiAlertCircle className="mb-4 text-5xl text-rose-400" />
                    <h1 className="text-2xl font-black text-slate-900">โหลด Dashboard ไม่สำเร็จ</h1>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{fetchError}</p>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <FiRefreshCw />
                        ลองใหม่อีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden px-0 py-6 sm:px-4 sm:py-8">
            <div className="flex w-full flex-col gap-6 md:gap-8">
                <header className="rounded-[2.25rem] border border-white/80 bg-white/80 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 lg:text-4xl">
                                ระบบจัดการห้องอบรม
                            </h1>

                            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                                    <FiCalendar className="text-slate-400" />
                                    ช่วงข้อมูล: {rangeConfig.label}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                                    <FiUsers className="text-slate-400" />
                                    ผู้จอง {formatNumber(uniqueUsers)} คน
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                                    <FiPieChart className="text-slate-400" />
                                    ห้องที่ถูกใช้งาน {formatNumber(activeRooms)} ห้อง
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                            <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-2 shadow-inner shadow-white/80">
                                <div className="flex items-center gap-2 rounded-[1rem] border border-white bg-white px-3 py-2 text-slate-500 shadow-sm">
                                    <FiFilter size={16} />
                                    <select
                                        className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                                        value={timeFilter}
                                        onChange={(event) => startTransition(() => setTimeFilter(event.target.value))}
                                    >
                                        <option value="day">วันนี้</option>
                                        <option value="month">เดือนนี้</option>
                                        <option value="quarter">ไตรมาสนี้</option>
                                        <option value="year">ปีนี้</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 rounded-[1rem] border border-white bg-white px-3 py-2 text-slate-500 shadow-sm">
                                    <FiAlertCircle size={16} />
                                    <select
                                        className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                                        value={statusFilter}
                                        onChange={(event) => startTransition(() => setStatusFilter(event.target.value))}
                                    >
                                        <option value="all">ทุกสถานะ</option>
                                        <option value="approved">เฉพาะอนุมัติ</option>
                                        <option value="pending">รอตรวจสอบ</option>
                                        <option value="rejected">ไม่อนุมัติ / ยกเลิก</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <button
                                    type="button"
                                    onClick={() => handleExport('excel')}
                                    disabled={Boolean(exporting)}
                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {exporting === 'excel' ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                    ) : (
                                        <FaFileExcel className="text-sm" />
                                    )}
                                    ส่งออก Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExport('pdf')}
                                    disabled={Boolean(exporting)}
                                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {exporting === 'pdf' ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                                    ) : (
                                        <FaFilePdf className="text-sm" />
                                    )}
                                    ส่งออก PDF
                                </button>
                                <Link
                                    to="/approve"
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                                >
                                    คำขอรอตรวจสอบ
                                    <FiArrowUpRight />
                                </Link>
                                <Link
                                    to="/history"
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                                >
                                    ประวัติทั้งหมด
                                    <FiArrowUpRight />
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={FiCalendar}
                        label="การจองทั้งหมด"
                        value={summary.total}
                        accentClass="border-sky-100 bg-sky-50 text-sky-600"
                    />
                    <StatCard
                        icon={FiCheckCircle}
                        label="อนุมัติแล้ว"
                        value={summary.approved}
                        accentClass="border-emerald-100 bg-emerald-50 text-emerald-600"
                    />
                    <StatCard
                        icon={FiClock}
                        label="รอตรวจสอบ"
                        value={summary.pending}
                        accentClass="border-amber-100 bg-amber-50 text-amber-600"
                    />
                    <StatCard
                        icon={FiXCircle}
                        label="ถูกปฏิเสธ / ยกเลิก"
                        value={summary.rejected}
                        accentClass="border-rose-100 bg-rose-50 text-rose-600"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <section className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:col-span-3">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">สถิติเปรียบเทียบการจอง</h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                                <span className={`inline-flex items-center gap-2 ${statusFilter !== 'all' && statusFilter !== 'approved' ? 'opacity-35' : ''}`}>
                                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                                    อนุมัติ
                                </span>
                                <span className={`inline-flex items-center gap-2 ${statusFilter !== 'all' && statusFilter !== 'pending' ? 'opacity-35' : ''}`}>
                                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                                    รอตรวจสอบ
                                </span>
                                <span className={`inline-flex items-center gap-2 ${statusFilter !== 'all' && statusFilter !== 'rejected' ? 'opacity-35' : ''}`}>
                                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                                    ปฏิเสธ / ยกเลิก
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 min-h-[290px]">
                            <CustomBarChart data={chartData} statusFilter={statusFilter} />
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                        <div className="mb-3">
                            <h2 className="text-lg font-black text-slate-900">สัดส่วนการใช้งานห้อง</h2>
                        </div>

                        <CustomPieChart data={roomShareData} />
                    </section>
                </div>

                <section className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">รายการจองล่าสุด</h2>
                        </div>

                        <div className="relative w-full max-w-md">
                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => startTransition(() => setSearchQuery(event.target.value))}
                                placeholder="ค้นหารหัส, หัวข้อ, ผู้จอง, ห้อง..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50/90 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100/70"
                            />
                        </div>
                    </div>

                    {recentBookings.length === 0 ? (
                        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center">
                            <FiSearch className="mx-auto mb-3 text-3xl text-slate-300" />
                            <h3 className="text-lg font-bold text-slate-700">ไม่พบรายการที่ตรงกับตัวกรองนี้</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                ลองเปลี่ยนช่วงเวลา สถานะ หรือคำค้นหา แล้วระบบจะแสดงรายการล่าสุดให้อัตโนมัติ
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[860px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-sm text-slate-400">
                                        <th className="px-4 pb-4 font-medium">รหัสการจอง</th>
                                        <th className="px-4 pb-4 font-medium">ห้องประชุม</th>
                                        <th className="px-4 pb-4 font-medium">ผู้จอง</th>
                                        <th className="px-4 pb-4 font-medium">วัน / เวลา</th>
                                        <th className="px-4 pb-4 font-medium">สถานะ</th>
                                        <th className="px-4 pb-4 text-right font-medium">จัดการ</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recentBookings.map((booking) => (
                                        <tr key={booking._id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{getBookingCode(booking)}</span>
                                                    <span className="mt-1 text-xs text-slate-400">{booking.topic || 'ไม่ได้ระบุหัวข้อ'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-slate-700">{getRoomName(booking)}</div>
                                                <div className="mt-1 text-xs text-slate-400">
                                                    สร้างเมื่อ {formatCreatedAt(booking.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                                                        {getUserInitial(booking)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium text-slate-700">{getUserName(booking)}</div>
                                                        <div className="truncate text-xs text-slate-400">{booking.user?.email || 'ไม่มีอีเมล'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">{formatShortDate(booking.startTime)}</span>
                                                    <span className="mt-1 text-sm text-slate-400">{formatTimeRange(booking.startTime, booking.endTime)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex max-w-[240px] flex-col gap-2">
                                                    <StatusBadge booking={booking} />
                                                    {booking.status === 'cancelled' && booking.cancellationReason?.trim() ? (
                                                        <div
                                                            className="px-1 text-xs leading-5 text-slate-500"
                                                            title={booking.cancellationReason}
                                                        >
                                                            <span className="font-semibold text-slate-600">เหตุผล:</span> {booking.cancellationReason}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRowAction(booking)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                                                >
                                                    {booking.status === 'pending' ? 'ตรวจคำขอ' : 'เปิดรายการ'}
                                                    <FiArrowUpRight size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
