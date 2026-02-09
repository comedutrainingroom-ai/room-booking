import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { FaLock, FaUnlock, FaSpinner } from 'react-icons/fa';

const AdminGuard = ({ children }) => {
    const { isAdmin, isAdminUnlocked, unlockAdmin, loading } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    if (loading) return <div>Loading...</div>;

    // 1. Role Check: Must be 'admin' in database
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    // 2. PIN Check: Must enter correct PIN (2FA)
    if (isAdminUnlocked) {
        return children;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setVerifying(true);
        setError('');

        const result = await unlockAdmin(pin);

        if (!result.success) {
            setError(result.error || 'รหัสผ่านไม่ถูกต้อง');
            setPin('');
        }
        setVerifying(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] relative">
            {/* Logo Watermark */}
            <img
                src="/logo.png"
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-[0.04] pointer-events-none"
                style={{ maxWidth: '700px', maxHeight: '700px', margin: 'auto' }}
            />

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-sm w-full text-center relative z-10">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">
                    <FaLock />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Access</h2>
                <p className="text-gray-500 mb-6 text-sm">กรุณากรอกรหัส PIN (ขั้นที่ 2) เพื่อยืนยันตัวตน</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="กรอกรหัส PIN"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {verifying ? <FaSpinner className="animate-spin" /> : <FaUnlock />}
                        {verifying ? 'กำลังตรวจสอบ...' : 'ปลดล็อก'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminGuard;
