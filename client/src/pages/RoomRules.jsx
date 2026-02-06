import { useSettings } from '../contexts/SettingsContext';
import { FaBook, FaClock, FaCalendarAlt, FaCalendarWeek, FaHourglass, FaInfoCircle } from 'react-icons/fa';

const RoomRules = () => {
    const { settings, loading } = useSettings();

    if (loading) {
        return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
    }

    const rules = [
        {
            icon: <FaClock className="text-blue-500" />,
            title: 'เวลาทำการ',
            description: `เปิดให้จอง ${settings.openTime || '08:00'} - ${settings.closeTime || '20:00'} น.`,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        {
            icon: <FaHourglass className="text-purple-500" />,
            title: 'ระยะเวลาการจองสูงสุด',
            description: `สามารถจองได้สูงสุด ${settings.maxBookingHours || 4} ชั่วโมงต่อครั้ง`,
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200'
        },
        {
            icon: <FaCalendarAlt className="text-green-500" />,
            title: 'การจองล่วงหน้า',
            description: `สามารถจองล่วงหน้าได้ไม่เกิน ${settings.maxBookingDays || 30} วัน`,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        {
            icon: <FaCalendarWeek className="text-orange-500" />,
            title: 'วันเสาร์-อาทิตย์',
            description: settings.weekendBooking ? '✅ อนุญาตให้จองในวันเสาร์-อาทิตย์' : '❌ ไม่อนุญาตให้จองในวันเสาร์-อาทิตย์',
            bgColor: settings.weekendBooking ? 'bg-green-50' : 'bg-red-50',
            borderColor: settings.weekendBooking ? 'border-green-200' : 'border-red-200'
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary text-3xl mb-4">
                    <FaBook />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">กฎระเบียบการใช้ห้อง</h1>
                <p className="text-gray-500">ข้อควรปฏิบัติในการจองและใช้งานห้องประชุม</p>
            </div>

            {/* Rules Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {rules.map((rule, index) => (
                    <div
                        key={index}
                        className={`${rule.bgColor} ${rule.borderColor} border rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-lg`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm text-2xl">
                                {rule.icon}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg mb-1">{rule.title}</h3>
                                <p className="text-gray-600">{rule.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary text-xl">
                        <FaInfoCircle />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-3">ข้อปฏิบัติทั่วไป</h3>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                กรุณามาถึงก่อนเวลาจองอย่างน้อย 5 นาที
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                ดูแลความสะอาดเรียบร้อยของห้องหลังใช้งาน
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                ปิดไฟ แอร์ และอุปกรณ์ต่างๆ ก่อนออกจากห้อง
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                หากไม่สามารถมาใช้งานได้ กรุณาแจ้งยกเลิกล่วงหน้า
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                หากพบปัญหาอุปกรณ์ชำรุด กรุณาแจ้งผ่านระบบ "แจ้งปัญหา"
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            {settings.contactEmail && (
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>หากมีข้อสงสัย ติดต่อ: <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">{settings.contactEmail}</a></p>
                </div>
            )}
        </div>
    );
};

export default RoomRules;
