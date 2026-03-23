import { DEFAULT_LOGIN_GUIDE, normalizeLoginGuide } from './loginGuideConfig';

export const DEFAULT_SETTINGS = {
    systemName: 'ระบบจองห้องประชุมออนไลน์',
    contactEmail: 'admin@example.com',
    themeColor: '#16a34a',
    maxBookingDays: 30,
    maxBookingHours: 4,
    requireApproval: true,
    weekendBooking: false,
    maintenanceMode: false,
    openTime: '08:00',
    closeTime: '20:00',
    loginGuide: DEFAULT_LOGIN_GUIDE
};

export const normalizeSettings = (settings = {}) => ({
    ...DEFAULT_SETTINGS,
    ...settings,
    loginGuide: normalizeLoginGuide(settings?.loginGuide)
});
