const { verifyAdminPinToken: defaultVerifyAdminPinToken } = require('../services/adminPinTokenService');
const { ADMIN_NOTIFICATION_ROOM: defaultAdminNotificationRoom } = require('../services/adminNotificationService');

const DEFAULT_REVALIDATE_INTERVAL_MS = 30 * 1000;

const attachAdminNotificationSocket = (io, options = {}) => {
    const UserModel = options.UserModel || require('../models/User');
    const firebaseAuth = options.firebaseAuth || require('../config/firebaseAdmin').auth();
    const verifyAdminPinToken = options.verifyAdminPinToken || defaultVerifyAdminPinToken;
    const adminNotificationRoom = options.adminNotificationRoom || defaultAdminNotificationRoom;
    const revalidateIntervalMs = options.revalidateIntervalMs || DEFAULT_REVALIDATE_INTERVAL_MS;

    io.on('connection', (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        const clearAdminPinSessionState = () => {
            if (socket.data.adminPinExpiryTimer) {
                clearTimeout(socket.data.adminPinExpiryTimer);
                socket.data.adminPinExpiryTimer = null;
            }

            socket.data.adminPinToken = null;
            socket.data.adminPinExpiresAt = null;
        };

        const clearAdminRealtimeAccess = () => {
            if (socket.data.adminAccessInterval) {
                clearInterval(socket.data.adminAccessInterval);
                socket.data.adminAccessInterval = null;
            }

            clearAdminPinSessionState();
            socket.leave(adminNotificationRoom);
            socket.data.adminUserId = null;
            socket.data.adminEmail = null;
        };

        const activateAdminPinSessionState = (adminPinToken, payload) => {
            clearAdminPinSessionState();

            socket.data.adminPinToken = adminPinToken;
            socket.data.adminPinExpiresAt = payload.exp * 1000;

            const expiresInMs = socket.data.adminPinExpiresAt - Date.now();
            if (expiresInMs <= 0) {
                clearAdminPinSessionState();
                socket.emit('admin:session:expired', {
                    code: 'ADMIN_PIN_EXPIRED',
                    error: 'Admin PIN session has expired'
                });
                return;
            }

            socket.data.adminPinExpiryTimer = setTimeout(() => {
                clearAdminPinSessionState();
                socket.emit('admin:session:expired', {
                    code: 'ADMIN_PIN_EXPIRED',
                    error: 'Admin PIN session has expired'
                });
            }, expiresInMs + 250);
        };

        const startAdminRealtimeRevalidation = () => {
            if (socket.data.adminAccessInterval) {
                clearInterval(socket.data.adminAccessInterval);
            }

            socket.data.adminAccessInterval = setInterval(async () => {
                try {
                    if (!socket.data.adminUserId || !socket.data.adminEmail) {
                        return;
                    }

                    const user = await UserModel.findById(socket.data.adminUserId).select('email role isBanned');
                    const normalizedEmail = user?.email?.toLowerCase().trim();

                    if (!user || user.role !== 'admin' || user.isBanned || normalizedEmail !== socket.data.adminEmail) {
                        clearAdminRealtimeAccess();
                        socket.emit('admin:join:denied', {
                            code: 'ADMIN_ACCESS_REVOKED',
                            error: 'Admin access revoked'
                        });
                        return;
                    }

                    if (socket.data.adminPinToken) {
                        const verification = verifyAdminPinToken(socket.data.adminPinToken, user);
                        if (!verification.valid) {
                            clearAdminPinSessionState();
                            socket.emit('admin:session:expired', {
                                code: verification.code,
                                error: verification.error
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Socket.io] Admin revalidation failed for ${socket.id}: ${error.message}`);
                }
            }, revalidateIntervalMs);
        };

        socket.on('join-admin', async ({ token, adminPinToken } = {}) => {
            clearAdminRealtimeAccess();

            if (!token) {
                socket.emit('admin:join:denied', {
                    code: 'ADMIN_AUTH_REQUIRED',
                    error: 'Missing token'
                });
                return;
            }

            try {
                const decodedToken = await firebaseAuth.verifyIdToken(token);
                const email = decodedToken.email?.toLowerCase().trim();

                if (!email) {
                    socket.emit('admin:join:denied', {
                        code: 'ADMIN_AUTH_INVALID',
                        error: 'Invalid token payload'
                    });
                    return;
                }

                const user = await UserModel.findOne({ email }).select('email role isBanned');
                if (!user || user.role !== 'admin' || user.isBanned) {
                    socket.emit('admin:join:denied', {
                        code: 'ADMIN_ACCESS_REVOKED',
                        error: 'Not authorized as admin'
                    });
                    return;
                }

                socket.data.adminUserId = String(user._id);
                socket.data.adminEmail = email;
                socket.join(adminNotificationRoom);

                if (adminPinToken) {
                    const pinVerification = verifyAdminPinToken(adminPinToken, user);
                    if (pinVerification.valid) {
                        activateAdminPinSessionState(adminPinToken, pinVerification.payload);
                    } else {
                        socket.emit('admin:session:expired', {
                            code: pinVerification.code,
                            error: pinVerification.error
                        });
                    }
                }

                startAdminRealtimeRevalidation();

                socket.emit('admin:join:confirmed', {
                    adminUnlocked: Boolean(socket.data.adminPinToken),
                    adminPinExpiresAt: socket.data.adminPinExpiresAt
                        ? new Date(socket.data.adminPinExpiresAt).toISOString()
                        : null
                });
                console.log(`[Socket.io] ${socket.id} joined ${adminNotificationRoom}`);
            } catch (error) {
                console.error(`[Socket.io] Admin join denied for ${socket.id}: ${error.message}`);
                socket.emit('admin:join:denied', {
                    code: 'ADMIN_AUTH_INVALID',
                    error: 'Admin authorization failed'
                });
            }
        });

        socket.on('leave-admin', () => {
            clearAdminRealtimeAccess();
            socket.emit('admin:left');
        });

        socket.on('disconnect', () => {
            clearAdminRealtimeAccess();
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });
};

module.exports = {
    attachAdminNotificationSocket
};
