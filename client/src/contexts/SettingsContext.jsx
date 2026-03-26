import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { applyTheme, DEFAULT_THEME_COLOR, getStoredThemeColor, persistThemeColor } from '../utils/theme';
import { DEFAULT_SETTINGS, normalizeSettings } from '../utils/settingsDefaults';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const { currentUser, dbUser, isAdminUnlocked, loading: authLoading } = useAuth();
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

    const resolveSettingsEndpoint = useCallback(() => {
        if (isAdminUnlocked && dbUser?.role === 'admin') {
            return '/settings/admin';
        }

        if (currentUser) {
            return '/settings/runtime';
        }

        return '/settings';
    }, [currentUser, dbUser?.role, isAdminUnlocked]);

    const fetchSettings = useCallback(async () => {
        if (authLoading) {
            return;
        }

        try {
            const res = await api.get(resolveSettingsEndpoint());
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
    }, [authLoading, resolveSettingsEndpoint, syncTheme]);

    useEffect(() => {
        syncTheme(getStoredThemeColor());
    }, [syncTheme]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

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
