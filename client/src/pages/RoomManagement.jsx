import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaBuilding } from 'react-icons/fa';
import RoomCard from '../components/RoomCard.jsx';
import { useToast } from '../contexts/ToastContext';

const RoomManagement = () => {
    const toast = useToast();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        capacity: '',
        description: '',
        equipment: ''
    });

    const fetchRooms = async () => {
        try {
            const res = await api.get('/rooms');
            setRooms(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching rooms", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleDelete = async (id) => {
        const confirmed = await toast.confirm({
            title: 'ยืนยันการลบ',
            message: 'คุณแน่ใจหรือไม่ที่จะลบห้องนี้?',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await api.delete(`/rooms/${id}`);
            setRooms(rooms.filter(room => room._id !== id));
            toast.success('ลบห้องเรียบร้อยแล้ว');
        } catch (error) {
            console.error("Error deleting room", error);
            toast.error('เกิดข้อผิดพลาดในการลบห้อง');
        }
    };

    const [selectedImages, setSelectedImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]); // State for images currently in DB

    const handleEdit = (room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            capacity: room.capacity,
            description: room.description || '',
            equipment: room.equipment ? room.equipment.join(', ') : ''
        });
        setExistingImages(room.images || []); // Set existing images
        setSelectedImages([]);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingRoom(null);
        setFormData({ name: '', capacity: '', description: '', equipment: '' });
        setSelectedImages([]);
        setExistingImages([]); // Reset existing images
        setIsModalOpen(true);
    };

    const handleImageChange = (e) => {
        setSelectedImages(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('capacity', formData.capacity);

        // Send existing images that we want to keep
        if (editingRoom) {
            existingImages.forEach(img => {
                data.append('keepImages', img);
            });
        }
        data.append('description', formData.description);

        const equipmentArray = formData.equipment.split(',').map(item => item.trim()).filter(item => item !== '');
        equipmentArray.forEach(item => data.append('equipment[]', item));

        selectedImages.forEach(image => {
            data.append('images', image);
        });

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };

            if (editingRoom) {
                await api.put(`/rooms/${editingRoom._id}`, data, config);
            } else {
                await api.post('/rooms', data, config);
            }
            fetchRooms();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving room", error);
            const errorMessage = error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
            toast.error(errorMessage);
        }
    };

    if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">จัดการห้องประชุม</h1>
                <button
                    onClick={handleAddNew}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-sm"
                >
                    <FaPlus /> เพิ่มห้องใหม่
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                    <RoomCard
                        key={room._id}
                        room={room}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {rooms.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <div className="text-gray-300 text-6xl mb-4 flex justify-center"><FaBuilding /></div>
                    <p className="text-gray-500 text-lg">ยังไม่มีห้องประชุมในระบบ</p>
                    <button
                        onClick={handleAddNew}
                        className="mt-4 text-primary hover:underline"
                    >
                        เพิ่มห้องแรกเลย!
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">{editingRoom ? 'แก้ไขห้องประชุม' : 'เพิ่มห้องประชุมใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้อง</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="เช่น ห้องประชุม 1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ความจุ (คน)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="เช่น 10"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อุปกรณ์ (คั่นด้วยจุลภาค)</label>
                                <input
                                    type="text"
                                    value={formData.equipment}
                                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="เช่น โปรเจคเตอร์, กระดานไวท์บอร์ด"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพห้อง</label>

                                {/* Show Existing Images */}
                                {existingImages.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-500 mb-2">รูปภาพเดิม (คลิกที่กากบาทเพื่อลบ):</p>
                                        <div className="flex flex-wrap gap-2">
                                            {existingImages.map((img, index) => (
                                                <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                                    <img
                                                        src={`http://localhost:5000/uploads/${img}`}
                                                        alt={`Room ${index}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600"
                                                    >
                                                        <FaTimes size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className="block text-xs text-gray-500 mb-1">เพิ่มรูปใหม่:</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedImages.map((file, index) => (
                                        <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-[150px]">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 h-24 resize-none"
                                    placeholder="รายละเอียดเกี่ยวกับห้อง..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                                >
                                    <FaSave /> บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomManagement;
