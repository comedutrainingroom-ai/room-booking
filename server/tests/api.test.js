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
            sendBookingCreated: async () => {},
            sendBookingApproved: async () => {},
            sendBookingModified: async () => {},
            sendBookingReminder: async () => {},
            sendBookingCancelled: async () => {},
            sendBanNotification: async () => {},
            sendUnbanNotification: async () => {}
        };
    }

    return originalRequire.apply(this, arguments);
};

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');
const db = require('./setup');

const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Setting = require('../models/Setting');
const Report = require('../models/Report');

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

        it('GET /api/bookings should block students from filtering another email', async () => {
            await seedUser('student-token', 'student');

            const res = await request(app)
                .get('/api/bookings?email=other@kmutnb.ac.th')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.success, false);
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

        it('GET /api/bookings should return 503 for students during maintenance mode', async () => {
            await seedUser('student-token', 'student');
            await Setting.create({ maintenanceMode: true });

            const res = await request(app)
                .get('/api/bookings')
                .set(authHeader('student-token'));

            assert.strictEqual(res.status, 503);
            assert.strictEqual(res.body.code, 'MAINTENANCE_MODE');
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
