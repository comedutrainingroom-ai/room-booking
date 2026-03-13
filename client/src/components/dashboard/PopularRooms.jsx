import { useMemo } from 'react';
import { FaTrophy, FaDoorOpen, FaMedal } from 'react-icons/fa';

const PopularRooms = ({ bookings }) => {
    // Calculate room popularity
    const roomStats = useMemo(() => {
        const roomCount = {};

        bookings.forEach(b => {
            if (b.room && b.room._id) {
                const roomId = b.room._id;
                if (!roomCount[roomId]) {
                    roomCount[roomId] = {
                        id: roomId,
                        name: b.room.name || 'Unknown Room',
                        count: 0
                    };
                }
                roomCount[roomId].count++;
            }
        });

        // Convert to array and sort by count descending
        const sorted = Object.values(roomCount).sort((a, b) => b.count - a.count);
        return sorted.slice(0, 5); // Top 5 rooms
    }, [bookings]);

    const maxCount = roomStats.length > 0 ? roomStats[0].count : 1;

    const getMedalColor = (index) => {
        if (index === 0) return 'text-yellow-500';
        if (index === 1) return 'text-gray-400';
        if (index === 2) return 'text-amber-600';
        return 'text-gray-300';
    };

    const getBarColor = (index) => {
        if (index === 0) return 'bg-emerald-600';
        if (index === 1) return 'bg-emerald-500';
        if (index === 2) return 'bg-emerald-400';
        return 'bg-gray-300';
    };

    return (
        <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-gray-100 text-gray-600">
                    <FaTrophy />
                </div>
                <h3 className="font-bold text-gray-800">ห้องยอดนิยม</h3>
                <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-auto font-medium">
                    Top {roomStats.length}
                </span>
            </div>

            {roomStats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <FaDoorOpen className="text-4xl mx-auto mb-2 opacity-30" />
                    <p className="text-sm">ยังไม่มีข้อมูลการจอง</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {roomStats.map((room, index) => (
                        <div key={room.id} className="group">
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`text-lg ${getMedalColor(index)}`}>
                                    {index < 3 ? <FaMedal /> : <span className="text-xs font-bold text-gray-400">{index + 1}</span>}
                                </div>
                                <span className="font-medium text-gray-700 flex-1 truncate group-hover:text-primary transition-colors">
                                    {room.name}
                                </span>
                                <span className="text-sm font-bold text-gray-500">
                                    {room.count} <span className="text-xs font-normal">ครั้ง</span>
                                </span>
                            </div>
                            <div className="ml-8 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(index)}`}
                                    style={{ width: `${(room.count / maxCount) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {roomStats.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <FaTrophy className="text-2xl mb-2 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                        <span className="font-bold text-emerald-700">{roomStats[0]?.name}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">ห้องที่ถูกจองมากที่สุด</p>
                </div>
            )}
        </div>
    );
};

export default PopularRooms;
