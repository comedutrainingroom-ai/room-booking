const Booking = require('../models/Booking');
const Room = require('../models/Room');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
const getStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // Monthly bookings count
        const monthlyBookings = await Booking.countDocuments({
            startTime: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Today's bookings count
        const todayBookings = await Booking.countDocuments({
            startTime: { $gte: startOfDay, $lte: endOfDay }
        });

        // Status counts for this month
        const statusCounts = {
            approved: await Booking.countDocuments({
                status: 'approved',
                startTime: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            pending: await Booking.countDocuments({
                status: 'pending',
                startTime: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            rejected: await Booking.countDocuments({
                status: 'rejected',
                startTime: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            cancelled: await Booking.countDocuments({
                status: 'cancelled',
                startTime: { $gte: startOfMonth, $lte: endOfMonth }
            })
        };

        // Most used room this month
        const roomUsageThisMonth = await Booking.aggregate([
            {
                $match: {
                    startTime: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $in: ['approved', 'pending'] }
                }
            },
            {
                $group: {
                    _id: '$room',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        let mostUsedRoom = null;
        if (roomUsageThisMonth.length > 0) {
            const room = await Room.findById(roomUsageThisMonth[0]._id);
            mostUsedRoom = {
                name: room ? room.name : 'Unknown',
                count: roomUsageThisMonth[0].count
            };
        }

        res.status(200).json({
            success: true,
            data: {
                monthlyBookings,
                todayBookings,
                statusCounts,
                mostUsedRoom
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get monthly booking data for chart
// @route   GET /api/dashboard/monthly
// @access  Private (Admin)
const getMonthlyData = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        const monthlyData = await Booking.aggregate([
            {
                $match: {
                    startTime: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31, 23, 59, 59)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startTime' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in all months with 0 for missing data
        const result = monthNames.map((name, index) => {
            const found = monthlyData.find(d => d._id === index + 1);
            return {
                name,
                count: found ? found.count : 0
            };
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Monthly Data Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get room usage data for chart
// @route   GET /api/dashboard/room-usage
// @access  Private (Admin)
const getRoomUsage = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const roomUsage = await Booking.aggregate([
            {
                $match: {
                    startTime: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31, 23, 59, 59)
                    },
                    status: { $in: ['approved', 'pending'] }
                }
            },
            {
                $group: {
                    _id: '$room',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Populate room names
        const result = await Promise.all(
            roomUsage.map(async (item) => {
                const room = await Room.findById(item._id);
                return {
                    name: room ? room.name : 'Unknown',
                    count: item.count
                };
            })
        );

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Room Usage Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get yearly booking summary for chart
// @route   GET /api/dashboard/yearly
// @access  Private (Admin)
const getYearlyData = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

        const yearlyData = await Booking.aggregate([
            {
                $match: {
                    startTime: {
                        $gte: new Date(years[0], 0, 1),
                        $lte: new Date(currentYear, 11, 31, 23, 59, 59)
                    }
                }
            },
            {
                $group: {
                    _id: { $year: '$startTime' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in all years with 0 for missing data
        const result = years.map(year => {
            const found = yearlyData.find(d => d._id === year);
            return {
                name: year.toString(),
                count: found ? found.count : 0
            };
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Yearly Data Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Export dashboard data as JSON (for Excel export on frontend)
// @route   GET /api/dashboard/export
// @access  Private (Admin)
const exportData = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const bookings = await Booking.find({
            startTime: {
                $gte: new Date(year, 0, 1),
                $lte: new Date(year, 11, 31, 23, 59, 59)
            }
        }).populate('room').lean();

        const exportData = bookings.map(b => ({
            'หัวข้อ': b.topic,
            'ห้อง': b.room?.name || 'Unknown',
            'ผู้จอง': b.user?.name || 'Unknown',
            'อีเมล': b.user?.email || '',
            'เบอร์โทร': b.user?.phone || '',
            'หน่วยงาน': b.user?.department || '',
            'วันที่': new Date(b.startTime).toLocaleDateString('th-TH'),
            'เวลาเริ่ม': new Date(b.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            'เวลาสิ้นสุด': new Date(b.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            'สถานะ': b.status === 'approved' ? 'อนุมัติ' :
                b.status === 'pending' ? 'รออนุมัติ' :
                    b.status === 'rejected' ? 'ปฏิเสธ' : 'ยกเลิก',
            'สร้างเมื่อ': new Date(b.createdAt).toLocaleString('th-TH')
        }));

        res.status(200).json({ success: true, data: exportData });
    } catch (error) {
        console.error('Export Data Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getStats,
    getMonthlyData,
    getRoomUsage,
    getYearlyData,
    exportData
};
