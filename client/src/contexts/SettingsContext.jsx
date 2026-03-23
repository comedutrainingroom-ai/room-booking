import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { applyTheme, DEFAULT_THEME_COLOR, getStoredThemeColor, persistThemeColor } from '../utils/theme';
import { DEFAULT_SETTINGS, normalizeSettings } from '../utils/settingsDefaults';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => normalizeSettings({
        ...DEFAULT_SETTINGS,
        themeColor: getStoredThemeColor()
    }));
    const [loading, setLoading] = useState(true);

    const syncTheme = useCallback((color) => {
        const resolvedColor = color || DEFAULT_THEME_COLOR;
        applyTheme(resolvedColor);
        persistThemeColor(resolvedColor);
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/settings');
            if (res.data.success) {
                const normalizedSettings = normalizeSettings(res.data.data);
                setSettings(normalizedSettings);
                syncTheme(normalizedSettings.themeColor);
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    }, [syncTheme]);

    useEffect(() => {
        syncTheme(getStoredThemeColor());
        fetchSettings();
    }, [fetchSettings, syncTheme]);

    const refreshSettings = useCallback(() => {
        fetchSettings();
    }, [fetchSettings]);

    const value = useMemo(() => ({
        settings,
        loading,
        refreshSettings
    }), [settings, loading, refreshSettings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
