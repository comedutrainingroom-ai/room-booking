import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FaGoogle, FaShieldAlt, FaCode, FaMicrochip, FaNetworkWired, FaServer } from 'react-icons/fa';
import { useState, useEffect } from 'react';

const Login = () => {
    const { loginWithGoogle, currentUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [typedText, setTypedText] = useState('');
    const fullText = "SYSTEM.INITIALIZE(COM_EDU_DEPT);";

    useEffect(() => {
        if (currentUser) {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            setTypedText(fullText.slice(0, index));
            index++;
            if (index > fullText.length) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const result = await loginWithGoogle();

            if (result && result.success) {
                toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ');
            } else if (result && result.code === 'INVALID_EMAIL_DOMAIN') {
                toast.error('กรุณาใช้อีเมลมหาวิทยาลัย (@kmutnb.ac.th) เท่านั้น');
            } else if (result && result.code === 'BANNED_USER') {
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
        <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-50 text-gray-800 selection:bg-emerald-100">
            {/* 1. Global Background - Clean Tech Grid */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Ambient Blobs (Matches Home.jsx) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-200/20 rounded-full blur-[80px] animate-float"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-200/20 rounded-full blur-[80px] animate-float-delay"></div>
            </div>

            {/* 2. Main Container */}
            <div className="relative w-full max-w-[1600px] h-auto min-h-fit md:min-h-[85vh] lg:h-[90vh] bg-white/80 backdrop-blur-2xl rounded-2xl md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/50 z-10 animate-scale-in">

                {/* LEFT SIDE (60%) - Hero Image & Branding (Matches Navbar/Home style) */}
                <div className="hidden lg:flex w-[60%] relative flex-col justify-between p-16 overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-800 text-white group">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                    {/* Tech Overlay Image */}
                    <div className="absolute bottom-0 right-0 w-[120%] h-[120%] opacity-20 translate-x-1/4 translate-y-1/4">
                        <FaMicrochip className="w-full h-full text-white rotate-12" />
                    </div>

                    {/* Branding Top */}
                    <div className="relative z-10 animate-fade-in stagger-1">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium shadow-sm">
                            <FaNetworkWired className="text-emerald-300" />
                            <span className="tracking-wide text-sm font-mono text-emerald-50">Computer Education Dept.</span>
                        </div>
                    </div>

                    {/* Branding Bottom */}
                    <div className="relative z-10 max-w-2xl animate-fade-in stagger-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-emerald-400/30">
                                <FaServer className="text-2xl text-emerald-300" />
                            </div>
                            <div className="h-px w-20 bg-emerald-400/50"></div>
                            <span className="font-mono text-emerald-200 text-sm tracking-widest">FACILITY MANAGER v3.0</span>
                        </div>

                        <h2 className="text-6xl font-bold leading-tight mb-6 tracking-tight drop-shadow-md font-display">
                            ระบบจองห้องอบรม<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-cyan-200">ภาควิชาคอมพิวเตอร์ศึกษา</span>
                        </h2>

                        <p className="text-emerald-100 text-xl font-light leading-relaxed max-w-lg mb-8">
                            ระบบจองห้องอบรมสำหรับนักศึกษาเเละบุคลากรภาควิชาคอมพิวเตอร์ศึกษา คณะครุศาสตร์อุตสาหกรรม
                        </p>

                        {/* Floating Cards Mockup */}
                        <div className="flex gap-4">
                            <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col gap-1">
                                <span className="text-3xl font-bold text-white">24<span className="text-emerald-300 text-sm">/7</span></span>
                                <span className="text-xs text-emerald-200 uppercase tracking-wider">Access</span>
                            </div>
                            <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col gap-1">
                                <span className="text-3xl font-bold text-white">100<span className="text-emerald-300 text-sm">%</span></span>
                                <span className="text-xs text-emerald-200 uppercase tracking-wider">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE (40%) - Login Interface */}
                <div className="w-full lg:w-[40%] flex items-center justify-center p-4 sm:p-8 md:p-16 relative bg-white/60 backdrop-blur-xl">
                    <div className="w-full max-w-md relative z-10">

                        {/* Header Section */}
                        <div className="mb-6 md:mb-10 text-center">
                            <div className="mb-8 flex justify-center mt-10 sm:mt-12 lg:mt-0">
                                <img
                                    src="/Comedu.png"
                                    alt="ComEdu Logo"
                                    className="h-24 sm:h-28 md:h-32 lg:h-36 object-contain drop-shadow-lg transform hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 tracking-tight font-display">
                                ยินดีต้อนรับ
                            </h1>
                            <div className="flex items-center justify-center gap-2 text-gray-500 font-mono text-sm">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="typing-cursor text-emerald-600">{typedText}</span>
                            </div>
                        </div>

                        {/* Login Action */}
                        <div className="space-y-6">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full group relative overflow-hidden bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-100 hover:border-emerald-200 font-bold py-5 px-6 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100 active:scale-95"
                            >
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-50/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                                <div className="relative flex items-center justify-between px-2">
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <svg className="w-5 h-5" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
                                                    <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
                                                    <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
                                                    <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
                                                    <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
                                                </svg>
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sign in with</span>
                                                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">KMUTNB Account</span>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                                <FaCode className="text-gray-400 group-hover:text-emerald-600 text-sm" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>

                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-500 border border-emerald-100">
                                    <FaShieldAlt className="text-lg" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-gray-800 mb-1 font-mono uppercase tracking-tight">Secured Access</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        ระบบสงวนสิทธิ์เฉพาะนักศึกษาเเละบุคลากรภาควิชาคอมพิวเตอร์ศึกษา
                                        <span className="font-mono text-emerald-600 font-medium bg-white px-1.5 py-0.5 rounded ml-1 border border-emerald-100">@kmutnb.ac.th</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Code Decor */}
                        <div className="mt-12 text-center">
                            <p className="text-[10px] font-mono text-gray-300 hover:text-emerald-400 transition-colors cursor-default select-none">
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
