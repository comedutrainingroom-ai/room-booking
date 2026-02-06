import { useState, useEffect } from 'react';
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
        urgency: 'normal',
        roomId: ''
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await api.get('/rooms');
            if (res.data.success) {
                setRooms(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in duration-300">

                {/* Left Side: Visual & Info */}
                <div className="md:w-2/5 bg-gradient-to-br from-red-500 to-orange-600 p-10 text-white flex flex-col justify-between relative overflow-hidden">
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
                <div className="md:w-3/5 p-8 md:p-12 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        แบบฟอร์มแจ้งปัญหา
                        <span className="text-sm font-normal text-gray-400 ml-auto">* จำเป็นต้องกรอก</span>
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Topic */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="topic"
                                required
                                value={formData.topic}
                                onChange={handleChange}
                                className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none font-medium"
                                placeholder="เช่น แอร์ไม่เย็น, โปรเจคเตอร์เปิดไม่ติด"
                            />
                        </div>

                        {/* Room Selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">สถานที่ / ห้อง</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaBuilding className="text-gray-400" />
                                </div>
                                <select
                                    name="roomId"
                                    value={formData.roomId}
                                    onChange={handleChange}
                                    className="block w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none appearance-none font-medium text-gray-600"
                                >
                                    <option value="">-- เลือกห้องที่เป็นปัญหา --</option>
                                    {rooms.map(room => (
                                        <option key={room._id} value={room._id}>
                                            {room.name}
                                        </option>
                                    ))}
                                    <option value="other">อื่นๆ / พื้นที่ส่วนกลาง</option>
                                </select>
                            </div>
                        </div>

                        {/* Urgency */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">ระดับความเร่งด่วน</label>
                            <div className="grid grid-cols-3 gap-4">
                                <label className={`cursor-pointer relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                    ${formData.urgency === 'normal'
                                        ? 'bg-blue-50 border-blue-500 shadow-md'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="urgency" value="normal" className="sr-only" checked={formData.urgency === 'normal'} onChange={e => setFormData({ ...formData, urgency: e.target.value })} />
                                    <span className={`font-bold mb-1 ${formData.urgency === 'normal' ? 'text-blue-700' : 'text-gray-600'}`}>ปกติ</span>
                                    <span className="text-xs text-gray-400">รอได้ 1-2 วัน</span>
                                </label>

                                <label className={`cursor-pointer relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                    ${formData.urgency === 'urgent'
                                        ? 'bg-orange-50 border-orange-500 shadow-md'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="urgency" value="urgent" className="sr-only" checked={formData.urgency === 'urgent'} onChange={e => setFormData({ ...formData, urgency: e.target.value })} />
                                    <span className={`font-bold mb-1 ${formData.urgency === 'urgent' ? 'text-orange-700' : 'text-gray-600'}`}>ด่วน</span>
                                    <span className="text-xs text-gray-400">ภายใน 24 ชม.</span>
                                </label>

                                <label className={`cursor-pointer relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                    ${formData.urgency === 'emergency'
                                        ? 'bg-red-50 border-red-500 shadow-md'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="urgency" value="emergency" className="sr-only" checked={formData.urgency === 'emergency'} onChange={e => setFormData({ ...formData, urgency: e.target.value })} />
                                    <span className={`font-bold mb-1 ${formData.urgency === 'emergency' ? 'text-red-700' : 'text-gray-600'}`}>ฉุกเฉิน 🔥</span>
                                    <span className="text-xs text-gray-400">ทันที</span>
                                </label>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
                            <textarea
                                name="description"
                                required
                                rows="3"
                                value={formData.description}
                                onChange={handleChange}
                                className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors outline-none resize-none"
                                placeholder="ระบุรายละเอียดให้ครบถ้วน..."
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-[0.98]
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
