import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FaGoogle, FaUniversity } from 'react-icons/fa';
import { useState } from 'react';

const Login = () => {
    const { loginWithGoogle } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const result = await loginWithGoogle();

            if (result && result.success) {
                toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ');
                navigate('/');
            } else if (result && result.code === 'INVALID_EMAIL_DOMAIN') {
                toast.error(result.error || 'กรุณาใช้อีเมลมหาวิทยาลัย (@crru.ac.th) เท่านั้น');
            }
        } catch (error) {
            console.error('Login Failed', error);
            toast.error('ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
                {/* Background Decorations */}
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-green-200/30 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-200/30 rounded-full blur-3xl animate-float-delay"></div>

                {/* Login Card */}
                <div className="relative glass p-8 md:p-10 rounded-3xl shadow-premium text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-500">
                        <FaUniversity className="text-4xl text-white" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ยินดีต้อนรับ</h1>
                    <p className="text-gray-500 mb-8">ระบบจองห้องประชุม คณะครุศาสตร์</p>

                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-300 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <FaGoogle className="text-red-500 text-xl group-hover:scale-110 transition-transform" />
                                    <span>เข้าสู่ระบบด้วย CRRU Email</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 text-xs text-gray-400">
                        <p>กรุณาใช้อีเมล @crru.ac.th ในการเข้าสู่ระบบเท่านั้น</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
