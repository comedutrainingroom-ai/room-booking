import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        systemName: 'ระบบจองห้องประชุมออนไลน์',
        contactEmail: '',
        themeColor: '#16a34a',
        maintenanceMode: false
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
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
    };

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
    }, []);

    // Refresh function to be called after updating settings
    const refreshSettings = () => {
        fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
