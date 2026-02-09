import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { FaClock, FaBuilding } from 'react-icons/fa';

// Import Dashboard Components
import DailyStats from '../components/dashboard/DailyStats';
import MonthlyStats from '../components/dashboard/MonthlyStats';
import YearlyStats from '../components/dashboard/YearlyStats';
import PopularRooms from '../components/dashboard/PopularRooms';
import ExportButton from '../components/dashboard/ExportButton';

const Dashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/bookings');
            if (res.data.success) {
                // Filter out imported bookings from Dashboard stats
                const userBookings = res.data.data.filter(b => !b.isImported);
                setBookings(userBookings);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    // Get Recent Bookings for the "Recent Activity" section
    const recentBookings = [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    return (
        <div className="w-full h-full px-4 py-8 space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500 mt-1">ภาพรวมสถิติการจองห้องประชุม</p>
                </div>
                <div className="flex gap-3">
                    <ExportButton bookings={bookings} />
                </div>
            </div>

            {/* Time Period Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DailyStats bookings={bookings} />
                <MonthlyStats bookings={bookings} />
                <YearlyStats bookings={bookings} />
            </div>

            {/* Bottom Grid: Popular Rooms & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Popular Rooms Component */}
                <div className="lg:col-span-2">
                    <PopularRooms bookings={bookings} />
                </div>

                {/* Recent Activity (kept inline as it's simple) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                            <FaClock />
                        </div>
                        <h3 className="font-bold text-gray-800">มาใหม่ล่าสุด</h3>
                    </div>

                    <div className="space-y-4">
                        {recentBookings.length > 0 ? (
                            recentBookings.map((booking) => (
                                <div key={booking._id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${booking.status === 'pending' ? 'bg-orange-400' :
                                        booking.status === 'approved' ? 'bg-green-500' :
                                            booking.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
                                        }`}></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{booking.topic}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{booking.user?.name || 'ไม่ทราบชื่อ'}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <FaBuilding size={10} /> {booking.room?.name || 'Unknown Room'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(booking.createdAt).toLocaleDateString('th-TH', {
                                                day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 py-10">ไม่มีรายการล่าสุด</p>
                        )}

                        <Link to="/history" className="block mt-6 text-center text-sm text-green-600 hover:text-green-700 font-medium hover:underline">
                            ดูประวัติทั้งหมด
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
