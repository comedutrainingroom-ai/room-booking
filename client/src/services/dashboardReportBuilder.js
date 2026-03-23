const STATUS_LABELS = {
    approved: 'เฉพาะอนุมัติ',
    pending: 'เฉพาะรอตรวจสอบ',
    rejected: 'เฉพาะไม่อนุมัติ / ยกเลิก',
    all: 'ทุกสถานะ'
};

const TIME_FILTER_LABELS = {
    day: 'รายงานประจำวัน',
    month: 'รายงานประจำเดือน',
    quarter: 'รายงานประจำไตรมาส',
    year: 'รายงานประจำปี'
};

const formatNumber = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

const getStatusGroup = (status) => (status === 'rejected' || status === 'cancelled' ? 'rejected' : status);

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

const countGroupedStatuses = (bookings = []) => bookings.reduce((summary, booking) => {
    const group = getStatusGroup(booking.status);
    summary.total += 1;
    summary[group] += 1;
    return summary;
}, { total: 0, approved: 0, pending: 0, rejected: 0 });

const calculateTrend = (currentValue, previousValue) => {
    if (previousValue === 0) {
        if (currentValue === 0) {
            return { direction: 'flat', value: 0, label: 'เท่ากับช่วงก่อนหน้า' };
        }

        return { direction: 'up', value: 100, label: 'เริ่มมีการใช้งานในช่วงนี้' };
    }

    const percent = Math.round(((currentValue - previousValue) / previousValue) * 100);
    if (percent === 0) {
        return { direction: 'flat', value: 0, label: 'เท่ากับช่วงก่อนหน้า' };
    }

    return {
        direction: percent > 0 ? 'up' : 'down',
        value: Math.abs(percent),
        label: percent > 0 ? 'มากกว่าช่วงก่อนหน้า' : 'น้อยกว่าช่วงก่อนหน้า'
    };
};

const countUniqueUsers = (bookings = []) => (
    new Set(bookings.map((booking) => booking.user?.email || booking.user?.name).filter(Boolean)).size
);

const countActiveRooms = (bookings = []) => (
    new Set(bookings.map((booking) => getRoomName(booking))).size
);

const getDashboardStatusFilterLabel = (statusFilter = 'all') => STATUS_LABELS[statusFilter] || STATUS_LABELS.all;
const getDashboardTimeFilterLabel = (timeFilter = 'year') => TIME_FILTER_LABELS[timeFilter] || TIME_FILTER_LABELS.year;

const sortBookingsForReport = (bookings = []) => [...bookings].sort((left, right) => {
    const startDiff = new Date(left?.startTime || 0).getTime() - new Date(right?.startTime || 0).getTime();
    if (startDiff !== 0) {
        return startDiff;
    }

    return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
});

export const filterDashboardBookingsBySearch = (bookings = [], searchQuery = '') => {
    const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return [...bookings];
    }

    return bookings.filter((booking) => {
        const searchableText = [
            getBookingCode(booking),
            booking?.topic,
            booking?.user?.name,
            booking?.user?.email,
            booking?.user?.department,
            getRoomName(booking)
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchableText.includes(normalizedQuery);
    });
};

export const createDashboardExportReport = ({
    timeFilter = 'year',
    statusFilter = 'all',
    rangeLabel = '-',
    currentRangeBookings = [],
    previousRangeBookings = [],
    statusScopedBookings = [],
    chartData = [],
    roomShareData = [],
    searchQuery = ''
} = {}) => {
    const statusLabel = getDashboardStatusFilterLabel(statusFilter);
    const searchTerm = String(searchQuery || '').trim();
    const summary = countGroupedStatuses(currentRangeBookings);
    const previousSummary = countGroupedStatuses(previousRangeBookings);
    const uniqueUsers = countUniqueUsers(currentRangeBookings);
    const previousUniqueUsers = countUniqueUsers(previousRangeBookings);
    const activeRooms = countActiveRooms(currentRangeBookings);
    const previousActiveRooms = countActiveRooms(previousRangeBookings);
    const tableBookings = sortBookingsForReport(filterDashboardBookingsBySearch(statusScopedBookings, searchTerm));
    const overviewBookings = sortBookingsForReport(currentRangeBookings);
    const topRoom = roomShareData[0];

    return {
        title: 'รายงานวิเคราะห์การใช้งานห้องประชุม',
        subtitle: `${getDashboardTimeFilterLabel(timeFilter)} • ${rangeLabel} • ${statusLabel}`,
        generatedAt: new Date(),
        filters: {
            rangeLabel,
            statusLabel,
            searchQuery: searchTerm
        },
        summary: {
            overviewBookings: overviewBookings.length,
            tableBookings: tableBookings.length
        },
        cards: [
            {
                key: 'total',
                label: 'การจองทั้งหมด',
                value: summary.total,
                trend: calculateTrend(summary.total, previousSummary.total),
                subtitle: 'คำขอทั้งหมดในช่วงที่เลือก'
            },
            {
                key: 'approved',
                label: 'อนุมัติแล้ว',
                value: summary.approved,
                trend: calculateTrend(summary.approved, previousSummary.approved),
                subtitle: 'รายการที่อนุมัติสำเร็จ'
            },
            {
                key: 'pending',
                label: 'รอตรวจสอบ',
                value: summary.pending,
                trend: calculateTrend(summary.pending, previousSummary.pending),
                subtitle: summary.pending > 0 ? 'รายการที่ควรเร่งติดตาม' : 'ไม่มีรายการค้างตรวจสอบ'
            },
            {
                key: 'rejected',
                label: 'ไม่อนุมัติ / ยกเลิก',
                value: summary.rejected,
                trend: calculateTrend(summary.rejected, previousSummary.rejected),
                subtitle: 'ใช้ทบทวนเหตุผลและประสานงาน'
            },
            {
                key: 'users',
                label: 'ผู้จองไม่ซ้ำ',
                value: uniqueUsers,
                trend: calculateTrend(uniqueUsers, previousUniqueUsers),
                subtitle: 'ผู้จองที่มีความเคลื่อนไหวในช่วงนี้'
            },
            {
                key: 'rooms',
                label: 'ห้องที่ถูกใช้งาน',
                value: activeRooms,
                trend: calculateTrend(activeRooms, previousActiveRooms),
                subtitle: 'ห้องที่มีรายการจองจริงในช่วงนี้'
            }
        ],
        chartData,
        roomShareData,
        notes: {
            roomShare: topRoom
                ? `ห้องที่มีการใช้งานสูงสุดคือ ${topRoom.label} จำนวน ${formatNumber(topRoom.count)} ครั้ง คิดเป็น ${topRoom.percent}% ของรายการภายใต้ตัวกรอง ${statusLabel}`
                : `ไม่พบข้อมูลการใช้งานห้องภายใต้ตัวกรอง ${statusLabel} ในช่วง ${rangeLabel}`,
            search: searchTerm
                ? `ตารางนี้แสดงรายการที่ตรงกับคำค้นหา "${searchTerm}" ภายใต้ตัวกรอง ${statusLabel} รวม ${formatNumber(tableBookings.length)} รายการ เพื่อให้เจ้าหน้าที่ตรวจสอบและติดตามงานต่อได้ทันที`
                : `ตารางนี้แสดงรายการทั้งหมดตามตัวกรอง ${statusLabel} ในช่วง ${rangeLabel} รวม ${formatNumber(tableBookings.length)} รายการ เหมาะสำหรับตรวจสอบสถานะ ติดต่อผู้จอง และสรุปผลต่อ`
        },
        datasets: {
            overviewBookings,
            tableBookings
        }
    };
};
