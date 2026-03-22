import { useSettings } from '../contexts/SettingsContext';
import { FaBook, FaClock, FaCalendarAlt, FaCalendarWeek, FaHourglass, FaInfoCircle } from 'react-icons/fa';

const RoomRules = () => {
    const { settings, loading } = useSettings();

    if (loading) {
        return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
    }

    const rules = [
        {
            icon: <FaClock />,
            title: 'เวลาทำการ',
            value: `${settings.openTime || '08:00'} - ${settings.closeTime || '20:00'} น.`,
        },
        {
            icon: <FaHourglass />,
            title: 'จองสูงสุดต่อครั้ง',
            value: `${settings.maxBookingHours || 4} ชั่วโมง`,
        },
        {
            icon: <FaCalendarAlt />,
            title: 'จองล่วงหน้าได้',
            value: `ไม่เกิน ${settings.maxBookingDays || 30} วัน`,
        },
        {
            icon: <FaCalendarWeek />,
            title: 'วันเสาร์-อาทิตย์',
            value: settings.weekendBooking ? 'อนุญาต' : 'ไม่อนุญาต',
        }
    ];

    const practices = [
        'กรุณามาถึงก่อนเวลาจองอย่างน้อย 5 นาที',
        'ดูแลความสะอาดเรียบร้อยของห้องหลังใช้งาน',
        'ปิดไฟ แอร์ และอุปกรณ์ต่างๆ ก่อนออกจากห้อง',
        'หากไม่สามารถมาใช้งานได้ กรุณาแจ้งยกเลิกล่วงหน้า',
        'หากพบปัญหาอุปกรณ์ชำรุด กรุณาแจ้งผ่านระบบ "แจ้งปัญหา"',
    ];

    return (
        <div className="w-full h-full px-0 sm:px-4 py-6 sm:py-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-1">
                    <FaBook className="text-emerald-600 text-lg md:text-xl" />
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">กฎระเบียบการใช้ห้อง</h1>
                </div>
                <p className="text-gray-400 text-sm md:text-base ml-8 md:ml-9">ข้อควรปฏิบัติในการจองและใช้งานห้องประชุม</p>
            </div>

            {/* Rules — clean table-like layout */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8 md:mb-12">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">เงื่อนไขการจอง</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors">
                            <div className="text-gray-400 text-sm md:text-base">
                                {rule.icon}
                            </div>
                            <div className="flex-1 text-sm md:text-base text-gray-600">{rule.title}</div>
                            <div className="text-sm md:text-base font-semibold text-gray-900">{rule.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Practices */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">ข้อปฏิบัติทั่วไป</h2>
                </div>
                <div className="px-4 md:px-6 py-4 md:py-5">
                    <ol className="space-y-2.5 md:space-y-3">
                        {practices.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm md:text-base text-gray-600">
                                <span className="text-xs font-bold text-gray-300 mt-0.5 w-5 shrink-0 text-right">{index + 1}.</span>
                                {item}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            {/* Contact Info */}
            {settings.contactEmail && (
                <div className="mt-6 md:mt-10 text-center text-gray-400 text-xs md:text-sm">
                    <p>หากมีข้อสงสัย ติดต่อ: <a href={`mailto:${settings.contactEmail}`} className="text-gray-600 hover:text-gray-900 underline underline-offset-2">{settings.contactEmail}</a></p>
                </div>
            )}
        </div>
    );
};

export default RoomRules;
