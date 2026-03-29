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
    statusScopedBookings = [],
    chartData = [],
    roomShareData = [],
    searchQuery = ''
} = {}) => {
    const statusLabel = getDashboardStatusFilterLabel(statusFilter);
    const searchTerm = String(searchQuery || '').trim();
    const summary = countGroupedStatuses(currentRangeBookings);
    const tableBookings = sortBookingsForReport(filterDashboardBookingsBySearch(statusScopedBookings, searchTerm));
    const overviewBookings = sortBookingsForReport(currentRangeBookings);
    const topRoom = roomShareData[0];

    return {
        title: 'รายงานระบบจัดการห้องอบรม',
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
                value: summary.total
            },
            {
                key: 'approved',
                label: 'อนุมัติแล้ว',
                value: summary.approved
            },
            {
                key: 'pending',
                label: 'รอตรวจสอบ',
                value: summary.pending
            },
            {
                key: 'rejected',
                label: 'ถูกปฏิเสธ / ยกเลิก',
                value: summary.rejected
            }
        ],
        chartData,
        roomShareData,
        notes: {
            roomShare: topRoom
                ? `ห้องที่มีการใช้งานสูงสุดคือ ${topRoom.label} จำนวน ${formatNumber(topRoom.count)} ครั้ง คิดเป็น ${topRoom.percent}% ของรายการในช่วงที่เลือก`
                : `ไม่พบข้อมูลการใช้งานห้องภายใต้ตัวกรอง ${statusLabel} ในช่วง ${rangeLabel}`,
            search: searchTerm
                ? `ตารางนี้แสดงรายการที่ตรงกับคำค้นหา "${searchTerm}" ภายใต้ตัวกรอง ${statusLabel} รวม ${formatNumber(tableBookings.length)} รายการ`
                : `ตารางนี้แสดงรายการตามตัวกรอง ${statusLabel} ในช่วง ${rangeLabel} รวม ${formatNumber(tableBookings.length)} รายการ`
        },
        datasets: {
            overviewBookings,
            tableBookings
        }
    };
};
