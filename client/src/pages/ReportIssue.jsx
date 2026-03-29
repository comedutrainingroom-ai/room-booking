import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaExclamationTriangle, FaPaperPlane, FaBuilding, FaTools, FaCheckCircle } from 'react-icons/fa';
import { useToast } from '../contexts/ToastContext';

const ReportIssue = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        topic: '',
        description: '',
        roomId: ''
    });

    const fetchRooms = useCallback(async () => {
        try {
            const res = await api.get('/rooms');
            if (res.data.success) {
                setRooms(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const confirmed = await toast.confirm({
            title: 'ยืนยันการส่งแจ้งซ่อม',
            message: 'กรุณาตรวจสอบข้อมูลก่อนส่งเรื่องแจ้งซ่อม',
            content: (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div
                        className="border-b border-gray-200 px-4 py-3"
                        style={{
                            backgroundImage: 'linear-gradient(135deg, rgba(229,231,235,0.55) 25%, transparent 25%, transparent 50%, rgba(229,231,235,0.55) 50%, rgba(229,231,235,0.55) 75%, transparent 75%, transparent)',
                            backgroundSize: '16px 16px'
                        }}
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <FaExclamationTriangle className="h-4 w-4 text-amber-600" />
                            ข้อมูลติดต่อกรณีเร่งด่วน
                        </div>
                    </div>

                    <div className="space-y-3 px-4 py-4 text-sm text-gray-700">
                        <div className="grid grid-cols-[88px_1fr] gap-3">
                            <span className="text-gray-500">เจ้าหน้าที่</span>
                            <span className="font-semibold text-gray-900">พี่ไม้</span>
                        </div>

                        <div className="grid grid-cols-[88px_1fr] gap-3 border-t border-dashed border-gray-200 pt-3">
                            <span className="text-gray-500">เบอร์ติดต่อ</span>
                            <span className="font-bold tracking-[0.04em] text-gray-900">098-542-1998</span>
                        </div>
                    </div>
                </div>
            ),
            type: 'warning'
        });

        if (!confirmed) {
            return;
        }

        setLoading(true);
        try {
            await api.post('/reports', formData);
            toast.success('แจ้งปัญหาเรียบร้อยแล้ว ขอบคุณที่ช่วยดูแลห้องครับ');
            navigate('/');
        } catch (error) {
            console.error("Failed to submit report", error);
            toast.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.error || error.message));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 p-2 md:p-8 flex items-start md:items-center justify-center">
            <div className="w-full max-w-6xl bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">

                {/* Mobile Compact Banner - shown only on mobile */}
                <div className="md:hidden bg-gradient-to-r from-red-500 to-orange-600 p-3 flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                        <FaExclamationTriangle className="text-lg text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">พบปัญหา แจ้งเราทันที</h1>
                        <p className="text-red-100 text-[10px]">ช่วยกันดูแลรักษาอุปกรณ์และสถานที่</p>
                    </div>
                </div>

                {/* Desktop Side Panel - hidden on mobile */}
                <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-red-500 to-orange-600 p-10 text-white flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 -m-10 opacity-10">
                        <FaTools className="text-[300px]" />
                    </div>

                    <div className="relative z-10">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl w-fit mb-6 shadow-lg border border-white/20">
                            <FaExclamationTriangle className="text-4xl text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4 leading-tight">พบปัญหา<br />แจ้งเราทันที</h1>
                        <p className="text-red-100 text-lg">
                            ช่วยกันดูแลรักษาอุปกรณ์และสถานที่ เพื่อการใช้งานที่ราบรื่นสำหรับทุกคน
                        </p>
                    </div>

                    <div className="relative z-10 mt-12 space-y-4">
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <FaCheckCircle className="text-green-300 text-xl" />
                            <span className="text-sm">แจ้งปัญหาง่ายๆ ใน 1 นาที</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <FaCheckCircle className="text-green-300 text-xl" />
                            <span className="text-sm">ติดตามสถานะการซ่อมได้</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <FaCheckCircle className="text-green-300 text-xl" />
                            <span className="text-sm">เจ้าหน้าที่พร้อมดูแล 24 ชม.</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="md:w-3/5 p-3 md:p-12 overflow-y-auto">
                    <h2 className="text-base md:text-2xl font-bold text-gray-800 mb-3 md:mb-6 flex items-center gap-2">
                        แบบฟอร์มแจ้งปัญหา
                        <span className="text-[10px] md:text-sm font-normal text-gray-400 ml-auto">* จำเป็นต้องกรอก</span>
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
                        {/* Topic */}
                        <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="topic"
                                required
                                value={formData.topic}
                                onChange={handleChange}
                                className="block w-full px-3 md:px-5 py-2.5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none font-medium text-sm"
                                placeholder="เช่น แอร์ไม่เย็น, โปรเจคเตอร์เปิดไม่ติด"
                            />
                        </div>

                        {/* Room Selector */}
                        <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">สถานที่ / ห้อง</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaBuilding className="text-gray-400" />
                                </div>
                                <select
                                    name="roomId"
                                    value={formData.roomId}
                                    onChange={handleChange}
                                    className="block w-full pl-9 md:pl-11 pr-4 md:pr-5 py-2.5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none appearance-none font-medium text-gray-600 text-sm"
                                >
                                    <option value="">-- เลือกห้องที่เป็นปัญหา --</option>
                                    {rooms.map(room => (
                                        <option key={room._id} value={room._id}>
                                            {room.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
                            <textarea
                                name="description"
                                required
                                rows="3"
                                value={formData.description}
                                onChange={handleChange}
                                className="block w-full px-3 md:px-5 py-2.5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none resize-none text-sm"
                                placeholder="ระบุรายละเอียดให้ครบถ้วน..."
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-sm md:text-lg text-white shadow-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 transform active:scale-[0.98]
                                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-orange-600 hover:shadow-red-500/30 hover:-translate-y-1'}`}
                            >
                                {loading ? (
                                    <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                                ) : (
                                    <>
                                        <FaPaperPlane /> ส่งเรื่องแจ้งซ่อม
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportIssue;
