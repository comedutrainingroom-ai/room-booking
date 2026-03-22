import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaCog, FaCalendarCheck, FaServer, FaSave, FaUndo, FaClock, FaCalendarAlt, FaToggleOn, FaToggleOff, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { applyTheme, DEFAULT_THEME_COLOR, persistThemeColor } from '../utils/theme';

const Settings = () => {
    const { refreshSettings } = useSettings();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [initialSettings, setInitialSettings] = useState(null);

    // Initial State
    const [settings, setSettings] = useState({
        systemName: '',
        contactEmail: '',
        themeColor: DEFAULT_THEME_COLOR,
        maxBookingDays: 30,
        maxBookingHours: 4,
        requireApproval: true,
        maintenanceMode: false,
        openTime: '08:00',
        closeTime: '20:00',
        weekendBooking: false
    });

    // Fetch Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data.success) {
                    setSettings(res.data.data);
                    setInitialSettings(res.data.data);
                    persistThemeColor(res.data.data.themeColor);
                    applyTheme(res.data.data.themeColor);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const hasChanges = useMemo(() => {
        if (!initialSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    // --- Navigation guard ---
    const [pendingNavUrl, setPendingNavUrl] = useState(null);
    const hasChangesRef = useRef(hasChanges);
    hasChangesRef.current = hasChanges;
    const originalPushStateRef = useRef(null);

    useEffect(() => {
        // Browser close / refresh guard
        const beforeUnloadHandler = (e) => {
            if (hasChangesRef.current) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        // In-app navigation guard (intercept pushState)
        const originalPushState = window.history.pushState.bind(window.history);
        originalPushStateRef.current = originalPushState;

        window.history.pushState = function (state, title, url) {
            if (hasChangesRef.current && url && typeof url === 'string') {
                setPendingNavUrl(url);
                return;
            }
            return originalPushState(state, title, url);
        };

        // Back / Forward button guard
        const popstateHandler = () => {
            if (hasChangesRef.current) {
                originalPushState(null, '', window.location.pathname + window.location.search);
                setPendingNavUrl('__back__');
            }
        };
        window.addEventListener('popstate', popstateHandler);

        return () => {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            window.history.pushState = originalPushState;
            window.removeEventListener('popstate', popstateHandler);
        };
    }, []);

    const executeNavigation = useCallback((url) => {
        const originalPush = originalPushStateRef.current;
        if (url === '__back__') {
            window.history.pushState = originalPush;
            window.history.back();
        } else if (originalPush) {
            originalPush(null, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }, []);

    const handleSave = useCallback(async (skipConfirm = false) => {
        if (!skipConfirm) {
            const confirmed = await toast.confirm({
                title: 'ยืนยันการบันทึก',
                message: 'คุณต้องการบันทึกการเปลี่ยนแปลงการตั้งค่าใช่หรือไม่?',
                type: 'info'
            });
            if (!confirmed) return;
        }

        setLoading(true);
        try {
            const res = await api.put('/settings', settings);
            if (res.data.success) {
                setSettings(res.data.data);
                setInitialSettings(res.data.data);
                persistThemeColor(res.data.data.themeColor);
                applyTheme(res.data.data.themeColor);
                refreshSettings();
                toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setLoading(false);
        }
    }, [settings, refreshSettings, toast]);

    const Toggle = ({ label, checked, onChange, description }) => (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div>
                <h4 className="font-bold text-gray-800">{label}</h4>
                {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`text-3xl transition-colors duration-300 ${checked ? 'text-primary' : 'text-gray-300'}`}
            >
                {checked ? <FaToggleOn /> : <FaToggleOff />}
            </button>
        </div>
    );

    return (
        <div className="w-full h-full px-0 sm:px-4 py-6 sm:py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
                        ตั้งค่าระบบ
                    </h1>
                    <p className="text-gray-400 mt-1 text-xs md:text-base">จัดการการตั้งค่าและเงื่อนไขการจอง</p>
                </div>
                <button
                    onClick={() => handleSave()}
                    disabled={loading || !hasChanges}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 font-medium disabled:cursor-not-allowed ${
                        hasChanges
                            ? 'bg-primary text-white shadow-green-200 hover:bg-green-700 hover:shadow-xl'
                            : 'bg-gray-300 text-gray-500 shadow-none'
                    }`}
                >
                    {loading ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                        <>
                            <FaSave /> บันทึกการเปลี่ยนแปลง
                        </>
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'general' ? 'bg-white text-primary shadow-md border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaCog /> ทั่วไป
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'rules' ? 'bg-white text-primary shadow-md border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaCalendarCheck /> เงื่อนไขการจอง
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'system' ? 'bg-white text-primary shadow-md border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaServer /> ระบบ
                </button>
            </div>

            {/* Content Cards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">

                {/* General Settings */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">ข้อมูลทั่วไป</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ชื่อระบบ</label>
                                <input
                                    type="text"
                                    value={settings.systemName}
                                    onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">อีเมลผู้ติดต่อ (Admin)</label>
                                <input
                                    type="email"
                                    value={settings.contactEmail}
                                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-medium text-gray-700">ธีมสีหลัก</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { name: 'Green', value: '#16a34a', label: 'เขียว (ปกติ)' },
                                    { name: 'Mourning', value: '#333333', label: 'ดำ (ไว้อาลัย)' }
                                ].map((color) => (
                                    <button
                                        key={color.name}
                                        onClick={() => {
                                            setSettings({ ...settings, themeColor: color.value });
                                            applyTheme(color.value);
                                        }}
                                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${settings.themeColor === color.value ? 'border-gray-400 scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: color.name === 'Mourning' ? '#000000' : color.value }}
                                        title={color.label || color.name}
                                    >
                                        {settings.themeColor === color.value && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2"><FaClock className="text-gray-400" /> เวลาทำการ</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-gray-500">เวลาเปิด</label>
                                    <input
                                        type="time"
                                        value={settings.openTime}
                                        onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <span className="text-gray-400 pt-6">-</span>
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-gray-500">เวลาปิด</label>
                                    <input
                                        type="time"
                                        value={settings.closeTime}
                                        onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking Rules */}
                {activeTab === 'rules' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">เงื่อนไขการจอง</h3>

                        {/* Days Limit Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-medium text-gray-700 flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-400" /> จองล่วงหน้าได้สูงสุด (วัน)
                                </label>
                                <span className="text-2xl font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{settings.maxBookingDays} วัน</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="90"
                                value={settings.maxBookingDays}
                                onChange={(e) => setSettings({ ...settings, maxBookingDays: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-green-600 transition-all"
                            />
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>1 วัน</span>
                                <span>90 วัน</span>
                            </div>
                        </div>

                        {/* Hours Limit Slider */}
                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <div className="flex justify-between items-center">
                                <label className="font-medium text-gray-700 flex items-center gap-2">
                                    <FaClock className="text-gray-400" /> จองได้นานสุดต่อครั้ง (ชั่วโมง)
                                </label>
                                <span className="text-2xl font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{settings.maxBookingHours} ชม.</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                value={settings.maxBookingHours}
                                onChange={(e) => setSettings({ ...settings, maxBookingHours: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-green-600 transition-all"
                            />
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>1 ชม.</span>
                                <span>12 ชม.</span>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <Toggle
                                label="ต้องรออนุมัติจาก Admin"
                                description="การจองใหม่จะมีสถานะเป็น 'รออนุมัติ'"
                                checked={settings.requireApproval}
                                onChange={(val) => setSettings({ ...settings, requireApproval: val })}
                            />
                            <Toggle
                                label="อนุญาตให้จองวันหยุด"
                                description="เสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์"
                                checked={settings.weekendBooking}
                                onChange={(val) => setSettings({ ...settings, weekendBooking: val })}
                            />
                        </div>
                    </div>
                )}

                {/* System Settings */}
                {activeTab === 'system' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">ตั้งค่าระบบ</h3>

                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl flex items-start gap-4">
                            <div className="p-3 bg-white rounded-full text-orange-500 shadow-sm text-2xl">
                                <FaUndo />
                            </div>
                            <div>
                                <h4 className="font-bold text-orange-800 text-lg">โหมดปิดปรับปรุง (Maintenance Mode)</h4>
                                <p className="text-orange-600/80 mt-1 mb-4 text-sm leading-relaxed">
                                    เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานระบบได้ ยกเว้น Admin
                                    เหมาะสำหรับการอัปเดตระบบหรือแก้ไขข้อมูลสำคัญ
                                </p>
                                <Toggle
                                    label="เปิดใช้งานโหมดบำรุงรักษา"
                                    checked={settings.maintenanceMode}
                                    onChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
                                />
                            </div>
                        </div>

                        <div className="text-right pt-8">
                            <span className="text-xs text-gray-400">System Version 1.2.0 • Build 2026.02.01</span>
                        </div>
                    </div>
                )}

            </div>

            {/* Unsaved changes navigation guard dialog */}
            {pendingNavUrl && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full shadow-xl overflow-hidden">
                        <div className="h-1 bg-amber-500 w-full" />
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <FaExclamationTriangle className="text-amber-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</h3>
                            </div>
                            <p className="text-gray-500 text-sm ml-[52px]">คุณต้องการบันทึกการเปลี่ยนแปลงก่อนออกจากหน้านี้หรือไม่?</p>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="flex justify-end gap-2 px-6 py-4">
                            <button
                                onClick={() => setPendingNavUrl(null)}
                                className="px-4 py-2 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                อยู่หน้านี้ต่อ
                            </button>
                            <button
                                onClick={() => {
                                    const url = pendingNavUrl;
                                    setSettings(initialSettings);
                                    setPendingNavUrl(null);
                                    executeNavigation(url);
                                }}
                                className="px-4 py-2 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
                            >
                                ไม่บันทึก
                            </button>
                            <button
                                onClick={async () => {
                                    const url = pendingNavUrl;
                                    await handleSave(true);
                                    setPendingNavUrl(null);
                                    executeNavigation(url);
                                }}
                                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                            >
                                บันทึกแล้วออก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
