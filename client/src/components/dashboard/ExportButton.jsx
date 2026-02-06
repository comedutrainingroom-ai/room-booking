import { useState, useRef, useEffect } from 'react';
import { FaFileExport, FaFileExcel, FaFilePdf, FaChevronDown } from 'react-icons/fa';
import { exportToExcel, exportToPDF } from '../../services/exportService';
import { useToast } from '../../contexts/ToastContext';

const ExportButton = ({ bookings }) => {
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(null);
    const dropdownRef = useRef(null);

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

    const handleExport = async (type) => {
        setExporting(type);
        try {
            if (type === 'excel') {
                exportToExcel(bookings, 'booking_report');
            } else if (type === 'pdf') {
                exportToPDF(bookings, 'booking_report');
            }
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
