const ADMIN_PIN_STORAGE_KEY = 'admin-pin-session';
const ADMIN_PIN_SESSION_EVENT = 'admin-pin-session-change';

const dispatchAdminPinSessionChange = (session = null) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(ADMIN_PIN_SESSION_EVENT, {
        detail: { session }
    }));
};

const parseStoredSession = (rawValue) => {
    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue);
        if (!parsedValue?.adminPinToken || !parsedValue?.expiresAt) {
            return null;
        }

        return {
            adminPinToken: parsedValue.adminPinToken,
            expiresAt: parsedValue.expiresAt
        };
    } catch {
        return null;
    }
};

const isSessionExpired = (session) => {
    const expiresAt = new Date(session.expiresAt).getTime();
    return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
};

export const getAdminPinSession = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const session = parseStoredSession(window.sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY));
    if (!session) {
        return null;
    }

    if (isSessionExpired(session)) {
        window.sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
        dispatchAdminPinSessionChange(null);
        return null;
    }

    return session;
};

export const setAdminPinSession = ({ adminPinToken, expiresAt }) => {
    if (typeof window === 'undefined' || !adminPinToken || !expiresAt) {
        return null;
    }

    const session = { adminPinToken, expiresAt };
    if (isSessionExpired(session)) {
        clearAdminPinSession();
        return null;
    }

    window.sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, JSON.stringify(session));
    dispatchAdminPinSessionChange(session);
    return session;
};

export const clearAdminPinSession = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
    dispatchAdminPinSessionChange(null);
};

export const getAdminPinToken = () => getAdminPinSession()?.adminPinToken || null;

export { ADMIN_PIN_SESSION_EVENT };
