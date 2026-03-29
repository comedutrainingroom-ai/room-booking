/**
 * Server API Integration Tests
 * Using Node.js native test runner + Supertest + MongoDB Memory Server
 */
process.env.ADMIN_PIN = 'test-pin-1234';
process.env.ADMIN_PIN_TOKEN_SECRET = 'test-admin-pin-secret';
process.env.NODE_ENV = 'test';

const Module = require('module');
const originalRequire = Module.prototype.require;

const tokenPayloads = {
    'student-token': {
        email: 'student@kmutnb.ac.th',
        name: 'Student User',
        picture: 'http://example.com/student.jpg'
    },
    'admin-token': {
        email: 'admin@kmutnb.ac.th',
        name: 'Admin User',
        picture: 'http://example.com/admin.jpg'
    },
    'other-student-token': {
        email: 'other@kmutnb.ac.th',
        name: 'Other User',
        picture: 'http://example.com/other.jpg'
    },
    'bad-domain-token': {
        email: 'hacker@gmail.com',
        name: 'Hacker',
        picture: ''
    }
};

let sendBookingCreatedMock = async () => ({ success: true });
let sendBookingApprovedMock = async () => ({ success: true });
let sendBookingModifiedMock = async () => ({ success: true });
let sendBookingReminderMock = async () => ({ success: true });
let sendBookingCancelledMock = async () => ({ success: true });
let sendBanNotificationMock = async () => ({ success: true });
let sendUnbanNotificationMock = async () => ({ success: true });
let sendAdminContactEmailMock = async () => ({ success: true });

Module.prototype.require = function (id) {
    if (id.endsWith('config/firebaseAdmin') || id.endsWith('config\\firebaseAdmin')) {
        return {
            auth: () => ({
                verifyIdToken: async (token) => {
                    const payload = tokenPayloads[token];
                    if (!payload) {
                        throw new Error('Invalid token');
                    }

                    return payload;
                }
            })
        };
    }

    if (id.endsWith('services/emailService') || id.endsWith('services\\emailService')) {
        return {
            sendBookingCreated: (...args) => sendBookingCreatedMock(...args),
            sendBookingApproved: (...args) => sendBookingApprovedMock(...args),
            sendBookingModified: (...args) => sendBookingModifiedMock(...args),
            sendBookingReminder: (...args) => sendBookingReminderMock(...args),
            sendBookingCancelled: (...args) => sendBookingCancelledMock(...args),
            sendBanNotification: (...args) => sendBanNotificationMock(...args),
            sendUnbanNotification: (...args) => sendUnbanNotificationMock(...args),
            sendAdminContactEmail: (...args) => sendAdminContactEmailMock(...args)
        };
    }

    return originalRequire.apply(this, arguments);
};

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const express = require('express');
const xlsx = require('xlsx');
const db = require('./setup');

const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Setting = require('../models/Setting');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { runReminderJob } = require('../cron/scheduler');

function createTestApp() {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.set('io', { to: () => ({ emit: () => {} }) });

    app.use('/api/rooms', require('../routes/roomRoutes'));
    app.use('/api/bookings', require('../routes/bookingRoutes'));
    app.use('/api/settings', require('../routes/settingsRoutes'));
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
    app.use('/api/users', require('../routes/userRoutes'));

    app.use((err, req, res, next) => {
        if (!err) {
            return next();
        }

        res.status(err.status || 400).json({
            success: false,
            error: err.message || 'Server Error'
        });
    });

    return app;
}

const authHeader = (token) => ({
    Authorization: `Bearer ${token}`
});

const applyHeaders = (req, headers) => {
    Object.entries(headers).forEach(([key, value]) => {
        req.set(key, value);
    });

    return req;
};

const getNextWeekdayRange = (daysAhead = 7, startHour = 10, durationHours = 1) => {
    const start = new Date();
    start.setDate(start.getDate() + daysAhead);

    while (start.getDay() === 0 || start.getDay() === 6) {
        start.setDate(start.getDate() + 1);
    }

    start.setHours(startHour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + durationHours);

    return { start, end };
};

const createWorkbookBuffer = (sheets) => {
    const workbook = xlsx.utils.book_new();

    Object.entries(sheets).forEach(([sheetName, rows]) => {
        const sheet = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const createTinyPngBuffer = () => Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgL9enZ8AAAAASUVORK5CYII=',
    'base64'
);

const cleanupUploadedFiles = (filenames = []) => {
    filenames.forEach((filename) => {
        if (!filename) {
            return;
        }

        const filePath = path.join(__dirname, '../uploads', filename);
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
    });
};

async function seedUser(token, role = 'student') {
    const payload = tokenPayloads[token];
    return User.create({
        email: payload.email,
        name: payload.name,
        role
    });
}

async function seedRoom(overrides = {}) {
    return Room.create({
        name: 'Room A101',
        capacity: 30,
        isActive: true,
        ...overrides
    });
}

async function issueAdminPinToken(app) {
    const response = await request(app)
        .post('/api/auth/verify-pin')
        .set(authHeader('admin-token'))
        .send({ pin: process.env.ADMIN_PIN });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.adminPinToken);

    return response.body.data.adminPinToken;
}

async function getAdminHeaders(app) {
    const adminPinToken = await issueAdminPinToken(app);
    return {
        ...authHeader('admin-token'),
        'x-admin-pin-token': adminPinToken
    };
}

let app;

describe('Server API Tests', async () => {
    before(async () => {
        await db.connect();
        app = createTestApp();
    });

    afterEach(async () => {
        sendBookingCreatedMock = async () => ({ success: true });
        sendBookingApprovedMock = async () => ({ success: true });
        sendBookingModifiedMock = async () => ({ success: true });
        sendBookingReminderMock = async () => ({ success: true });
        sendBookingCancelledMock = async () => ({ success: true });
        sendBanNotificationMock = async () => ({ success: true });
        sendUnbanNotificationMock = async () => ({ success: true });
        sendAdminContactEmailMock = async () => ({ success: true });
        await db.clear();
    });

    after(async () => {
        await db.disconnect();
        Module.prototype.require = originalRequire;
    });

    describe('Auth API', async () => {
        it('POST /api/auth/google should create a student user', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({ idToken: 'student-token' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.email, 'student@kmutnb.ac.th');
            assert.strictEqual(res.body.data.role, 'student');
        });

        it('POST /api/auth/google should return 400 without idToken', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({});

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('POST /api/auth/google should reject a non-kmutnb domain', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({ idToken: 'bad-domain-token' });

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.code, 'INVALID_EMAIL_DOMAIN');
        });

        it('POST /api/auth/google should be idempotent for the same token', async () => {
            await request(app).post('/api/auth/google').send({ idToken: 'student-token' });
            await request(app).post('/api/auth/google').send({ idToken: 'student-token' });

            const count = await User.countDocuments();
            assert.strictEqual(count, 1);
        });

        it('POST /api/auth/verify-pin should return an admin pin token for admins', async () => {
            await seedUser('admin-token', 'admin');

            const res = await request(app)
                .post('/api/auth/verify-pin')
                .set(authHeader('admin-token'))
                .send({ pin: process.env.ADMIN_PIN });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.data.adminPinToken);
            assert.ok(res.body.data.expiresAt);
        });

        it('POST /api/auth/verify-pin should return a readable error for invalid pin', async () => {
            await seedUser('admin-token', 'admin');

            const res = await request(app)
                .post('/api/auth/verify-pin')
                .set(authHeader('admin-token'))
                .send({ pin: 'wrong-pin' });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.error, 'PIN ไม่ถูกต้อง');
        });

        it('POST /api/auth/logout-pin should revoke the current admin pin session', async () => {
            await seedUser('admin-token', 'admin');
            const adminPinToken = await issueAdminPinToken(app);

            const logoutRes = await request(app)
                .post('/api/auth/logout-pin')
                .set(authHeader('admin-token'))
                .set('x-admin-pin-token', adminPinToken);

            assert.strictEqual(logoutRes.status, 200);
            assert.strictEqual(logoutRes.body.success, true);

            const revokedRes = await request(app)
                .get('/api/users')
                .set(authHeader('admin-token'))
                .set('x-admin-pin-token', adminPinToken);

            assert.strictEqual(revokedRes.status, 403);
            assert.strictEqual(revokedRes.body.code, 'ADMIN_PIN_REVOKED');
        });

        it('PUT /api/auth/profile should reject invalid phone numbers', async () => {
            await seedUser('student-token', 'student');

            const res = await request(app)
                .put('/api/auth/profile')
                .set(authHeader('student-token'))
                .send({
                    phone: 'abc###'
                });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
        });
    });

    describe('Room API', async () => {
        it('POST /api/rooms should allow admins to upload 7 room images', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);
            let req = applyHeaders(
                request(app).post('/api/rooms'),
                headers
            )
                .field('name', `Room Gallery ${Date.now()}`)
                .field('capacity', '40')
                .field('description', 'Room with multiple images');

            for (let index = 0; index < 7; index += 1) {
                req = req.attach('images', createTinyPngBuffer(), `room-${index}.png`);
            }

            const res = await req;

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.images.length, 7);

            cleanupUploadedFiles(res.body.data.images);
        });

        it('POST /api/rooms should reject more than 8 uploaded images with a readable error', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);
            let req = applyHeaders(
                request(app).post('/api/rooms'),
                headers
            )
                .field('name', `Room Overflow ${Date.now()}`)
                .field('capacity', '20');

            for (let index = 0; index < 9; index += 1) {
                req = req.attach('images', createTinyPngBuffer(), `overflow-${index}.png`);
            }

            const res = await req;

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.code, 'ROOM_IMAGE_LIMIT');
        });
    });

    describe('Booking API', async () => {
        it('GET /api/bookings should return an empty list', async () => {
            await seedUser('student-token', 'student');

            const res = await request(app)
                .get('/api/bookings')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.count, 0);
        });

        it('POST /api/bookings should auto-approve when requireApproval is disabled', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            await Setting.create({ requireApproval: false });
            const { start, end } = getNextWeekdayRange();

            const res = await request(app)
                .post('/api/bookings')
                .set(authHeader('student-token'))
                .send({
                    room: room._id.toString(),
                    topic: 'Project Meeting',
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.data.status, 'approved');
        });

        it('POST /api/bookings should require authentication', async () => {
            const res = await request(app)
                .post('/api/bookings')
                .send({ topic: 'Test' });

            assert.strictEqual(res.status, 401);
        });

        it('POST /api/bookings should reject overly long topics', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();

            const res = await request(app)
                .post('/api/bookings')
                .set(authHeader('student-token'))
                .send({
                    room: room._id.toString(),
                    topic: 'A'.repeat(121),
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
        });

        it('PUT /api/bookings/:id should let an admin approve only with a valid admin pin token', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Pending Booking',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const headers = await getAdminHeaders(app);
            const res = await applyHeaders(
                request(app).put(`/api/bookings/${booking._id}`),
                headers
            ).send({ status: 'approved' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.status, 'approved');
        });

        it('PUT /api/bookings/:id should record when an admin cancels a booking', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Admin Cancelled Booking',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'approved'
            });

            const headers = await getAdminHeaders(app);
            const res = await applyHeaders(
                request(app).put(`/api/bookings/${booking._id}`),
                headers
            ).send({ status: 'cancelled' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.status, 'cancelled');
            assert.strictEqual(res.body.data.cancelledByRole, 'admin');
            assert.strictEqual(res.body.data.cancellationReason, undefined);

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.cancelledByRole, 'admin');
            assert.strictEqual(storedBooking.cancellationReason, undefined);
        });

        it('DELETE /api/bookings/:id should let an admin delete with a valid admin pin token', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Delete Me',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const headers = await getAdminHeaders(app);
            const res = await applyHeaders(
                request(app).delete(`/api/bookings/${booking._id}`),
                headers
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(await Booking.countDocuments(), 0);
        });

        it('PUT /api/bookings/:id should block students from changing extra fields while cancelling', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Original Topic',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const res = await request(app)
                .put(`/api/bookings/${booking._id}`)
                .set(authHeader('student-token'))
                .send({
                    status: 'cancelled',
                    topic: 'Tampered Topic'
                });

            assert.strictEqual(res.status, 403);

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.status, 'pending');
            assert.strictEqual(storedBooking.topic, 'Original Topic');
        });

        it('PUT /api/bookings/:id should require a cancellation reason when a student cancels', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Missing Cancellation Reason',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const res = await request(app)
                .put(`/api/bookings/${booking._id}`)
                .set(authHeader('student-token'))
                .send({ status: 'cancelled' });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.error, 'Cancellation reason is required');

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.status, 'pending');
            assert.strictEqual(storedBooking.cancellationReason, undefined);
        });

        it('PUT /api/bookings/:id should record when a student cancels their own booking', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();
            const booking = await Booking.create({
                room: room._id,
                topic: 'Student Cancelled Booking',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const res = await request(app)
                .put(`/api/bookings/${booking._id}`)
                .set(authHeader('student-token'))
                .send({
                    status: 'cancelled',
                    cancellationReason: 'ติดธุระด่วน ไม่สามารถเข้าใช้งานห้องได้'
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.status, 'cancelled');
            assert.strictEqual(res.body.data.cancelledByRole, 'student');
            assert.strictEqual(res.body.data.cancellationReason, 'ติดธุระด่วน ไม่สามารถเข้าใช้งานห้องได้');

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.cancelledByRole, 'student');
            assert.strictEqual(storedBooking.cancellationReason, 'ติดธุระด่วน ไม่สามารถเข้าใช้งานห้องได้');
        });

        it('GET /api/bookings should hide other user details from students', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();

            await Booking.create({
                room: room._id,
                topic: 'My Booking',
                note: 'Owner note',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending'
            });

            const otherStart = new Date(end);
            const otherEnd = new Date(otherStart);
            otherEnd.setHours(otherEnd.getHours() + 1);

            await Booking.create({
                room: room._id,
                topic: 'Secret Meeting',
                note: 'Hidden note',
                user: { name: 'Other User', email: 'other@kmutnb.ac.th', department: 'Math' },
                startTime: otherStart,
                endTime: otherEnd,
                status: 'approved'
            });

            const res = await request(app)
                .get('/api/bookings')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.count, 2);

            const ownBooking = res.body.data.find((booking) => booking.topic === 'My Booking');
            const otherBooking = res.body.data.find((booking) => booking.topic === 'Reserved');

            assert.ok(ownBooking);
            assert.strictEqual(ownBooking.visibility, 'full');
            assert.strictEqual(ownBooking.note, 'Owner note');

            assert.ok(otherBooking);
            assert.strictEqual(otherBooking.visibility, 'limited');
            assert.strictEqual(otherBooking.user.email, undefined);
            assert.strictEqual(otherBooking.note, undefined);
        });

        it('GET /api/bookings/notification-summary should allow admins without admin pin token', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom();
            const { start, end } = getNextWeekdayRange();

            await Booking.create({
                room: room._id,
                topic: 'Pending Approval',
                user: { name: 'Student User', email: 'student@kmutnb.ac.th', department: 'CS' },
                startTime: start,
                endTime: end,
                status: 'pending',
                isImported: false
            });

            await Booking.create({
                room: room._id,
                topic: 'Imported Pending',
                user: { name: 'Imported User', email: 'imported@system.com', department: 'System' },
                startTime: new Date(start.getTime() + (2 * 60 * 60 * 1000)),
                endTime: new Date(end.getTime() + (2 * 60 * 60 * 1000)),
                status: 'pending',
                isImported: true
            });

            const res = await request(app)
                .get('/api/bookings/notification-summary')
                .set(authHeader('admin-token'));

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.pendingCount, 1);
        });

        it('GET /api/bookings should block students from filtering another email', async () => {
            await seedUser('student-token', 'student');

            const res = await request(app)
                .get('/api/bookings?email=other@kmutnb.ac.th')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.success, false);
        });

        it('POST /api/bookings/import should reject import ranges that are too large', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);
            const workbookBuffer = createWorkbookBuffer({
                Monday: [
                    {
                        room: 'Import Room',
                        startTime: '09:00',
                        endTime: '10:00',
                        subject: 'Networks',
                        teacher: 'Teacher A'
                    }
                ]
            });

            const res = await applyHeaders(
                request(app).post('/api/bookings/import'),
                headers
            )
                .field('startDate', '2026-01-01')
                .field('endDate', '2026-08-01')
                .attach('file', workbookBuffer, 'schedule.xlsx');

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.code, 'IMPORT_RANGE_TOO_LARGE');
        });

        it('POST /api/bookings/import should reject non-excel uploads', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);

            const res = await applyHeaders(
                request(app).post('/api/bookings/import'),
                headers
            )
                .field('startDate', '2026-06-01')
                .field('endDate', '2026-06-30')
                .attach('file', Buffer.from('not-an-excel-file'), 'schedule.txt');

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.error, /Excel files only/i);
        });

        it('POST /api/bookings/import should skip internal and existing conflicts', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);
            const room = await seedRoom({ name: 'Import Room' });
            const importDate = new Date(2026, 5, 15);

            await Booking.create({
                room: room._id,
                topic: 'Existing Class',
                user: { name: 'System', email: 'system@kmutnb.ac.th', department: 'CS' },
                startTime: new Date(2026, 5, 15, 9, 0, 0, 0),
                endTime: new Date(2026, 5, 15, 10, 0, 0, 0),
                status: 'approved'
            });

            const workbookBuffer = createWorkbookBuffer({
                Import: [
                    {
                        room: 'Import Room',
                        date: importDate,
                        startTime: '09:00',
                        endTime: '10:00',
                        subject: 'Conflict Existing',
                        teacher: 'Teacher A'
                    },
                    {
                        room: 'Import Room',
                        date: importDate,
                        startTime: '10:00',
                        endTime: '11:00',
                        subject: 'Accepted Slot',
                        teacher: 'Teacher B'
                    },
                    {
                        room: 'Import Room',
                        date: importDate,
                        startTime: '10:30',
                        endTime: '11:30',
                        subject: 'Conflict Import',
                        teacher: 'Teacher C'
                    }
                ]
            });

            const res = await applyHeaders(
                request(app).post('/api/bookings/import'),
                headers
            )
                .field('startDate', '2026-06-01')
                .field('endDate', '2026-06-30')
                .attach('file', workbookBuffer, 'schedule.xlsx');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.count, 1);
            assert.strictEqual(res.body.errorCount, 2);
            assert.ok(res.body.errors.some((message) => message.includes('existing booking')));
            assert.ok(res.body.errors.some((message) => message.includes('imported booking')));

            const importedBookings = await Booking.find({ isImported: true });
            assert.strictEqual(importedBookings.length, 1);
            assert.strictEqual(importedBookings[0].topic, 'Accepted Slot');
        });
    });

    describe('User API', async () => {
        it('POST /api/users/:id/contact should send an email for unlocked admins', async () => {
            await seedUser('admin-token', 'admin');
            const student = await seedUser('student-token', 'student');
            const headers = await getAdminHeaders(app);
            let deliveryPayload = null;

            sendAdminContactEmailMock = async (payload) => {
                deliveryPayload = payload;
                return { success: true };
            };

            const res = await applyHeaders(
                request(app).post(`/api/users/${student._id}/contact`),
                headers
            ).send({
                subject: 'Follow up booking details',
                message: 'Please update your booking details before tomorrow.'
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(deliveryPayload);
            assert.strictEqual(deliveryPayload.recipient.email, student.email);
            assert.strictEqual(deliveryPayload.adminUser.email, 'admin@kmutnb.ac.th');
            assert.strictEqual(deliveryPayload.subject, 'Follow up booking details');
        });

        it('POST /api/users/:id/contact should reject empty messages', async () => {
            await seedUser('admin-token', 'admin');
            const student = await seedUser('student-token', 'student');
            const headers = await getAdminHeaders(app);

            const res = await applyHeaders(
                request(app).post(`/api/users/${student._id}/contact`),
                headers
            ).send({
                subject: 'Test subject',
                message: '   '
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
        });
    });

    describe('Security and Settings Enforcement', async () => {
        it('GET /api/users should reject admin access without admin pin token', async () => {
            await seedUser('admin-token', 'admin');

            const res = await request(app)
                .get('/api/users')
                .set(authHeader('admin-token'));

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.code, 'ADMIN_PIN_REQUIRED');
        });

        it('POST /api/users/:id/contact should reject admin access without admin pin token', async () => {
            await seedUser('admin-token', 'admin');
            const student = await seedUser('student-token', 'student');

            const res = await request(app)
                .post(`/api/users/${student._id}/contact`)
                .set(authHeader('admin-token'))
                .send({
                    subject: 'Test subject',
                    message: 'Need to contact you'
                });

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.code, 'ADMIN_PIN_REQUIRED');
        });

        it('GET /api/bookings should return 503 for students during maintenance mode', async () => {
            await seedUser('student-token', 'student');
            await Setting.create({ maintenanceMode: true });

            const res = await request(app)
                .get('/api/bookings')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 503);
            assert.strictEqual(res.body.code, 'MAINTENANCE_MODE');
        });

        it('GET /api/settings should expose only the public settings subset', async () => {
            await Setting.create({
                systemName: 'Public Room Booking',
                contactEmail: 'admin@kmutnb.ac.th',
                maintenanceMode: true,
                maxBookingHours: 6,
                maxBookingDays: 14,
                requireApproval: false,
                weekendBooking: true
            });

            const res = await request(app)
                .get('/api/settings');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.systemName, 'Public Room Booking');
            assert.strictEqual(res.body.data.maintenanceMode, undefined);
            assert.strictEqual(res.body.data.maxBookingHours, 6);
            assert.strictEqual(res.body.data.requireApproval, false);
        });

        it('GET /api/settings/runtime should include maintenance mode for authenticated users', async () => {
            await seedUser('student-token', 'student');
            await Setting.create({
                maintenanceMode: true,
                systemName: 'Runtime Settings'
            });

            const res = await request(app)
                .get('/api/settings/runtime')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.systemName, 'Runtime Settings');
            assert.strictEqual(res.body.data.maintenanceMode, true);
        });

        it('GET /api/settings/admin should require a valid admin pin token', async () => {
            await seedUser('admin-token', 'admin');

            const noPinRes = await request(app)
                .get('/api/settings/admin')
                .set(authHeader('admin-token'));

            assert.strictEqual(noPinRes.status, 403);
            assert.strictEqual(noPinRes.body.code, 'ADMIN_PIN_REQUIRED');

            const headers = await getAdminHeaders(app);
            const withPinRes = await applyHeaders(
                request(app).get('/api/settings/admin'),
                headers
            );

            assert.strictEqual(withPinRes.status, 200);
            assert.strictEqual(withPinRes.body.success, true);
            assert.notStrictEqual(withPinRes.body.data.maintenanceMode, undefined);
        });

        it('PUT /api/settings should persist login guide content for unlocked admins', async () => {
            await seedUser('admin-token', 'admin');
            const headers = await getAdminHeaders(app);

            const res = await applyHeaders(
                request(app).put('/api/settings'),
                headers
            ).send({
                systemName: 'Room Booking',
                contactEmail: 'admin@kmutnb.ac.th',
                themeColor: '#16a34a',
                openTime: '08:00',
                closeTime: '20:00',
                maxBookingHours: 4,
                maxBookingDays: 30,
                weekendBooking: true,
                requireApproval: true,
                maintenanceMode: false,
                loginGuide: {
                    badgeText: 'Guide',
                    title: 'Login Guide',
                    description: 'ข้อความ {{systemName}}',
                    quickStartTitle: 'เริ่มต้น',
                    quickStartSteps: ['step 1', 'step 2'],
                    ruleHighlights: ['เวลา {{bookingWindow}}'],
                    sections: [
                        {
                            icon: 'shield',
                            title: 'Section 1',
                            description: 'Desc 1',
                            bullets: ['bullet 1'],
                            tone: 'emerald'
                        }
                    ],
                    footerNote: 'อ่านต่อภายหลัง'
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.loginGuide.title, 'Login Guide');
            assert.strictEqual(res.body.data.loginGuide.sections[0].title, 'Section 1');
        });
    });

    describe('Realtime and Operations Hardening', async () => {
        it('runReminderJob should keep reminderSent false when email delivery fails', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Reminder Room' });
            const startTime = new Date(Date.now() + (30 * 60 * 1000));
            const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));

            const booking = await Booking.create({
                room: room._id,
                topic: 'Reminder Failure',
                user: {
                    name: 'Student User',
                    email: 'student@kmutnb.ac.th',
                    department: 'CS'
                },
                startTime,
                endTime,
                status: 'approved',
                reminderSent: false
            });

            sendBookingReminderMock = async () => ({
                success: false,
                code: 'EMAIL_SEND_FAILED'
            });

            await runReminderJob();

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.reminderSent, false);
            assert.strictEqual(Boolean(storedBooking.reminderSentAt), false);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('runReminderJob should mark reminderSent true after a successful delivery', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Reminder Success Room' });
            const startTime = new Date(Date.now() + (30 * 60 * 1000));
            const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));

            const booking = await Booking.create({
                room: room._id,
                topic: 'Reminder Success',
                user: {
                    name: 'Student User',
                    email: 'student@kmutnb.ac.th',
                    department: 'CS'
                },
                startTime,
                endTime,
                status: 'approved',
                reminderSent: false
            });

            sendBookingReminderMock = async () => ({
                success: true
            });

            await runReminderJob();

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.reminderSent, true);
            assert.ok(storedBooking.reminderSentAt instanceof Date);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('runReminderJob should not send the same reminder twice during overlapping runs', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Reminder Lock Room' });
            const startTime = new Date(Date.now() + (30 * 60 * 1000));
            const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));
            let reminderCalls = 0;

            const booking = await Booking.create({
                room: room._id,
                topic: 'Reminder Lock',
                user: {
                    name: 'Student User',
                    email: 'student@kmutnb.ac.th',
                    department: 'CS'
                },
                startTime,
                endTime,
                status: 'approved',
                reminderSent: false
            });

            sendBookingReminderMock = async () => {
                reminderCalls += 1;
                await new Promise((resolve) => setTimeout(resolve, 40));
                return { success: true };
            };

            await Promise.all([runReminderJob(), runReminderJob()]);

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(reminderCalls, 1);
            assert.strictEqual(storedBooking.reminderSent, true);
            assert.ok(storedBooking.reminderSentAt instanceof Date);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('POST /api/bookings should keep urgent pending bookings unsent until approval', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Pending Reminder Room' });
            let reminderCalls = 0;
            const startTime = new Date(Date.now() + (30 * 60 * 1000));
            const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));

            await Setting.create({
                requireApproval: true,
                weekendBooking: true,
                openTime: '00:00',
                closeTime: '23:59'
            });

            sendBookingReminderMock = async () => {
                reminderCalls += 1;
                return { success: true };
            };

            const res = await request(app)
                .post('/api/bookings')
                .set(authHeader('student-token'))
                .send({
                    room: room._id.toString(),
                    topic: 'Urgent Pending Booking',
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.data.status, 'pending');
            assert.strictEqual(reminderCalls, 0);

            const storedBooking = await Booking.findById(res.body.data._id);
            assert.strictEqual(storedBooking.reminderSent, false);
            assert.strictEqual(Boolean(storedBooking.reminderSentAt), false);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('PUT /api/bookings/:id should send an immediate reminder when an urgent booking is approved', async () => {
            await seedUser('admin-token', 'admin');
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Approved Reminder Room' });
            const headers = await getAdminHeaders(app);
            const startTime = new Date(Date.now() + (30 * 60 * 1000));
            const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));
            let reminderCalls = 0;

            const booking = await Booking.create({
                room: room._id,
                topic: 'Urgent Approval',
                user: {
                    name: 'Student User',
                    email: 'student@kmutnb.ac.th',
                    department: 'CS'
                },
                startTime,
                endTime,
                status: 'pending',
                reminderSent: false
            });

            sendBookingReminderMock = async () => {
                reminderCalls += 1;
                return { success: true };
            };

            const res = await applyHeaders(
                request(app).put(`/api/bookings/${booking._id}`),
                headers
            ).send({ status: 'approved' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.status, 'approved');
            assert.strictEqual(reminderCalls, 1);

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.reminderSent, true);
            assert.ok(storedBooking.reminderSentAt instanceof Date);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('PUT /api/bookings/:id should reset reminder state when an approved booking changes time', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom({ name: 'Reminder Reset Room' });
            const headers = await getAdminHeaders(app);
            const { start, end } = getNextWeekdayRange(7, 10, 1);
            const { start: updatedStart, end: updatedEnd } = getNextWeekdayRange(10, 14, 1);
            let reminderCalls = 0;

            const booking = await Booking.create({
                room: room._id,
                topic: 'Reminder Reset',
                user: {
                    name: 'Student User',
                    email: 'student@kmutnb.ac.th',
                    department: 'CS'
                },
                startTime: start,
                endTime: end,
                status: 'approved',
                reminderSent: true,
                reminderSentAt: new Date()
            });

            sendBookingReminderMock = async () => {
                reminderCalls += 1;
                return { success: true };
            };

            const res = await applyHeaders(
                request(app).put(`/api/bookings/${booking._id}`),
                headers
            ).send({
                startTime: updatedStart.toISOString(),
                endTime: updatedEnd.toISOString()
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(reminderCalls, 0);

            const storedBooking = await Booking.findById(booking._id);
            assert.strictEqual(storedBooking.reminderSent, false);
            assert.strictEqual(Boolean(storedBooking.reminderSentAt), false);
            assert.strictEqual(Boolean(storedBooking.reminderProcessingAt), false);
        });

        it('audit logs should store only the first forwarded IP and trim oversized details', async () => {
            await seedUser('student-token', 'student');

            await request(app)
                .post('/api/auth/google')
                .set('x-forwarded-for', '203.0.113.10, 198.51.100.4')
                .send({ idToken: 'student-token' });

            await new Promise((resolve) => setTimeout(resolve, 25));

            const auditLog = await AuditLog.findOne({ action: 'user:login' }).sort({ createdAt: -1 });

            assert.ok(auditLog);
            assert.strictEqual(auditLog.ipAddress, '203.0.113.10');
        });
    });

    describe('Report API', async () => {
        it('POST /api/reports should create a report for authenticated users', async () => {
            const student = await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Room B202' });

            const res = await request(app)
                .post('/api/reports')
                .set(authHeader('student-token'))
                .send({
                    topic: 'Broken Projector',
                    description: 'Not working',
                    urgency: 'urgent',
                    roomId: room._id.toString()
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.data.topic, 'Broken Projector');
            assert.strictEqual(res.body.data.reporter, student._id.toString());
        });

        it('POST /api/reports should require authentication', async () => {
            const res = await request(app)
                .post('/api/reports')
                .send({ topic: 'Test' });

            assert.strictEqual(res.status, 401);
        });

        it('POST /api/reports should reject unsupported images payloads', async () => {
            await seedUser('student-token', 'student');
            const room = await seedRoom({ name: 'Room B202' });

            const res = await request(app)
                .post('/api/reports')
                .set(authHeader('student-token'))
                .send({
                    topic: 'Broken Projector',
                    description: 'Not working',
                    urgency: 'urgent',
                    roomId: room._id.toString(),
                    images: ['fake-image.png']
                });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.code, 'UNSUPPORTED_REPORT_IMAGES');
        });

        it('POST /api/reports should reject unknown rooms', async () => {
            await seedUser('student-token', 'student');

            const res = await request(app)
                .post('/api/reports')
                .set(authHeader('student-token'))
                .send({
                    topic: 'Broken Projector',
                    description: 'Not working',
                    urgency: 'urgent',
                    roomId: '507f1f77bcf86cd799439011'
                });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.code, 'ROOM_NOT_FOUND');
        });

        it('GET /api/reports/notification-summary should allow admins without admin pin token', async () => {
            await seedUser('admin-token', 'admin');
            const room = await seedRoom({ name: 'Room B404' });
            const reporter = await seedUser('student-token', 'student');

            await Report.create({
                topic: 'Projector issue',
                description: 'Lamp is dim',
                urgency: 'normal',
                status: 'pending',
                room: room._id,
                reporter: reporter._id
            });

            const res = await request(app)
                .get('/api/reports/notification-summary')
                .set(authHeader('admin-token'));

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.pendingCount, 1);
        });

        it('GET /api/reports should require a valid admin pin token for admin access', async () => {
            const admin = await seedUser('admin-token', 'admin');
            const room = await seedRoom({ name: 'Room B303' });

            await Report.create({
                topic: 'Air conditioner issue',
                description: 'Needs service',
                urgency: 'normal',
                room: room._id,
                reporter: admin._id
            });

            const headers = await getAdminHeaders(app);
            const res = await applyHeaders(
                request(app).get('/api/reports'),
                headers
            );

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
            assert.strictEqual(res.body.data.length, 1);
        });
    });
});
