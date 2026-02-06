import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaSearch, FaUsers, FaPlug } from 'react-icons/fa';

const Home = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await api.get('/rooms');
                setRooms(res.data.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching rooms:', error);
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Hero Section with Animated Gradient Background */}
            <div className="relative overflow-hidden rounded-3xl shadow-premium">
                {/* Animated Gradient Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-green-400/40 to-cyan-400/30 rounded-full blur-3xl animate-float animate-pulse-glow"></div>
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-tl from-emerald-400/30 to-teal-400/20 rounded-full blur-3xl animate-float-delay"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-300/20 to-cyan-300/20 rounded-full blur-3xl animate-pulse-glow"></div>
                </div>

                {/* Content */}
                <div className="relative glass p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-5 leading-tight">
                            ยินดีต้อนรับสู่
                            <br />
                            <span className="gradient-text">ระบบจองห้องอบรม</span>
                        </h1>
                        <p className="text-gray-600 text-lg md:text-xl leading-relaxed mb-8">
                            จัดการการจองห้องประชุมได้อย่างง่ายดาย สะดวก และรวดเร็ว
                            พร้อมตรวจสอบสถานะห้องว่างได้ทันที
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                to="/calendar"
                                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:shadow-green-200/50 transition-all duration-300 hover:-translate-y-1"
                            >
                                <FaCalendarAlt className="text-lg group-hover:animate-bounce" />
                                ดูปฏิทินการจอง
                            </Link>
                            <Link
                                to="/rooms"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-green-700 bg-white/80 hover:bg-white border border-green-200 hover:border-green-300 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md"
                            >
                                <FaSearch />
                                ค้นหาห้องว่าง
                            </Link>
                        </div>
                    </div>

                    {/* Hero Illustration */}
                    <div className="hidden lg:flex relative">
                        <div className="w-56 h-56 bg-gradient-to-br from-green-100 to-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                            <div className="text-8xl animate-pulse">🏢</div>
                        </div>
                        {/* Floating badges */}
                        <div className="absolute -top-2 -right-2 bg-white rounded-xl shadow-lg px-4 py-2 animate-float">
                            <span className="text-green-600 font-bold text-sm">✓ ว่าง</span>
                        </div>
                        <div className="absolute -bottom-2 -left-4 bg-white rounded-xl shadow-lg px-4 py-2 animate-float-delay">
                            <span className="text-gray-600 font-medium text-sm">5 ห้อง</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room List Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">ห้องประชุมที่ให้บริการ</h2>
                    <p className="text-gray-500 mt-2">เลือกห้องที่เหมาะสมกับการใช้งานของคุณ</p>
                </div>
            </div>

            {/* Room Grid with Staggered Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rooms.map((room, index) => (
                    <div
                        key={room._id}
                        className={`group bg-white rounded-3xl shadow-premium overflow-hidden hover-lift hover:shadow-premium-hover animate-fadeIn stagger-${Math.min(index + 1, 6)}`}
                        style={{ opacity: 0 }}
                    >
                        {/* Image Container */}
                        <div className="h-52 bg-gray-100 relative overflow-hidden">
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-50 transition-opacity duration-500"></div>

                            {/* Room Image */}
                            {room.images && room.images.length > 0 ? (
                                <img
                                    src={`/uploads/${room.images[0]}`}
                                    alt={room.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                            ) : null}

                            {/* Fallback */}
                            <div className={`absolute inset-0 ${room.images?.length > 0 ? 'hidden' : 'flex'} items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100`}>
                                <span className="text-6xl group-hover:scale-110 transition-transform duration-500">🖼️</span>
                            </div>

                            {/* Status Badge */}
                            <div className="absolute bottom-4 left-4 z-20">
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/95 backdrop-blur-sm text-green-600 text-xs font-bold rounded-full shadow-lg">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    ว่างพร้อมจอง
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors duration-300">
                                {room.name}
                            </h3>
                            <p className="text-gray-500 text-sm mb-5 line-clamp-2 h-10">
                                {room.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-5 text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl">
                                <span className="flex items-center gap-2 font-medium">
                                    <FaUsers className="text-green-500" />
                                    {room.capacity} คน
                                </span>
                                <div className="h-5 w-px bg-gray-200"></div>
                                <span className="flex items-center gap-2">
                                    <FaPlug className="text-green-500" />
                                    {room.equipment?.length || 0} อุปกรณ์
                                </span>
                            </div>

                            {/* CTA Button */}
                            <Link
                                to="/calendar"
                                className="block w-full py-3.5 text-center rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white font-semibold hover:from-green-600 hover:to-emerald-500 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                จองห้องนี้ทันที
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {rooms.length === 0 && (
                <div className="glass rounded-3xl p-16 text-center shadow-premium">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <span className="text-4xl">😕</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">ไม่พบห้องว่างในขณะนี้</h3>
                    <p className="text-gray-500">กรุณาลองใหม่อีกครั้งในภายหลัง หรือติดต่อเจ้าหน้าที่</p>
                </div>
            )}
        </div>
    );
};

export default Home;
