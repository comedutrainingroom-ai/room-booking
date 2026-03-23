const crypto = require('crypto');

const TOKEN_HEADER_NAME = 'x-admin-pin-token';
const DEFAULT_TTL_MINUTES = 480;

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

const createAdminPinToken = ({ userId, email }) => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = nowInSeconds + (getTokenTtlMinutes() * 60);

    const payload = {
        sub: String(userId),
        email: String(email).toLowerCase().trim(),
        purpose: 'admin-pin',
        iat: nowInSeconds,
        exp: expiresInSeconds
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signEncodedPayload(encodedPayload);

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

    const [encodedPayload, providedSignature, ...extraParts] = String(token).split('.');

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

    if (payload.purpose !== 'admin-pin' || !payload.sub || !payload.email || !payload.exp) {
        return {
            valid: false,
            code: 'ADMIN_PIN_INVALID',
            error: 'Admin PIN session is invalid'
        };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
        return {
            valid: false,
            code: 'ADMIN_PIN_EXPIRED',
            error: 'Admin PIN session has expired'
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

module.exports = {
    TOKEN_HEADER_NAME,
    createAdminPinToken,
    verifyAdminPinToken
};
