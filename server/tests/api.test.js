/**
 * Server API Integration Tests
 * Using Node.js native test runner + Supertest + MongoDB Memory Server
 * 
 * We avoid Jest mocking because Express v5 has module resolution conflicts with Jest.
 * Instead, we manually intercept requires before loading the app.
 */
process.env.ADMIN_PIN = 'test-pin-1234';
process.env.NODE_ENV = 'test';

const Module = require('module');
const originalRequire = Module.prototype.require;

// Manual module mocking (before any app modules load)
Module.prototype.require = function (id) {
    // Mock Firebase Admin
    if (id.endsWith('config/firebaseAdmin') || id.endsWith('config\\firebaseAdmin')) {
        return {
            auth: () => ({
                verifyIdToken: async (token) => {
                    if (token === 'bad-domain-token') {
                        return { email: 'hacker@gmail.com', name: 'Hacker', picture: '' };
                    }
                    return {
                        email: 'test@kmutnb.ac.th',
                        name: 'Test User',
                        picture: 'http://example.com/photo.jpg'
                    };
                }
            })
        };
    }
    // Mock Email Service
    if (id.endsWith('services/emailService') || id.endsWith('services\\emailService')) {
        return {
            sendBookingCreated: async () => { },
            sendBookingApproved: async () => { },
            sendBookingModified: async () => { },
            sendBookingReminder: async () => { },
            sendBookingCancelled: async () => { },
        };
    }
    return originalRequire.apply(this, arguments);
};

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const db = require('./setup');
const express = require('express');

// Models (loaded after mocks)
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

// Create test app
function createTestApp() {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.set('io', { to: () => ({ emit: () => { } }) });

    app.use('/api/rooms', require('../routes/roomRoutes'));
    app.use('/api/bookings', require('../routes/bookingRoutes'));
    app.use('/api/settings', require('../routes/settingsRoutes'));
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/reports', require('../routes/reportRoutes'));
    app.use('/api/users', require('../routes/userRoutes'));

    return app;
}

let app;

// ============================================
// Test Suite
// ============================================
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

    // ------------------------------------------
    // Auth
    // ------------------------------------------
    describe('Auth API', async () => {
        it('POST /api/auth/google — should create user', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({ idToken: 'valid-token' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.email, 'test@kmutnb.ac.th');
            assert.strictEqual(res.body.data.role, 'student');
        });

        it('POST /api/auth/google — should return 400 without idToken', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({});

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('POST /api/auth/google — should reject non-kmutnb domain', async () => {
            const res = await request(app)
                .post('/api/auth/google')
                .send({ idToken: 'bad-domain-token' });

            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.body.code, 'INVALID_EMAIL_DOMAIN');
        });

        it('POST /api/auth/google — idempotent login', async () => {
            await request(app).post('/api/auth/google').send({ idToken: 'valid-token' });
            await request(app).post('/api/auth/google').send({ idToken: 'valid-token' });

            const count = await User.countDocuments();
            assert.strictEqual(count, 1);
        });
    });

    // ------------------------------------------
    // Bookings
    // ------------------------------------------
    describe('Booking API', async () => {
        let testRoom;

        async function seedData() {
            await User.create({ email: 'test@kmutnb.ac.th', name: 'Test User', role: 'admin' });
            testRoom = await Room.create({ name: 'Room A101', capacity: 30, isActive: true });
        }

        it('GET /api/bookings — should return empty', async () => {
            const res = await request(app).get('/api/bookings');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.count, 0);
        });

        it('GET /api/bookings — should return bookings', async () => {
            await seedData();
            await Booking.create({
                room: testRoom._id,
                topic: 'Test Meeting',
                user: { name: 'Test User', email: 'test@kmutnb.ac.th', department: 'CS' },
                startTime: new Date('2026-04-01T09:00:00'),
                endTime: new Date('2026-04-01T10:00:00'),
                status: 'pending'
            });

            const res = await request(app).get('/api/bookings');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.count, 1);
            assert.strictEqual(res.body.data[0].topic, 'Test Meeting');
        });

        it('POST /api/bookings — should create booking', async () => {
            await seedData();
            const res = await request(app)
                .post('/api/bookings')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    room: testRoom._id.toString(),
                    topic: 'New Meeting',
                    user: { name: 'Test', email: 'test@kmutnb.ac.th', department: 'CS' },
                    startTime: new Date('2026-04-01T09:00:00').toISOString(),
                    endTime: new Date('2026-04-01T10:00:00').toISOString()
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.data.topic, 'New Meeting');
            assert.strictEqual(res.body.data.status, 'pending');
        });

        it('POST /api/bookings — should require auth', async () => {
            const res = await request(app)
                .post('/api/bookings')
                .send({ topic: 'Test' });

            assert.strictEqual(res.status, 401);
        });

        it('PUT /api/bookings/:id — admin can approve', async () => {
            await seedData();
            const booking = await Booking.create({
                room: testRoom._id,
                topic: 'Pending',
                user: { name: 'Test', email: 'test@kmutnb.ac.th', department: 'CS' },
                startTime: new Date('2026-04-01T09:00:00'),
                endTime: new Date('2026-04-01T10:00:00'),
                status: 'pending'
            });

            const res = await request(app)
                .put(`/api/bookings/${booking._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({ status: 'approved' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.status, 'approved');
        });

        it('DELETE /api/bookings/:id — admin can delete', async () => {
            await seedData();
            const booking = await Booking.create({
                room: testRoom._id,
                topic: 'To Delete',
                user: { name: 'Test', email: 'test@kmutnb.ac.th', department: 'CS' },
                startTime: new Date('2026-04-01T09:00:00'),
                endTime: new Date('2026-04-01T10:00:00'),
                status: 'pending'
            });

            const res = await request(app)
                .delete(`/api/bookings/${booking._id}`)
                .set('Authorization', 'Bearer valid-token');

            assert.strictEqual(res.status, 200);
            const count = await Booking.countDocuments();
            assert.strictEqual(count, 0);
        });
    });

    // ------------------------------------------
    // Reports
    // ------------------------------------------
    describe('Report API', async () => {
        let testRoom;

        async function seedData() {
            await User.create({ email: 'test@kmutnb.ac.th', name: 'Test User', role: 'admin' });
            testRoom = await Room.create({ name: 'Room B202', capacity: 20, isActive: true });
        }

        it('POST /api/reports — should create report', async () => {
            await seedData();
            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    topic: 'Broken Projector',
                    description: 'Not working',
                    urgency: 'urgent',
                    roomId: testRoom._id.toString()
                });

            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.data.topic, 'Broken Projector');
        });

        it('POST /api/reports — should require auth', async () => {
            const res = await request(app)
                .post('/api/reports')
                .send({ topic: 'Test' });

            assert.strictEqual(res.status, 401);
        });

        it('GET /api/reports — admin gets all reports', async () => {
            await seedData();
            const res = await request(app)
                .get('/api/reports')
                .set('Authorization', 'Bearer valid-token');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data));
        });
    });
});
