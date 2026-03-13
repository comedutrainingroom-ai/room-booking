import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        systemName: 'ระบบจองห้องอบรม ภาควิชาคอมพิวเตอร์ศึกษา คณะครุศาสตร์อุตสาหกรรม (KMUTNB)',
        contactEmail: '',
        themeColor: '#16a34a',
        maintenanceMode: false
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/settings');
            if (res.data.success) {
                setSettings(res.data.data);
                applyTheme(res.data.data.themeColor);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const applyTheme = (color) => {
        if (color) {
            document.documentElement.style.setProperty('--color-primary', color);
            if (color === '#333333') {
                document.documentElement.style.filter = 'grayscale(100%)';
            } else {
                document.documentElement.style.filter = 'none';
            }
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

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
