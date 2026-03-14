import { useState, useEffect, useMemo } from 'react';
import { FaBuilding, FaSearch, FaFilter, FaTimes, FaUsers, FaCalendarPlus } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import RoomCard from '../components/RoomCard';
import { useNavigate, useLocation } from 'react-router-dom';

const RoomSelection = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [capacityFilter, setCapacityFilter] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    // Read date from query params (passed from Calendar page)
    const queryDate = new URLSearchParams(location.search).get('date');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await api.get('/rooms');
            setRooms(res.data.data);
        } catch (error) {
            console.error("Error fetching rooms", error);
            toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
        } finally {
            setLoading(false);
        }
    };

    const handleBookRoom = (room) => {
        const datePart = queryDate ? `?date=${queryDate}` : '';
        navigate(`/book-room/${room._id}${datePart}`);
    };

    // Filter rooms
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesCapacity = true;
            if (capacityFilter === 'small') matchesCapacity = room.capacity <= 10;
            else if (capacityFilter === 'medium') matchesCapacity = room.capacity > 10 && room.capacity <= 30;
            else if (capacityFilter === 'large') matchesCapacity = room.capacity > 30;

            return matchesSearch && matchesCapacity;
        });
    }, [rooms, searchTerm, capacityFilter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูลห้อง...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full px-0 sm:px-4 py-4 sm:py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">เลือกห้องอบรม</h1>
                <p className="text-gray-500">เลือกห้องที่ต้องการและทำการจองได้ทันที</p>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาห้อง..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400 text-sm" />
                        <select
                            value={capacityFilter}
                            onChange={(e) => setCapacityFilter(e.target.value)}
                            className="px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white text-sm"
                        >
                            <option value="all">ทุกขนาด</option>
                            <option value="small">เล็ก (≤10 คน)</option>
                            <option value="medium">กลาง (11-30 คน)</option>
                            <option value="large">ใหญ่ (&gt;30 คน)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Room Count */}
            <div className="mb-4">
                <p className="text-sm text-gray-500">
                    พบ <span className="font-bold text-primary">{filteredRooms.length}</span> ห้อง
                </p>
            </div>

            {/* Room Grid */}
            {filteredRooms.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FaBuilding className="text-5xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">ไม่พบห้องที่ตรงกับเงื่อนไข</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRooms.map((room) => (
                        <RoomCard
                            key={room._id}
                            room={room}
                            onBook={handleBookRoom}
                            onViewDetails={setSelectedRoom}
                        />
                    ))}
                </div>
            )}

            {/* Room Details Modal */}
            {selectedRoom && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-backdrop-fade"
                    onClick={() => setSelectedRoom(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-modal-slideUp"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Image Section */}
                        <div className="md:w-1/2 relative bg-gray-100 min-h-[250px] md:min-h-full flex-shrink-0">
                            {selectedRoom.images && selectedRoom.images.length > 0 ? (
                                <img
                                    src={`/uploads/${selectedRoom.images[0]}`}
                                    alt={selectedRoom.name}
                                    className="w-full h-full object-cover absolute inset-0"
                                />
                            ) : (
                                <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                                    <FaBuilding className="text-6xl text-gray-300" />
                                </div>
                            )}
                            
                            {/* Mobile Close Button (Over Image) */}
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-md transition-colors md:hidden z-10"
                            >
                                <FaTimes />
                            </button>
                            
                            {/* Mobile Book Button Sticky Bottom Image */}
                            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent md:hidden flex justify-end">
                                <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-800 flex items-center gap-2 shadow-sm">
                                    <FaUsers className="text-primary" /> {selectedRoom.capacity} ท่าน
                                </div>
                            </div>
                        </div>
                        
                        {/* Modal Content Section */}
                        <div className="p-6 md:p-8 md:w-1/2 flex flex-col relative overflow-y-auto w-full custom-scrollbar">
                            {/* Desktop Close Button */}
                            <button
                                onClick={() => setSelectedRoom(null)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors hidden md:block"
                            >
                                <FaTimes />
                            </button>

                            <div className="mb-6 pr-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{selectedRoom.name}</h2>
                                <div className="hidden md:inline-flex items-center gap-2 text-sm text-gray-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    <FaUsers className="text-emerald-600" />
                                    <span>รองรับผู้เข้าร่วมได้สูงสุด <strong>{selectedRoom.capacity}</strong> ท่าน</span>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">รายละเอียดห้อง</h3>
                                <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    {selectedRoom.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติมสำหรับห้องนี้'}
                                </p>
                            </div>

                            {selectedRoom.equipment && selectedRoom.equipment.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">อุปกรณ์อำนวยความสะดวก</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRoom.equipment.map((eq, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 shadow-sm text-gray-700 text-xs md:text-sm font-medium rounded-lg flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => handleBookRoom(selectedRoom)}
                                    className="w-full py-3.5 bg-gradient-to-r from-primary to-emerald-500 hover:from-emerald-500 hover:to-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <FaCalendarPlus className="text-lg" />
                                    ดำเนินการจองห้องนี้
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomSelection;
