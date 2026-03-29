import { describe, expect, it } from 'vitest';
import {
    createDashboardExportReport,
    filterDashboardBookingsBySearch
} from '../../services/dashboardReportBuilder';

const bookingA = {
    _id: 'BOOKING-000123',
    topic: 'ประชุมวางแผนหลักสูตร',
    status: 'approved',
    startTime: '2026-03-25T09:00:00.000Z',
    endTime: '2026-03-25T10:00:00.000Z',
    createdAt: '2026-03-20T08:30:00.000Z',
    room: { name: 'ห้องประชุม A' },
    user: {
        name: 'Alice',
        email: 'alice@example.com',
        department: 'วิชาการ'
    }
};

const bookingB = {
    _id: 'BOOKING-000456',
    topic: 'ติดตามงานธุรการ',
    status: 'pending',
    startTime: '2026-03-24T13:00:00.000Z',
    endTime: '2026-03-24T14:00:00.000Z',
    createdAt: '2026-03-21T10:00:00.000Z',
    room: { name: 'ห้องประชุม B' },
    user: {
        name: 'Bob',
        email: 'bob@example.com',
        department: 'ธุรการ'
    }
};

const bookingC = {
    _id: 'BOOKING-000789',
    topic: 'ยกเลิกการอบรม',
    status: 'cancelled',
    startTime: '2026-03-26T15:00:00.000Z',
    endTime: '2026-03-26T16:00:00.000Z',
    createdAt: '2026-03-22T09:15:00.000Z',
    room: { name: 'ห้องประชุม A' },
    user: {
        name: 'Carol',
        email: 'carol@example.com',
        department: 'ทรัพยากรบุคคล'
    }
};

describe('dashboardReportBuilder', () => {
    it('filters dashboard bookings by search across booking code and department', () => {
        expect(filterDashboardBookingsBySearch([bookingA, bookingB], '000123')).toEqual([bookingA]);
        expect(filterDashboardBookingsBySearch([bookingA, bookingB], 'ธุรการ')).toEqual([bookingB]);
    });

    it('builds a dashboard export report that matches the current summary cards and filtered table rows', () => {
        const report = createDashboardExportReport({
            timeFilter: 'month',
            statusFilter: 'pending',
            rangeLabel: 'มีนาคม 2569',
            currentRangeBookings: [bookingA, bookingB, bookingC],
            previousRangeBookings: [bookingA],
            statusScopedBookings: [bookingB],
            chartData: [
                { label: 'สัปดาห์ 1', approved: 1, pending: 0, rejected: 0 },
                { label: 'สัปดาห์ 2', approved: 0, pending: 1, rejected: 1 }
            ],
            roomShareData: [
                { label: 'ห้องประชุม B', count: 1, percent: 100, color: '#0f766e' }
            ],
            searchQuery: 'ธุรการ'
        });

        expect(report.title).toBe('รายงานระบบจัดการห้องอบรม');
        expect(report.filters.statusLabel).toBe('เฉพาะรอตรวจสอบ');
        expect(report.summary.overviewBookings).toBe(3);
        expect(report.summary.tableBookings).toBe(1);
        expect(report.cards.map((card) => [card.key, card.label, card.value])).toEqual([
            ['total', 'การจองทั้งหมด', 3],
            ['approved', 'อนุมัติแล้ว', 1],
            ['pending', 'รอตรวจสอบ', 1],
            ['rejected', 'ถูกปฏิเสธ / ยกเลิก', 1]
        ]);
        expect(report.notes.roomShare).toContain('ห้องประชุม B');
        expect(report.notes.search).toContain('"ธุรการ"');
        expect(report.datasets.tableBookings).toEqual([bookingB]);
        expect(report.datasets.overviewBookings.map((booking) => booking._id)).toEqual([
            bookingB._id,
            bookingA._id,
            bookingC._id
        ]);
    });
});
