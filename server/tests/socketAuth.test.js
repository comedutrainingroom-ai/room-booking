const { describe, it } = require('node:test');
const assert = require('node:assert');

const { attachAdminNotificationSocket } = require('../socket/adminNotificationSocket');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createQueryResult = (value) => ({
    select: async () => value
});

const createFakeIo = () => ({
    handlers: {},
    on(event, handler) {
        this.handlers[event] = handler;
    }
});

const createFakeSocket = () => ({
    id: 'socket-1',
    data: {},
    handlers: {},
    emitted: [],
    joinedRooms: [],
    leftRooms: [],
    on(event, handler) {
        this.handlers[event] = handler;
    },
    emit(event, payload) {
        this.emitted.push({ event, payload });
    },
    join(room) {
        this.joinedRooms.push(room);
    },
    leave(room) {
        this.leftRooms.push(room);
    }
});

describe('admin notification socket auth', async () => {
    it('should deny join-admin for non-admin users', async () => {
        const io = createFakeIo();
        const socket = createFakeSocket();

        attachAdminNotificationSocket(io, {
            firebaseAuth: {
                verifyIdToken: async () => ({ email: 'student@kmutnb.ac.th' })
            },
            UserModel: {
                findOne: () => createQueryResult({
                    _id: 'user-1',
                    email: 'student@kmutnb.ac.th',
                    role: 'student',
                    isBanned: false
                })
            },
            revalidateIntervalMs: 1000
        });

        io.handlers.connection(socket);
        await socket.handlers['join-admin']({ token: 'student-token' });

        assert.deepStrictEqual(socket.joinedRooms, []);
        assert.ok(socket.emitted.some((event) => (
            event.event === 'admin:join:denied' &&
            event.payload?.code === 'ADMIN_ACCESS_REVOKED'
        )));
    });

    it('should confirm join-admin and preserve unlocked state when pin token is valid', async () => {
        const io = createFakeIo();
        const socket = createFakeSocket();
        const adminUser = {
            _id: 'admin-1',
            email: 'admin@kmutnb.ac.th',
            role: 'admin',
            isBanned: false
        };

        attachAdminNotificationSocket(io, {
            firebaseAuth: {
                verifyIdToken: async () => ({ email: adminUser.email })
            },
            UserModel: {
                findOne: () => createQueryResult(adminUser),
                findById: () => createQueryResult(adminUser)
            },
            verifyAdminPinToken: () => ({
                valid: true,
                payload: {
                    exp: Math.floor(Date.now() / 1000) + 60
                }
            }),
            adminNotificationRoom: 'admin-notification-room',
            revalidateIntervalMs: 1000
        });

        io.handlers.connection(socket);
        await socket.handlers['join-admin']({
            token: 'admin-token',
            adminPinToken: 'valid-pin-token'
        });

        const confirmedEvent = socket.emitted.find((event) => event.event === 'admin:join:confirmed');

        assert.ok(socket.joinedRooms.includes('admin-notification-room'));
        assert.ok(confirmedEvent);
        assert.strictEqual(confirmedEvent.payload.adminUnlocked, true);
        assert.ok(confirmedEvent.payload.adminPinExpiresAt);

        socket.handlers['leave-admin']();
    });

    it('should revoke realtime admin access during revalidation when role changes', async () => {
        const io = createFakeIo();
        const socket = createFakeSocket();
        const adminUser = {
            _id: 'admin-1',
            email: 'admin@kmutnb.ac.th',
            role: 'admin',
            isBanned: false
        };
        let currentUserState = adminUser;

        attachAdminNotificationSocket(io, {
            firebaseAuth: {
                verifyIdToken: async () => ({ email: adminUser.email })
            },
            UserModel: {
                findOne: () => createQueryResult(adminUser),
                findById: () => createQueryResult(currentUserState)
            },
            revalidateIntervalMs: 10
        });

        io.handlers.connection(socket);
        await socket.handlers['join-admin']({ token: 'admin-token' });

        currentUserState = {
            ...adminUser,
            role: 'student'
        };

        await sleep(30);

        assert.ok(socket.leftRooms.length >= 1);
        assert.ok(socket.emitted.some((event) => (
            event.event === 'admin:join:denied' &&
            event.payload?.code === 'ADMIN_ACCESS_REVOKED'
        )));

        socket.handlers.disconnect();
    });
});
