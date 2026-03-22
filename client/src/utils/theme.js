export const DEFAULT_THEME_COLOR = '#16a34a';
export const THEME_STORAGE_KEY = 'app:themeColor';

export const getStoredThemeColor = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_THEME_COLOR;
    }

    try {
        return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_COLOR;
    } catch {
        return DEFAULT_THEME_COLOR;
    }
};

export const persistThemeColor = (color) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(THEME_STORAGE_KEY, color || DEFAULT_THEME_COLOR);
    } catch {
        // Ignore storage failures and keep the in-memory theme only.
    }
};

export const applyTheme = (color = DEFAULT_THEME_COLOR) => {
    if (typeof document === 'undefined') {
        return;
    }

    const resolvedColor = color || DEFAULT_THEME_COLOR;
    document.documentElement.style.setProperty('--color-primary', resolvedColor);
    document.documentElement.style.filter = resolvedColor === '#333333' ? 'grayscale(100%)' : 'none';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', resolvedColor);
    }
};
