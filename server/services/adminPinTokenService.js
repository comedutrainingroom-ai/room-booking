const crypto = require('crypto');

const TOKEN_HEADER_NAME = 'x-admin-pin-token';
const DEFAULT_TTL_MINUTES = 480;
const activeSessions = new Map();
const sessionsByUserId = new Map();

const safeEqual = (left, right) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getTokenSecret = () => {
    if (process.env.ADMIN_PIN_TOKEN_SECRET) {
        return process.env.ADMIN_PIN_TOKEN_SECRET;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_PIN_TOKEN_SECRET environment variable is required in production');
    }

    return `dev-admin-pin-token-secret:${process.env.ADMIN_PIN || 'dev-admin-pin'}`;
};

const getTokenTtlMinutes = () => {
    const parsedValue = Number(process.env.ADMIN_PIN_TOKEN_TTL_MINUTES);

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }

    return DEFAULT_TTL_MINUTES;
};

const signEncodedPayload = (encodedPayload) => (
    crypto.createHmac('sha256', getTokenSecret()).update(encodedPayload).digest('base64url')
);

const cleanupSessionIndex = (sessionId, userId) => {
    const userKey = String(userId);
    const userSessions = sessionsByUserId.get(userKey);

    if (!userSessions) {
        return;
    }

    userSessions.delete(sessionId);

    if (userSessions.size === 0) {
        sessionsByUserId.delete(userKey);
    }
};

const revokeSessionById = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return false;
    }

    activeSessions.delete(sessionId);
    cleanupSessionIndex(sessionId, session.userId);
    return true;
};

const pruneExpiredSessions = () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.exp <= nowInSeconds) {
            revokeSessionById(sessionId);
        }
    }
};

const decodeToken = (token) => {
    const [encodedPayload, providedSignature, ...extraParts] = String(token || '').split('.');

    if (!encodedPayload || !providedSignature || extraParts.length > 0) {
        return {
            valid: false,
            code: 'ADMIN_PIN_INVALID',
            error: 'Admin PIN session is invalid'
        };
    }

    const expectedSignature = signEncodedPayload(encodedPayload);
    if (!safeEqual(providedSignature, expectedSignature)) {
        return {
            valid: false,
            code: 'ADMIN_PIN_INVALID',
            error: 'Admin PIN session is invalid'
        };
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch (error) {
        return {
            valid: false,
            code: 'ADMIN_PIN_INVALID',
            error: 'Admin PIN session is invalid'
        };
    }

    if (payload.purpose !== 'admin-pin' || !payload.sub || !payload.email || !payload.exp || !payload.sid) {
        return {
            valid: false,
            code: 'ADMIN_PIN_INVALID',
            error: 'Admin PIN session is invalid'
        };
    }

    return {
        valid: true,
        payload
    };
};

const createAdminPinToken = ({ userId, email }) => {
    pruneExpiredSessions();

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = nowInSeconds + (getTokenTtlMinutes() * 60);
    const sessionId = crypto.randomUUID();

    const payload = {
        sid: sessionId,
        sub: String(userId),
        email: String(email).toLowerCase().trim(),
        purpose: 'admin-pin',
        iat: nowInSeconds,
        exp: expiresInSeconds
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signEncodedPayload(encodedPayload);
    const normalizedUserId = String(userId);

    activeSessions.set(sessionId, {
        sessionId,
        userId: normalizedUserId,
        email: payload.email,
        exp: expiresInSeconds
    });

    if (!sessionsByUserId.has(normalizedUserId)) {
        sessionsByUserId.set(normalizedUserId, new Set());
    }

    sessionsByUserId.get(normalizedUserId).add(sessionId);

    return {
        token: `${encodedPayload}.${signature}`,
        expiresAt: new Date(expiresInSeconds * 1000).toISOString()
    };
};

const verifyAdminPinToken = (token, expectedUser = null) => {
    if (!token) {
        return {
            valid: false,
            code: 'ADMIN_PIN_REQUIRED',
            error: 'Admin PIN verification required'
        };
    }

    pruneExpiredSessions();

    const decodedToken = decodeToken(token);
    if (!decodedToken.valid) {
        return decodedToken;
    }

    const { payload } = decodedToken;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
        revokeSessionById(payload.sid);
        return {
            valid: false,
            code: 'ADMIN_PIN_EXPIRED',
            error: 'Admin PIN session has expired'
        };
    }

    const activeSession = activeSessions.get(payload.sid);
    if (!activeSession || activeSession.userId !== String(payload.sub) || activeSession.email !== payload.email) {
        return {
            valid: false,
            code: 'ADMIN_PIN_REVOKED',
            error: 'Admin PIN session is no longer active'
        };
    }

    if (expectedUser) {
        const expectedUserId = String(expectedUser._id);
        const expectedEmail = String(expectedUser.email).toLowerCase().trim();

        if (payload.sub !== expectedUserId || payload.email !== expectedEmail) {
            return {
                valid: false,
                code: 'ADMIN_PIN_INVALID',
                error: 'Admin PIN session is invalid'
            };
        }
    }

    return {
        valid: true,
        payload
    };
};

const revokeAdminPinToken = (token) => {
    const decodedToken = decodeToken(token);
    if (!decodedToken.valid) {
        return false;
    }

    return revokeSessionById(decodedToken.payload.sid);
};

const revokeAdminPinSessionsForUser = (userId) => {
    pruneExpiredSessions();

    const userKey = String(userId);
    const userSessions = sessionsByUserId.get(userKey);
    if (!userSessions) {
        return 0;
    }

    let revokedCount = 0;
    for (const sessionId of Array.from(userSessions)) {
        if (revokeSessionById(sessionId)) {
            revokedCount += 1;
        }
    }

    return revokedCount;
};

module.exports = {
    TOKEN_HEADER_NAME,
    createAdminPinToken,
    verifyAdminPinToken,
    revokeAdminPinToken,
    revokeAdminPinSessionsForUser
};
