import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaBook,
    FaCalendarAlt,
    FaCheckCircle,
    FaCode,
    FaInfoCircle,
    FaMicrochip,
    FaMousePointer,
    FaNetworkWired,
    FaServer,
    FaShieldAlt,
    FaTimes
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { DEFAULT_LOGIN_GUIDE, interpolateGuideText, normalizeLoginGuide } from '../utils/loginGuideConfig';

const GUIDE_ICON_STYLES = {
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
};

const GUIDE_ICON_MAP = {
    shield: FaShieldAlt,
    calendar: FaCalendarAlt,
    status: FaCheckCircle,
    info: FaInfoCircle,
    book: FaBook,
    pointer: FaMousePointer
};

const GuideSection = ({ icon, title, description, bullets, tone = 'emerald' }) => {
    const Icon = GUIDE_ICON_MAP[icon] || FaBook;

    return (
        <article className="border-b border-slate-100 py-5 last:border-b-0">
            <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-full text-base ${GUIDE_ICON_STYLES[tone] || GUIDE_ICON_STYLES.emerald}`}>
                    <Icon />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>

                    <div className="mt-3 space-y-2">
                        {bullets.map((bullet) => (
                            <div key={bullet} className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                <span>{bullet}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
};

const QuickGuideModal = ({ isOpen, onClose, guide, guideVariables, loading }) => {
    if (!isOpen) {
        return null;
    }

    const renderGuideText = (text) => interpolateGuideText(text, guideVariables);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="ปิดคู่มือ"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm animate-backdrop-fade"
            />

            <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white/96 shadow-[0_32px_90px_rgba(15,23,42,0.22)] animate-modal-slideUp">
                <div className="relative border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                <FaBook />
                                {guide.badgeText}
                            </div>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
                                {guide.title}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                {renderGuideText(guide.description)}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className="relative max-h-[78vh] overflow-y-auto px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
                    {loading ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 py-8 text-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                            <div>
                                <p className="text-sm font-semibold text-slate-800">กำลังโหลดคู่มือและกฎล่าสุด</p>
                                <p className="mt-1 text-sm text-slate-500">ระบบกำลังดึงค่าที่ผู้ดูแลตั้งไว้จากฐานข้อมูล</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-100 pb-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-full bg-slate-900 text-white">
                                        <FaMousePointer />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900">{renderGuideText(guide.quickStartTitle)}</p>
                                        <div className="mt-3 space-y-2">
                                            {guide.quickStartSteps.map((step, index) => (
                                                <div key={`${index}-${step}`} className="flex items-start gap-3 text-sm text-slate-700">
                                                    <div className="flex h-7 w-7 shrink-0 aspect-square items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                                        {index + 1}
                                                    </div>
                                                    <span>{renderGuideText(step)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 border-b border-slate-100 py-5 text-sm text-slate-600">
                                {guide.ruleHighlights.map((highlight, index) => (
                                    <span key={`${index}-${highlight}`} className="rounded-full bg-slate-100 px-3 py-1.5">
                                        {renderGuideText(highlight)}
                                    </span>
                                ))}
                            </div>

                            <div className="divide-y divide-slate-100">
                                {guide.sections.map((section) => (
                                    <GuideSection
                                        key={section.title}
                                        icon={section.icon}
                                        title={renderGuideText(section.title)}
                                        description={renderGuideText(section.description)}
                                        bullets={section.bullets.map((bullet) => renderGuideText(bullet))}
                                        tone={section.tone}
                                    />
                                ))}
                            </div>

                            <p className="pt-5 text-xs leading-5 text-slate-500">
                                {renderGuideText(guide.footerNote)}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const Login = () => {
    const { loginWithGoogle, currentUser } = useAuth();
    const { settings, loading: settingsLoading } = useSettings();
    const toast = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [typedText, setTypedText] = useState('');

    const fullText = 'SYSTEM.INITIALIZE(COM_EDU_DEPT);';
    const bookingWindowText = `${settings?.openTime || '08:00'} - ${settings?.closeTime || '20:00'} น.`;
    const weekendText = settings?.weekendBooking ? 'เปิดให้จอง' : 'ไม่เปิดให้จอง';
    const approvalMode = settings?.requireApproval ? 'ต้องรออนุมัติจากผู้ดูแล' : 'ใช้งานได้ทันทีหลังส่งคำขอ';

    const guide = useMemo(
        () => normalizeLoginGuide(settings?.loginGuide || DEFAULT_LOGIN_GUIDE),
        [settings?.loginGuide]
    );

    const guideVariables = useMemo(() => ({
        bookingWindow: bookingWindowText,
        weekendText,
        maxBookingHours: settings?.maxBookingHours || 4,
        maxBookingDays: settings?.maxBookingDays || 30,
        systemName: settings?.systemName || 'ระบบจองห้องประชุมออนไลน์',
        contactEmail: settings?.contactEmail || '',
        approvalMode
    }), [
        approvalMode,
        bookingWindowText,
        settings?.contactEmail,
        settings?.maxBookingDays,
        settings?.maxBookingHours,
        settings?.systemName,
        weekendText
    ]);

    useEffect(() => {
        if (currentUser) {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setTypedText(fullText.slice(0, index));
            index += 1;
            if (index > fullText.length) {
                clearInterval(timer);
            }
        }, 100);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isGuideOpen) {
            return undefined;
        }

        const originalOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsGuideOpen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isGuideOpen]);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const result = await loginWithGoogle();

            if (result?.success) {
                toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ');
            } else if (result?.code === 'INVALID_EMAIL_DOMAIN') {
                toast.error('กรุณาใช้อีเมลมหาวิทยาลัย (@kmutnb.ac.th) เท่านั้น');
            } else if (result?.code === 'BANNED_USER') {
                toast.error('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่ภาควิชา');
            }
        } catch (error) {
            console.error('Login Failed', error);
            toast.error('ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 p-4 text-gray-800 selection:bg-emerald-100 lg:p-8">
            <QuickGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                guide={guide}
                guideVariables={guideVariables}
                loading={settingsLoading}
            />

            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden">
                <div className="absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-200/20 blur-[80px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-200/20 blur-[80px] animate-float-delay" />
            </div>

            <div className="relative z-10 flex h-auto min-h-fit w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-2xl md:min-h-[85vh] md:rounded-[3rem] lg:h-[90vh] lg:flex-row">
                <div className="group relative hidden w-[60%] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-800 p-16 text-white lg:flex">
                    <div
                        className="absolute inset-0 z-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
                    />

                    <div className="absolute bottom-0 right-0 h-[120%] w-[120%] translate-x-1/4 translate-y-1/4 opacity-20">
                        <FaMicrochip className="h-full w-full rotate-12 text-white" />
                    </div>

                    <div className="relative z-10 animate-fade-in stagger-1">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-white shadow-sm backdrop-blur-md">
                            <FaNetworkWired className="text-emerald-300" />
                            <span className="font-mono text-sm tracking-wide text-emerald-50">Computer Education Dept.</span>
                        </div>
                    </div>

                    <div className="relative z-10 max-w-2xl animate-fade-in stagger-2">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="rounded-xl border border-emerald-400/30 bg-white/10 p-3 backdrop-blur-md">
                                <FaServer className="text-2xl text-emerald-300" />
                            </div>
                            <div className="h-px w-20 bg-emerald-400/50" />
                            <span className="font-mono text-sm tracking-widest text-emerald-200">FACILITY MANAGER v3.0</span>
                        </div>

                        <h2 className="mb-6 font-display text-6xl font-bold leading-tight tracking-tight drop-shadow-md">
                            ระบบจองห้องอบรม
                            <br />
                            <span className="bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                                ภาควิชาคอมพิวเตอร์ศึกษา
                            </span>
                        </h2>

                        <p className="mb-8 max-w-lg text-xl font-light leading-relaxed text-emerald-100">
                            ระบบจองห้องอบรมสำหรับนักศึกษาและบุคลากรภาควิชาคอมพิวเตอร์ศึกษา คณะครุศาสตร์อุตสาหกรรม
                        </p>

                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 backdrop-blur-md">
                                <span className="text-3xl font-bold text-white">24<span className="text-sm text-emerald-300">/7</span></span>
                                <span className="text-xs uppercase tracking-wider text-emerald-200">Access</span>
                            </div>
                            <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 backdrop-blur-md">
                                <span className="text-3xl font-bold text-white">100<span className="text-sm text-emerald-300">%</span></span>
                                <span className="text-xs uppercase tracking-wider text-emerald-200">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative flex w-full items-center justify-center bg-white/60 p-4 backdrop-blur-xl sm:p-8 md:p-16 lg:w-[40%]">
                    <div className="relative z-10 w-full max-w-md">
                        <div className="mb-6 text-center md:mb-10">
                            <div className="mb-8 mt-10 flex justify-center sm:mt-12 lg:mt-0">
                                <img
                                    src="/Comedu.png"
                                    alt="ComEdu Logo"
                                    className="h-24 object-contain drop-shadow-lg transition-transform duration-500 hover:scale-105 sm:h-28 md:h-32 lg:h-36"
                                />
                            </div>

                            <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl md:text-4xl">
                                ยินดีต้อนรับ
                            </h1>
                            <div className="flex items-center justify-center gap-2 font-mono text-sm text-gray-500">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="typing-cursor text-emerald-600">{typedText}</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="group relative w-full overflow-hidden rounded-2xl border-2 border-gray-100 bg-white px-6 py-5 font-bold text-gray-700 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:bg-gray-50 hover:shadow-xl hover:shadow-emerald-100 active:scale-95"
                            >
                                <div className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-emerald-50/50 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                                <div className="relative flex items-center justify-between px-2">
                                    {loading ? (
                                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500" />
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <svg className="h-5 w-5" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
                                                    <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4" />
                                                    <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853" />
                                                    <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05" />
                                                    <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335" />
                                                </svg>
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Sign in with</span>
                                                    <span className="text-sm font-bold text-gray-800 transition-colors group-hover:text-emerald-600">KMUTNB Account</span>
                                                </div>
                                            </div>
                                            <div className="flex h-8 w-8 shrink-0 aspect-square items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-emerald-100">
                                                <FaCode className="text-sm text-gray-400 group-hover:text-emerald-600" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsGuideOpen(true)}
                                className="group w-full rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors duration-300 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                        <FaBook className="text-lg" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900">คู่มือในการใช้งานระบบเบื้องต้น</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            สำหรับนักศึกษาและบุคลากรที่ไม่เคยใช้ระบบ
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <div className="flex items-start gap-4 rounded-2xl border border-emerald-100/50 bg-emerald-50/50 p-5">
                                <div className="rounded-lg border border-emerald-100 bg-white p-2 text-lg text-emerald-500 shadow-sm">
                                    <FaShieldAlt />
                                </div>
                                <div className="flex-1">
                                    <h4 className="mb-1 font-mono text-sm font-bold uppercase tracking-tight text-gray-800">Secured Access</h4>
                                    <p className="text-xs leading-relaxed text-gray-500">
                                        ระบบสงวนสิทธิ์เฉพาะนักศึกษาและบุคลากรภาควิชาคอมพิวเตอร์ศึกษา
                                        <span className="ml-1 rounded border border-emerald-100 bg-white px-1.5 py-0.5 font-mono font-medium text-emerald-600">
                                            @kmutnb.ac.th
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <p className="cursor-default select-none font-mono text-[10px] text-gray-300 transition-colors hover:text-emerald-400">
                                {`// SYSTEM_ID: KMUTNB_CS_2026`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
