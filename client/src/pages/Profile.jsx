import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { FaUser, FaIdCard, FaPhone, FaUniversity, FaSave } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const Profile = () => {
    const { currentUser, dbUser, syncUserWithBackend } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        studentId: '',
        phone: '',
        faculty: ''
    });

    useEffect(() => {
        if (dbUser) {
            setFormData({
                name: dbUser.name || '',
                studentId: dbUser.studentId || '',
                phone: dbUser.phone || '',
                faculty: dbUser.faculty || ''
            });
        }
    }, [dbUser]);

    const handleChange = useCallback((e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setSuccess(false);
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/auth/profile', formData);

            // Refresh local user data
            await syncUserWithBackend(currentUser);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        setLoading(false);
    }, [formData, currentUser, syncUserWithBackend, toast]);

    return (
        <div className="w-full h-full px-0 sm:px-4 py-6 sm:py-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">ข้อมูลส่วนตัว</h1>
            <p className="text-gray-500 text-sm md:text-base mb-6 md:mb-8">จัดการข้อมูลของคุณเพื่อให้ผู้ดูแลระบบติดต่อได้สะดวก</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-green-50/50 p-4 md:p-6 flex flex-col items-center border-b border-gray-100">
                    <img
                        src={currentUser?.photoURL || dbUser?.picture}
                        alt="Profile"
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md object-cover mb-3"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${currentUser?.displayName}&background=random`;
                        }}
                    />
                    <h2 className="text-xl font-bold text-gray-800">{currentUser?.displayName}</h2>
                    <span className="text-sm text-gray-500">{currentUser?.email}</span>
                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${dbUser?.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {dbUser?.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '🎓 นักศึกษา'}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ - นามสกุล</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUser className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                placeholder="เช่น สมชาย ใจดี"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Student ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">รหัสนักศึกษา</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaIdCard className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="studentId"
                                    value={formData.studentId}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                    placeholder="เช่น 64XXXXXXX"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaPhone className="text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                    placeholder="เช่น 081-234-5678"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Faculty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">คณะ / สังกัด</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUniversity className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="faculty"
                                value={formData.faculty}
                                onChange={handleChange}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                placeholder="เช่น ครุศาสตร์คอมพิวเตอร์"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5'}`}
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <FaSave /> บันทึกข้อมูล
                                </>
                            )}
                        </button>
                    </div>

                    {success && (
                        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-center font-medium animate-in fade-in slide-in-from-bottom-2">
                            บันทึกข้อมูลเรียบร้อยแล้ว! ✅
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Profile;
