import { useState, useRef, useEffect } from 'react';
import { FaFileExport, FaFileExcel, FaFilePdf, FaChevronDown, FaCalendarDay, FaCalendarAlt, FaCalendar } from 'react-icons/fa';
import { exportToExcel, exportToPDF } from '../../services/exportService';
import { useToast } from '../../contexts/ToastContext';

const ExportButton = ({ bookings }) => {
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(null);
    const dropdownRef = useRef(null);

    // Filter Stats
    const [scope, setScope] = useState('all'); // all, day, month, year
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getFilteredBookings = () => {
        return bookings.filter(b => {
            const date = new Date(b.startTime);
            if (scope === 'day') {
                return date.toISOString().split('T')[0] === selectedDate;
            } else if (scope === 'month') {
                return date.toISOString().slice(0, 7) === selectedMonth;
            } else if (scope === 'year') {
                return date.getFullYear().toString() === selectedYear;
            }
            return true;
        });
    };

    const getReportTitle = () => {
        if (scope === 'day') {
            const date = new Date(selectedDate);
            return `รายงานการจองประจำวันที่ ${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        } else if (scope === 'month') {
            const [y, m] = selectedMonth.split('-');
            const date = new Date(y, m - 1);
            return `รายงานการจองประจำเดือน ${date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
        } else if (scope === 'year') {
            return `รายงานการจองประจำปี ${parseInt(selectedYear) + 543}`;
        }
        return 'รายงานสรุปการจองห้องประชุม (ทั้งหมด)';
    };

    const handleExport = async (type) => {
        const filtered = getFilteredBookings();
        if (filtered.length === 0) {
            toast.warning('ไม่พบข้อมูลในช่วงเวลาที่เลือก');
            return;
        }

        setExporting(type);
        const title = getReportTitle();
        const filename = `booking_report_${scope}`;

        try {
            if (type === 'excel') {
                await exportToExcel(filtered, filename, title, scope);
            } else if (type === 'pdf') {
                await exportToPDF(filtered, filename, title, scope);
            }
            toast.success('Export เรียบร้อยแล้ว');
            setTimeout(() => {
                setExporting(null);
                setIsOpen(false);
            }, 500);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('เกิดข้อผิดพลาดในการ Export');
            setExporting(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
            >
                <FaFileExport className="text-gray-500" />
                <span>Export</span>
                <FaChevronDown className={`text-xs text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">ช่วงเวลาของรายงาน</h3>

                        {/* Scope Selector */}
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            {[
                                { id: 'day', label: 'วัน', icon: FaCalendarDay },
                                { id: 'month', label: 'เดือน', icon: FaCalendarAlt },
                                { id: 'year', label: 'ปี', icon: FaCalendar },
                                { id: 'all', label: 'ทั้งหมด', icon: FaFileExport },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setScope(item.id)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${scope === item.id
                                        ? 'bg-white text-green-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <item.icon className="text-[10px]" /> {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Date Inputs */}
                        <div className="space-y-2">
                            {scope === 'day' && (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            )}
                            {scope === 'month' && (
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                />
                            )}
                            {scope === 'year' && (
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                        <option key={y} value={y}>{y + 543}</option>
                                    ))}
                                </select>
                            )}
                            {scope === 'all' && (
                                <p className="text-xs text-center text-gray-500 py-2">ข้อมูลทั้งหมดในระบบ</p>
                            )}
                        </div>
                    </div>

                    <div className="p-2">
                        <button
                            onClick={() => handleExport('excel')}
                            disabled={exporting}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 transition-colors group"
                        >
                            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
                                <FaFileExcel />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-gray-800">Excel</div>
                                <div className="text-xs text-gray-400">.xlsx format</div>
                            </div>
                            {exporting === 'excel' && (
                                <div className="ml-auto w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            )}
                        </button>

                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={exporting}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors group"
                        >
                            <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                                <FaFilePdf />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-gray-800">PDF</div>
                                <div className="text-xs text-gray-400">.pdf format</div>
                            </div>
                            {exporting === 'pdf' && (
                                <div className="ml-auto w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
