import { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaUsers, FaCalendarPlus, FaEdit, FaTrash, FaRegImage } from 'react-icons/fa';

const RoomCard = ({ room, onBook, onEdit, onDelete, onViewDetails, onToggleStatus, statusLoading = false }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const isAdminCard = Boolean(onEdit || onDelete || onToggleStatus);
    const isPublicBookingCard = Boolean(onBook) && !isAdminCard;

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
            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col group cursor-pointer animate-fadeIn ${isPublicBookingCard ? 'self-start' : ''}`}
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
                </div>

                {isPublicBookingCard && room.isActive === false && (
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-medium shadow-sm">
                        ปิดปรับปรุง
                    </div>
                )}

            </div>

            {/* Content */}
            <div className="p-3 md:p-4 flex flex-col">
                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-1 md:mb-2 line-clamp-1">{room.name}</h3>
                <p className="text-gray-500 text-xs md:text-sm mb-2 line-clamp-2">
                    {room.description || 'ห้องอบรมพร้อมอุปกรณ์ครบครัน'}
                </p>

                {onToggleStatus && (
                    <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium tracking-[0.08em] text-gray-400">สถานะห้อง</p>
                                <p className={`text-sm font-semibold ${room.isActive === false ? 'text-gray-700' : 'text-gray-900'}`}>
                                    {room.isActive === false ? 'ปิดปรับปรุง' : 'พร้อมใช้งาน'}
                                </p>
                            </div>

                            {onToggleStatus && (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={room.isActive !== false}
                                    aria-label={room.isActive === false ? 'เปิดใช้งานห้อง' : 'ปิดปรับปรุงห้อง'}
                                    onClick={(e) => { e.stopPropagation(); onToggleStatus(room); }}
                                    disabled={statusLoading}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                                        room.isActive === false
                                            ? 'border-gray-300 bg-gray-300'
                                            : 'border-emerald-600 bg-emerald-600'
                                    }`}
                                >
                                    {statusLoading ? (
                                        <span className="mx-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/90 border-t-transparent" />
                                    ) : (
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                                room.isActive === false ? 'translate-x-1' : 'translate-x-6'
                                            }`}
                                        />
                                    )}
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">
                            {room.isActive === false
                                ? 'ปิดรับการจองชั่วคราว'
                                : 'เปิดให้ผู้ใช้จองได้ตามปกติ'}
                        </p>
                    </div>
                )}

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
                        className={`w-full py-2 md:py-2.5 ${room.isActive !== false ? 'bg-gray-900 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg' : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'} font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 text-xs md:text-sm mb-2 active:scale-[0.97]`}
                    >
                        {room.isActive !== false ? (
                            <>
                                <FaCalendarPlus className="text-[10px] md:text-xs" />
                                จองห้องนี้
                            </>
                        ) : (
                            'ห้องอยู่ระหว่างปรับปรุง'
                        )}
                    </button>
                )}

                {/* Admin Actions (Bottom) */}
                {(onEdit || onDelete || onToggleStatus) && (
                    <div className="mt-auto pt-3 border-t border-gray-100/80">
                        <div className="flex gap-2">
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(room); }}
                                    className="flex-1 py-1.5 px-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg shadow-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 text-xs"
                                >
                                    <FaEdit className="text-gray-500" size={13} /> แก้ไขข้อมูล
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(room._id); }}
                                    className="flex-1 py-1.5 px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg shadow-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 text-xs"
                                >
                                    <FaTrash className="text-red-500" size={13} /> ลบห้องพัก
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomCard;
