import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaSearch, FaUsers, FaPlug, FaRegImage, FaRegFrown, FaLock } from 'react-icons/fa';

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
        <div className="space-y-6 md:space-y-10">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-premium bg-white">
                {/* Dot Grid Background */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                {/* Diagonal Accent */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[60px]"></div>

                <div className="relative flex flex-col md:flex-row">
                    {/* Left Accent Bar */}
                    <div className="hidden md:block w-1.5 bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent shrink-0"></div>

                    {/* Main Content */}
                    <div className="flex-1 p-5 sm:p-8 md:p-10 lg:p-12">
                        {/* Top Label */}
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <span className="inline-block w-6 h-px bg-emerald-500"></span>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">ภาควิชาคอมพิวเตอร์ศึกษา</span>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
                            {/* Text Block */}
                            <div className="max-w-xl">
                                <h1 className="text-2xl sm:text-3xl md:text-[2.75rem] md:leading-[1.15] font-extrabold text-gray-900 mb-3 md:mb-4 tracking-tight">
                                    ระบบจองห้อง<span className="text-emerald-600">อบรม</span>
                                </h1>
                                <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-md mb-5 md:mb-7">
                                    จัดการจองห้องอบรมได้สะดวกรวดเร็ว พร้อมตรวจสอบสถานะห้องว่างได้ทันที
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Link
                                        to="/calendar"
                                        className="group inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 text-sm shadow-md hover:shadow-lg active:scale-[0.97]"
                                    >
                                        <FaCalendarAlt className="text-sm opacity-70 group-hover:opacity-100 transition-opacity" />
                                        ดูปฏิทินการจอง
                                    </Link>
                                    <Link
                                        to="/rooms"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-300 text-sm active:scale-[0.97]"
                                    >
                                        <FaSearch className="text-xs" />
                                        ค้นหาห้องว่าง
                                    </Link>
                                </div>
                            </div>

                            {/* Right Side — Compact Stats */}
                            <div className="hidden lg:flex items-end gap-3 shrink-0 pb-1">
                                <div className="flex flex-col items-center px-5 py-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
                                    <span className="text-3xl font-black text-emerald-600 leading-none">{rooms.length}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80 mt-1">ห้อง</span>
                                </div>
                                <div className="flex flex-col items-center px-5 py-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-3xl font-black text-gray-700 leading-none">{rooms.filter(r => r.isActive !== false).length}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">พร้อมใช้</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room List Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl md:text-3xl font-bold text-gray-800">ห้องประชุมที่ให้บริการ</h2>
                    <p className="text-gray-500 mt-1 md:mt-2 text-xs md:text-base">เลือกห้องที่เหมาะสมกับการใช้งานของคุณ</p>
                </div>
            </div>

            {/* Room Grid with Staggered Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {rooms.map((room, index) => (
                    <div
                        key={room._id}
                        className={`group bg-white rounded-2xl md:rounded-3xl shadow-premium overflow-hidden hover-lift hover:shadow-premium-hover animate-fadeIn stagger-${Math.min(index + 1, 6)}`}
                        style={{ opacity: 0 }}
                    >
                        {/* Image Container */}
                        <div className="h-40 md:h-52 bg-gray-100 relative overflow-hidden">
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
                            <div className={`absolute inset-0 ${room.images?.length > 0 ? 'hidden' : 'flex'} items-center justify-center text-gray-300 bg-gray-50`}>
                                <FaRegImage className="text-4xl text-gray-300" />
                            </div>

                            {/* Status Badge */}
                            <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 z-20">
                                {room.isActive === false ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-md border border-red-200">
                                        <FaLock /> ปิดซ่อมบำรุง
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-md border border-green-200">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        ว่างพร้อมจอง
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 md:p-6">
                            <h3 className="text-base md:text-xl font-bold text-gray-800 mb-1 md:mb-2 group-hover:text-green-600 transition-colors duration-300">
                                {room.name}
                            </h3>
                            <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-5 line-clamp-2 h-8 md:h-10">
                                {room.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-3 md:gap-5 text-xs md:text-sm text-gray-600 mb-3 md:mb-6 bg-gray-50 p-2.5 md:p-4 rounded-lg md:rounded-xl">
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
                            {room.isActive === false ? (
                                <button
                                    disabled
                                    className="block w-full py-2.5 md:py-3.5 text-center rounded-lg md:rounded-xl bg-gray-100 text-gray-400 border border-gray-200 font-semibold cursor-not-allowed text-sm md:text-base"
                                >
                                    ปิดให้บริการชั่วคราว
                                </button>
                            ) : (
                                <Link
                                    to="/calendar"
                                    className="group block w-full py-2.5 md:py-3.5 text-center rounded-lg md:rounded-xl bg-gray-900 hover:bg-emerald-600 text-white font-semibold transition-all duration-300 text-sm md:text-base shadow-md hover:shadow-lg active:scale-[0.97]"
                                >
                                    จองห้องนี้ทันที
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {rooms.length === 0 && (
                <div className="glass rounded-2xl md:rounded-3xl p-8 md:p-16 text-center shadow-premium">
                    <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-inner">
                        <FaRegFrown className="text-3xl md:text-4xl text-gray-400" />
                    </div>
                    <h3 className="text-base md:text-xl font-bold text-gray-800 mb-2">ไม่พบห้องว่างในขณะนี้</h3>
                    <p className="text-gray-500 text-sm md:text-base">กรุณาลองใหม่อีกครั้งในภายหลัง หรือติดต่อเจ้าหน้าที่</p>
                </div>
            )}
        </div>
    );
};

export default Home;
