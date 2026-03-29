const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
    DEFAULT_TIME_ZONE,
    getTimeZoneDateTimeParts,
    getMinutesSinceMidnightInTimeZone,
    getDayOfWeekInTimeZone,
    formatThaiDateInTimeZone,
    formatThaiTimeInTimeZone,
    formatThaiDateTimeInTimeZone
} = require('../utils/timezone');

describe('timezone utils', async () => {
    it('should read UTC booking timestamps as Bangkok local time', () => {
        const bookingInstant = '2026-03-28T02:30:00.000Z';

        assert.strictEqual(DEFAULT_TIME_ZONE, 'Asia/Bangkok');
        assert.deepStrictEqual(getTimeZoneDateTimeParts(bookingInstant), {
            year: 2026,
            month: 3,
            day: 28,
            hour: 9,
            minute: 30,
            second: 0
        });
        assert.strictEqual(getMinutesSinceMidnightInTimeZone(bookingInstant), 570);
    });

    it('should resolve weekday using Bangkok timezone instead of server local timezone', () => {
        const saturdayMorningBangkok = '2026-03-28T02:00:00.000Z';
        const sundayMorningBangkok = '2026-03-29T02:00:00.000Z';

        assert.strictEqual(getDayOfWeekInTimeZone(saturdayMorningBangkok), 6);
        assert.strictEqual(getDayOfWeekInTimeZone(sundayMorningBangkok), 0);
    });

    it('should format UTC timestamps for Thai recipients using Bangkok time', () => {
        const bookingInstant = '2026-04-01T00:00:00.000Z';

        assert.strictEqual(formatThaiDateInTimeZone(bookingInstant), '1/4/2569');
        assert.strictEqual(formatThaiTimeInTimeZone(bookingInstant), '07:00:00');
        assert.strictEqual(formatThaiDateTimeInTimeZone(bookingInstant), '1/4/2569 07:00:00');
    });
});
