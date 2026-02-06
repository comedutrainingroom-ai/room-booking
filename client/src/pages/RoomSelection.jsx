import { useState, useEffect, useMemo } from 'react';
import { FaBuilding, FaSearch, FaFilter } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import RoomCard from '../components/RoomCard';
import { useNavigate } from 'react-router-dom';

const RoomSelection = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [capacityFilter, setCapacityFilter] = useState('all');

    const navigate = useNavigate();
    const toast = useToast();

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
        navigate(`/book-room/${room._id}`);
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
        <div className="p-4 md:p-6 w-full h-full">
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoomSelection;
