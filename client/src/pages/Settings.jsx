import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBook,
    FaCalendarAlt,
    FaCalendarCheck,
    FaClock,
    FaCog,
    FaExclamationTriangle,
    FaPlus,
    FaSave,
    FaServer,
    FaToggleOff,
    FaToggleOn,
    FaTrash,
    FaUndo
} from 'react-icons/fa';
import api from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { applyTheme, persistThemeColor } from '../utils/theme';
import { DEFAULT_LOGIN_GUIDE, joinTextareaList, LOGIN_GUIDE_ICONS, LOGIN_GUIDE_TONES, splitTextareaList } from '../utils/loginGuideConfig';
import { normalizeSettings } from '../utils/settingsDefaults';

const createEmptyGuideSection = (fallback = DEFAULT_LOGIN_GUIDE.sections[0]) => ({
    icon: fallback.icon,
    title: fallback.title,
    description: fallback.description,
    bullets: [...fallback.bullets],
    tone: fallback.tone
});

const Toggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200">
        <div>
            <h4 className="font-bold text-gray-800">{label}</h4>
            {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`text-3xl transition-colors duration-300 ${checked ? 'text-primary' : 'text-gray-300'}`}
        >
            {checked ? <FaToggleOn /> : <FaToggleOff />}
        </button>
    </div>
);

const TextAreaField = ({ label, value, onChange, hint, rows = 4, placeholder }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {hint ? <p className="text-xs leading-5 text-gray-500">{hint}</p> : null}
    </div>
);

const Settings = () => {
    const { refreshSettings } = useSettings();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [initialSettings, setInitialSettings] = useState(null);
    const [settings, setSettings] = useState(() => normalizeSettings());

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings/admin');
                if (res.data.success) {
                    const normalized = normalizeSettings(res.data.data);
                    setSettings(normalized);
                    setInitialSettings(normalized);
                    persistThemeColor(normalized.themeColor);
                    applyTheme(normalized.themeColor);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };

        fetchSettings();
    }, []);

    const hasChanges = useMemo(() => {
        if (!initialSettings) {
            return false;
        }

        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    const [pendingNavUrl, setPendingNavUrl] = useState(null);
    const hasChangesRef = useRef(hasChanges);
    const originalPushStateRef = useRef(null);
    hasChangesRef.current = hasChanges;

    useEffect(() => {
        const beforeUnloadHandler = (event) => {
            if (hasChangesRef.current) {
                event.preventDefault();
            }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        const originalPushState = window.history.pushState.bind(window.history);
        originalPushStateRef.current = originalPushState;

        window.history.pushState = function pushStateWithGuard(state, title, url) {
            if (hasChangesRef.current && url && typeof url === 'string') {
                setPendingNavUrl(url);
                return;
            }

            return originalPushState(state, title, url);
        };

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
            return;
        }

        if (originalPush) {
            originalPush(null, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }, []);

    const updateSettings = useCallback((updater) => {
        setSettings((previousSettings) => {
            const nextSettings = typeof updater === 'function' ? updater(previousSettings) : updater;
            return normalizeSettings(nextSettings);
        });
    }, []);

    const updateGuideField = useCallback((field, value) => {
        updateSettings((previousSettings) => ({
            ...previousSettings,
            loginGuide: {
                ...previousSettings.loginGuide,
                [field]: value
            }
        }));
    }, [updateSettings]);

    const updateGuideListField = useCallback((field, value) => {
        updateGuideField(field, splitTextareaList(value));
    }, [updateGuideField]);

    const updateGuideSection = useCallback((index, updater) => {
        updateSettings((previousSettings) => ({
            ...previousSettings,
            loginGuide: {
                ...previousSettings.loginGuide,
                sections: previousSettings.loginGuide.sections.map((section, sectionIndex) => (
                    sectionIndex === index ? updater(section) : section
                ))
            }
        }));
    }, [updateSettings]);

    const addGuideSection = useCallback(() => {
        updateSettings((previousSettings) => {
            const fallback = DEFAULT_LOGIN_GUIDE.sections[previousSettings.loginGuide.sections.length % DEFAULT_LOGIN_GUIDE.sections.length];
            return {
                ...previousSettings,
                loginGuide: {
                    ...previousSettings.loginGuide,
                    sections: [...previousSettings.loginGuide.sections, createEmptyGuideSection(fallback)]
                }
            };
        });
    }, [updateSettings]);

    const removeGuideSection = useCallback((index) => {
        updateSettings((previousSettings) => {
            const nextSections = previousSettings.loginGuide.sections.filter((_, sectionIndex) => sectionIndex !== index);
            return {
                ...previousSettings,
                loginGuide: {
                    ...previousSettings.loginGuide,
                    sections: nextSections.length > 0 ? nextSections : [createEmptyGuideSection()]
                }
            };
        });
    }, [updateSettings]);

    const handleSave = useCallback(async (skipConfirm = false) => {
        if (!skipConfirm) {
            const confirmed = await toast.confirm({
                title: 'ยืนยันการบันทึก',
                message: 'คุณต้องการบันทึกการเปลี่ยนแปลงการตั้งค่าใช่หรือไม่?',
                type: 'info'
            });

            if (!confirmed) {
                return;
            }
        }

        setLoading(true);
        try {
            const res = await api.put('/settings', settings);
            if (res.data.success) {
                const normalized = normalizeSettings(res.data.data);
                setSettings(normalized);
                setInitialSettings(normalized);
                persistThemeColor(normalized.themeColor);
                applyTheme(normalized.themeColor);
                refreshSettings();
                toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setLoading(false);
        }
    }, [refreshSettings, settings, toast]);

    return (
        <div className="h-full w-full space-y-6 px-0 py-6 sm:px-4 sm:py-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">ตั้งค่าระบบ</h1>
                    <p className="mt-1 text-xs text-gray-400 md:text-base">จัดการการตั้งค่าและเงื่อนไขการจอง รวมถึงคู่มือที่แสดงในหน้า Login</p>
                </div>
                <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={loading || !hasChanges}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-medium shadow-lg transition-all disabled:cursor-not-allowed sm:w-auto ${
                        hasChanges
                            ? 'bg-primary text-white shadow-green-200 hover:bg-green-700 hover:shadow-xl'
                            : 'bg-gray-300 text-gray-500 shadow-none'
                    }`}
                >
                    {loading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <>
                            <FaSave />
                            บันทึกการเปลี่ยนแปลง
                        </>
                    )}
                </button>
            </div>

            <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-medium transition-all ${activeTab === 'general' ? 'border border-gray-100 bg-white text-primary shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaCog />
                    ทั่วไป
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('rules')}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-medium transition-all ${activeTab === 'rules' ? 'border border-gray-100 bg-white text-primary shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaCalendarCheck />
                    เงื่อนไขการจอง
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-medium transition-all ${activeTab === 'guide' ? 'border border-gray-100 bg-white text-primary shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaBook />
                    คู่มือหน้า Login
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('system')}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-medium transition-all ${activeTab === 'system' ? 'border border-gray-100 bg-white text-primary shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <FaServer />
                    ระบบ
                </button>
            </div>

            <div className="min-h-[400px] rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                {activeTab === 'general' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-bold text-gray-800">ข้อมูลทั่วไป</h3>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ชื่อระบบ</label>
                                <input
                                    type="text"
                                    value={settings.systemName}
                                    onChange={(event) => updateSettings({ ...settings, systemName: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">อีเมลผู้ติดต่อ (Admin)</label>
                                <input
                                    type="email"
                                    value={settings.contactEmail}
                                    onChange={(event) => updateSettings({ ...settings, contactEmail: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                                        type="button"
                                        onClick={() => {
                                            updateSettings({ ...settings, themeColor: color.value });
                                            applyTheme(color.value);
                                        }}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${settings.themeColor === color.value ? 'scale-110 border-gray-400 shadow-sm' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: color.name === 'Mourning' ? '#000000' : color.value }}
                                        title={color.label}
                                    >
                                        {settings.themeColor === color.value ? <div className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" /> : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="flex items-center gap-2 font-medium text-gray-700">
                                <FaClock className="text-gray-400" />
                                เวลาทำการ
                            </h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-gray-500">เวลาเปิด</label>
                                    <input
                                        type="time"
                                        value={settings.openTime}
                                        onChange={(event) => updateSettings({ ...settings, openTime: event.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <span className="pt-6 text-gray-400">-</span>
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-gray-500">เวลาปิด</label>
                                    <input
                                        type="time"
                                        value={settings.closeTime}
                                        onChange={(event) => updateSettings({ ...settings, closeTime: event.target.value })}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {activeTab === 'rules' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-bold text-gray-800">เงื่อนไขการจอง</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 font-medium text-gray-700">
                                    <FaCalendarAlt className="text-gray-400" />
                                    จองล่วงหน้าได้สูงสุด (วัน)
                                </label>
                                <span className="rounded-lg bg-primary/10 px-3 py-1 text-2xl font-bold text-primary">{settings.maxBookingDays} วัน</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="90"
                                value={settings.maxBookingDays}
                                onChange={(event) => updateSettings({ ...settings, maxBookingDays: parseInt(event.target.value, 10) })}
                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary transition-all hover:accent-green-600"
                            />
                            <div className="flex justify-between px-1 text-xs text-gray-400">
                                <span>1 วัน</span>
                                <span>90 วัน</span>
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 font-medium text-gray-700">
                                    <FaClock className="text-gray-400" />
                                    จองได้นานสุดต่อครั้ง (ชั่วโมง)
                                </label>
                                <span className="rounded-lg bg-primary/10 px-3 py-1 text-2xl font-bold text-primary">{settings.maxBookingHours} ชม.</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="12"
                                value={settings.maxBookingHours}
                                onChange={(event) => updateSettings({ ...settings, maxBookingHours: parseInt(event.target.value, 10) })}
                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary transition-all hover:accent-green-600"
                            />
                            <div className="flex justify-between px-1 text-xs text-gray-400">
                                <span>1 ชม.</span>
                                <span>12 ชม.</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                            <Toggle
                                label="ต้องรออนุมัติจาก Admin"
                                description="การจองใหม่จะมีสถานะเป็น 'รออนุมัติ'"
                                checked={settings.requireApproval}
                                onChange={(value) => updateSettings({ ...settings, requireApproval: value })}
                            />
                            <Toggle
                                label="อนุญาตให้จองวันหยุด"
                                description="เสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์"
                                checked={settings.weekendBooking}
                                onChange={(value) => updateSettings({ ...settings, weekendBooking: value })}
                            />
                        </div>
                    </div>
                ) : null}

                {activeTab === 'guide' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                            <h3 className="text-lg font-bold text-gray-800">คู่มือหน้า Login</h3>
                            <p className="text-sm leading-6 text-gray-500">
                                เนื้อหาในแท็บนี้จะถูกนำไปแสดงในปุ่ม “คู่มือในการใช้งานระบบเบื้องต้น” ที่หน้า Login ทันทีหลังบันทึก
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ข้อความบน Badge</label>
                                <input
                                    type="text"
                                    value={settings.loginGuide.badgeText}
                                    onChange={(event) => updateGuideField('badgeText', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">หัวข้อหลัก</label>
                                <input
                                    type="text"
                                    value={settings.loginGuide.title}
                                    onChange={(event) => updateGuideField('title', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <TextAreaField
                            label="คำอธิบายด้านบน"
                            value={settings.loginGuide.description}
                            onChange={(value) => updateGuideField('description', value)}
                            rows={3}
                            hint="ข้อความนี้จะแสดงด้านบนสุดของหน้าคู่มือในหน้า Login"
                        />

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">หัวข้อชุดขั้นตอน</label>
                                <input
                                    type="text"
                                    value={settings.loginGuide.quickStartTitle}
                                    onChange={(event) => updateGuideField('quickStartTitle', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                                ข้อมูลอย่างเวลาเปิด-ปิด ช่วงวันจองล่วงหน้า และชั่วโมงสูงสุด จะอ้างอิงจากการตั้งค่าระบบโดยอัตโนมัติ
                            </div>
                        </div>

                        <TextAreaField
                            label="ขั้นตอนเริ่มต้นใช้งาน"
                            value={joinTextareaList(settings.loginGuide.quickStartSteps)}
                            onChange={(value) => updateGuideListField('quickStartSteps', value)}
                            rows={4}
                            hint="1 บรรทัด = 1 ขั้นตอน"
                        />

                        <TextAreaField
                            label="รายการสรุปกฎสำคัญ"
                            value={joinTextareaList(settings.loginGuide.ruleHighlights)}
                            onChange={(value) => updateGuideListField('ruleHighlights', value)}
                            rows={5}
                            hint="1 บรรทัด = 1 แท็กสรุป"
                        />

                        <TextAreaField
                            label="ข้อความปิดท้าย"
                            value={settings.loginGuide.footerNote}
                            onChange={(value) => updateGuideField('footerNote', value)}
                            rows={2}
                        />

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-gray-800">หัวข้อย่อยในคู่มือ</h4>
                                    <p className="mt-1 text-sm text-gray-500">จัดลำดับและแก้ข้อความในแต่ละหัวข้อได้ตามต้องการ</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addGuideSection}
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                                >
                                    <FaPlus />
                                    เพิ่มหัวข้อ
                                </button>
                            </div>

                            <div className="space-y-4">
                                {settings.loginGuide.sections.map((section, index) => (
                                    <div key={`${section.title}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                        <div className="mb-4 flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">หัวข้อที่ {index + 1}</p>
                                                <p className="mt-1 text-xs text-gray-500">เลือกไอคอน โทนสี และเนื้อหาของบล็อกนี้ได้</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeGuideSection(index)}
                                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                            >
                                                <FaTrash />
                                                ลบ
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">หัวข้อ</label>
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(event) => updateGuideSection(index, (currentSection) => ({ ...currentSection, title: event.target.value }))}
                                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700">ไอคอน</label>
                                                    <select
                                                        value={section.icon}
                                                        onChange={(event) => updateGuideSection(index, (currentSection) => ({ ...currentSection, icon: event.target.value }))}
                                                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        {LOGIN_GUIDE_ICONS.map((icon) => (
                                                            <option key={icon.value} value={icon.value}>{icon.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700">โทนสี</label>
                                                    <select
                                                        value={section.tone}
                                                        onChange={(event) => updateGuideSection(index, (currentSection) => ({ ...currentSection, tone: event.target.value }))}
                                                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        {LOGIN_GUIDE_TONES.map((tone) => (
                                                            <option key={tone.value} value={tone.value}>{tone.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-4">
                                            <TextAreaField
                                                label="คำอธิบาย"
                                                value={section.description}
                                                onChange={(value) => updateGuideSection(index, (currentSection) => ({ ...currentSection, description: value }))}
                                                rows={3}
                                            />
                                            <TextAreaField
                                                label="รายการย่อย"
                                                value={joinTextareaList(section.bullets)}
                                                onChange={(value) => updateGuideSection(index, (currentSection) => ({ ...currentSection, bullets: splitTextareaList(value) }))}
                                                rows={4}
                                                hint="1 บรรทัด = 1 bullet"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}

                {activeTab === 'system' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-bold text-gray-800">ตั้งค่าระบบ</h3>

                        <div className="flex items-start gap-4 rounded-2xl border border-orange-100 bg-orange-50 p-6">
                            <div className="rounded-full bg-white p-3 text-2xl text-orange-500 shadow-sm">
                                <FaUndo />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-orange-800">โหมดปิดปรับปรุง (Maintenance Mode)</h4>
                                <p className="mb-4 mt-1 text-sm leading-relaxed text-orange-600/80">
                                    เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าใช้งานระบบได้ ยกเว้น Admin เหมาะสำหรับการอัปเดตระบบหรือแก้ไขข้อมูลสำคัญ
                                </p>
                                <Toggle
                                    label="เปิดใช้งานโหมดบำรุงรักษา"
                                    checked={settings.maintenanceMode}
                                    onChange={(value) => updateSettings({ ...settings, maintenanceMode: value })}
                                />
                            </div>
                        </div>

                        <div className="pt-8 text-right">
                            <span className="text-xs text-gray-400">System Version 1.2.0 | Build 2026.02.01</span>
                        </div>
                    </div>
                ) : null}
            </div>

            {pendingNavUrl ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
                        <div className="h-1 w-full bg-amber-500" />
                        <div className="p-6">
                            <div className="mb-2 flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                                    <FaExclamationTriangle className="text-amber-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</h3>
                            </div>
                            <p className="ml-[52px] text-sm text-gray-500">คุณต้องการบันทึกการเปลี่ยนแปลงก่อนออกจากหน้านี้หรือไม่?</p>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="flex justify-end gap-2 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setPendingNavUrl(null)}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                            >
                                อยู่หน้านี้ต่อ
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const url = pendingNavUrl;
                                    setSettings(initialSettings);
                                    setPendingNavUrl(null);
                                    executeNavigation(url);
                                }}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                            >
                                ไม่บันทึก
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const url = pendingNavUrl;
                                    await handleSave(true);
                                    setPendingNavUrl(null);
                                    executeNavigation(url);
                                }}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                            >
                                บันทึกแล้วออก
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Settings;
