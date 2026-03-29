const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Bangkok';

const dateTimeFormatterCache = new Map();
const weekdayFormatterCache = new Map();
const thaiDateFormatterCache = new Map();
const thaiTimeFormatterCache = new Map();
const thaiDateTimeDisplayFormatterCache = new Map();

const WEEKDAY_INDEX = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};

const getValidDate = (value) => {
    const date = value instanceof Date ? new Date(value) : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new TypeError('Invalid date');
    }

    return date;
};

const getDateTimeFormatter = (timeZone) => {
    if (!dateTimeFormatterCache.has(timeZone)) {
        dateTimeFormatterCache.set(timeZone, new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            hourCycle: 'h23'
        }));
    }

    return dateTimeFormatterCache.get(timeZone);
};

const getWeekdayFormatter = (timeZone) => {
    if (!weekdayFormatterCache.has(timeZone)) {
        weekdayFormatterCache.set(timeZone, new Intl.DateTimeFormat('en-US', {
            timeZone,
            weekday: 'short'
        }));
    }

    return weekdayFormatterCache.get(timeZone);
};

const getThaiDateFormatter = (timeZone) => {
    if (!thaiDateFormatterCache.has(timeZone)) {
        thaiDateFormatterCache.set(timeZone, new Intl.DateTimeFormat('th-TH', {
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }));
    }

    return thaiDateFormatterCache.get(timeZone);
};

const getThaiTimeFormatter = (timeZone) => {
    if (!thaiTimeFormatterCache.has(timeZone)) {
        thaiTimeFormatterCache.set(timeZone, new Intl.DateTimeFormat('th-TH', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            hourCycle: 'h23'
        }));
    }

    return thaiTimeFormatterCache.get(timeZone);
};

const getThaiDateTimeDisplayFormatter = (timeZone) => {
    if (!thaiDateTimeDisplayFormatterCache.has(timeZone)) {
        thaiDateTimeDisplayFormatterCache.set(timeZone, new Intl.DateTimeFormat('th-TH', {
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            hourCycle: 'h23'
        }));
    }

    return thaiDateTimeDisplayFormatterCache.get(timeZone);
};

const getTimeZoneDateTimeParts = (value, timeZone = DEFAULT_TIME_ZONE) => {
    const date = getValidDate(value);
    const rawParts = getDateTimeFormatter(timeZone).formatToParts(date);
    const parts = rawParts.reduce((result, part) => {
        if (part.type !== 'literal') {
            result[part.type] = part.value;
        }

        return result;
    }, {});

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second)
    };
};

const getMinutesSinceMidnightInTimeZone = (value, timeZone = DEFAULT_TIME_ZONE) => {
    const { hour, minute } = getTimeZoneDateTimeParts(value, timeZone);
    return (hour * 60) + minute;
};

const getDayOfWeekInTimeZone = (value, timeZone = DEFAULT_TIME_ZONE) => {
    const date = getValidDate(value);
    const weekday = getWeekdayFormatter(timeZone).format(date);
    return WEEKDAY_INDEX[weekday];
};

const formatThaiDateInTimeZone = (value, timeZone = DEFAULT_TIME_ZONE) => (
    getThaiDateFormatter(timeZone).format(getValidDate(value))
);

const formatThaiTimeInTimeZone = (value, timeZone = DEFAULT_TIME_ZONE) => (
    getThaiTimeFormatter(timeZone).format(getValidDate(value))
);

const formatThaiDateTimeInTimeZone = (value, timeZone = DEFAULT_TIME_ZONE) => (
    getThaiDateTimeDisplayFormatter(timeZone).format(getValidDate(value))
);

module.exports = {
    DEFAULT_TIME_ZONE,
    getTimeZoneDateTimeParts,
    getMinutesSinceMidnightInTimeZone,
    getDayOfWeekInTimeZone,
    formatThaiDateInTimeZone,
    formatThaiTimeInTimeZone,
    formatThaiDateTimeInTimeZone
};
