import { useState } from 'react';
import { FaBuilding, FaChevronLeft, FaChevronRight, FaUsers, FaCalendarPlus, FaEdit, FaTrash, FaLock, FaRegImage } from 'react-icons/fa';

const RoomCard = ({ room, onBook, onEdit, onDelete, onViewDetails }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = (e) => {
        e.stopPropagation();
        if (room.images && room.images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % room.images.length);
        }
    };

    const prevImage = (e) => {
        e.stopPropagation();
        if (room.images && room.images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + room.images.length) % room.images.length);
        }
    };

    const hasMultipleImages = room.images && room.images.length > 1;

    return (
        <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col group cursor-pointer animate-fadeIn"
            onClick={() => {
                if (onViewDetails) onViewDetails(room);
                else if (onBook) onBook(room);
            }}
        >
            {/* Image */}
            <div className="relative aspect-[2/1] bg-gray-100 overflow-hidden group/image">
                {room.images && room.images.length > 0 ? (
                    <img
                        src={`/uploads/${room.images[currentImageIndex]}`}
                        alt={room.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <FaRegImage className="text-4xl text-gray-300" />
                    </div>
                )}

                {hasMultipleImages && (
                    <>
                        <button onClick={prevImage} className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity">
                            <FaChevronLeft size={10} />
                        </button>
                        <button onClick={nextImage} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity">
                            <FaChevronRight size={10} />
                        </button>
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                            {room.images.map((_, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></div>
                            ))}
                        </div>
                    </>
                )}

                {/* Status/Capacity Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold text-gray-700 flex items-center gap-1 shadow-sm border border-gray-100 w-fit">
                        <FaUsers className="text-primary text-[10px]" /> {room.capacity}
                    </div>
                    {room.isActive === false && (
                        <div className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs font-bold shadow-sm border border-red-200 w-fit flex items-center gap-1">
                            <FaLock /> ปิดซ่อมบำรุง
                        </div>
                    )}
                </div>

                {/* Admin Actions Overlay (if onEdit/onDelete provided) */}
                {(onEdit || onDelete) && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(room); }}
                                className="p-1.5 bg-white text-blue-600 rounded shadow-sm hover:bg-blue-50"
                                title="แก้ไข"
                            >
                                <FaEdit size={12} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(room._id); }}
                                className="p-1.5 bg-white text-red-600 rounded shadow-sm hover:bg-red-50"
                                title="ลบ"
                            >
                                <FaTrash size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 md:p-4 flex-grow flex flex-col">
                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 md:mb-2 line-clamp-1">{room.name}</h3>
                <p className="text-gray-500 text-xs md:text-sm mb-2 line-clamp-2 flex-grow">
                    {room.description || 'ห้องอบรมพร้อมอุปกรณ์ครบครัน'}
                </p>

                {/* Equipment Tags */}
                {room.equipment && room.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3">
                        {room.equipment.slice(0, 2).map((eq, i) => (
                            <span key={i} className="px-1.5 md:px-2 py-0.5 bg-green-50 text-green-700 text-[10px] md:text-xs rounded font-medium">
                                {eq}
                            </span>
                        ))}
                        {room.equipment.length > 2 && (
                            <span className="px-1.5 md:px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] md:text-xs rounded">
                                +{room.equipment.length - 2}
                            </span>
                        )}
                    </div>
                )}

                {/* Book Button */}
                {onBook && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (room.isActive !== false) {
                                onBook(room);
                            }
                        }}
                        disabled={room.isActive === false}
                        className={`w-full py-2 md:py-2.5 ${room.isActive !== false ? 'bg-green-700 text-white hover:bg-green-800 shadow-sm' : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'} font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs md:text-sm`}
                    >
                        {room.isActive !== false ? (
                            <>
                                <FaCalendarPlus className="text-[10px] md:text-xs" />
                                จองห้องนี้
                            </>
                        ) : (
                            <>
                                <FaLock className="text-[10px] md:text-xs" />
                                ไม่พร้อมให้บริการ
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default RoomCard;
