import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { applyTheme, DEFAULT_THEME_COLOR, getStoredThemeColor, persistThemeColor } from '../utils/theme';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => ({
        systemName: 'ระบบจองห้องอบรม ภาควิชาคอมพิวเตอร์ศึกษา คณะครุศาสตร์อุตสาหกรรม (KMUTNB)',
        contactEmail: '',
        themeColor: getStoredThemeColor(),
        maintenanceMode: false
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
                setSettings(res.data.data);
                syncTheme(res.data.data.themeColor);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    }, [syncTheme]);

    useEffect(() => {
        syncTheme(getStoredThemeColor());
        fetchSettings();
    }, [fetchSettings, syncTheme]);

    // Refresh function to be called after updating settings
    const refreshSettings = useCallback(() => {
        fetchSettings();
    }, [fetchSettings]);

    const value = useMemo(() => ({
        settings, loading, refreshSettings
    }), [settings, loading, refreshSettings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
