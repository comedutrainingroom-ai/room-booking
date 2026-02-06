import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper: Format date in Thai
const formatDateThai = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const formatTimeThai = (date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Calculate Stats for Export
const calculateStats = (bookings) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const thisMonthBookings = bookings.filter(b => {
        const d = new Date(b.startTime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisYearBookings = bookings.filter(b => {
        return new Date(b.startTime).getFullYear() === currentYear;
    });

    const todayBookings = bookings.filter(b => {
        const start = new Date(b.startTime);
        return start >= today && start < tomorrow;
    });

    // Room popularity
    const roomCount = {};
    bookings.forEach(b => {
        if (b.room?.name) {
            roomCount[b.room.name] = (roomCount[b.room.name] || 0) + 1;
        }
    });
    const popularRooms = Object.entries(roomCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return {
        total: bookings.length,
        approved: bookings.filter(b => b.status === 'approved').length,
        pending: bookings.filter(b => b.status === 'pending').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        rejected: bookings.filter(b => b.status === 'rejected').length,
        today: todayBookings.length,
        thisMonth: thisMonthBookings.length,
        thisYear: thisYearBookings.length,
        popularRooms
    };
};

// Export to Excel using exceljs

export const exportToExcel = async (bookings, filename = 'booking_report') => {
    const stats = calculateStats(bookings);
    const today = new Date();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Room Booking System';
    workbook.created = today;

    // ==========================================
    // SHEET 1: Summary
    // ==========================================
    const summarySheet = workbook.addWorksheet('สรุปภาพรวม', {
        views: [{ showGridLines: false }]
    });

    // Title
    summarySheet.mergeCells('A1:B1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'รายงานสรุปการจองห้องประชุม';
    titleCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FF15803d' } }; // Green-700
    titleCell.alignment = { horizontal: 'center' };

    // Date
    summarySheet.getCell('A2').value = 'วันที่ออกรายงาน:';
    summarySheet.getCell('B2').value = formatDateThai(today);
    summarySheet.getCell('A2').font = { bold: true };

    // Stats Headers
    const addSectionHeader = (row, text) => {
        summarySheet.mergeCells(`A${row}:B${row}`);
        const cell = summarySheet.getCell(`A${row}`);
        cell.value = text;
        cell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16a34a' } }; // Green-600
        cell.alignment = { horizontal: 'left', indent: 1 };
    };

    const addStatRow = (row, label, value) => {
        summarySheet.getCell(`A${row}`).value = label;
        summarySheet.getCell(`B${row}`).value = value;
        summarySheet.getCell(`A${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
        summarySheet.getCell(`B${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
    };

    // Stats Data
    addSectionHeader(4, 'สถิติตามสถานะ');
    addStatRow(5, 'จำนวนการจองทั้งหมด', stats.total);
    addStatRow(6, 'อนุมัติแล้ว', stats.approved);
    addStatRow(7, 'รออนุมัติ', stats.pending);
    addStatRow(8, 'ยกเลิก', stats.cancelled);
    addStatRow(9, 'ปฏิเสธ', stats.rejected);

    addSectionHeader(11, 'สถิติตามช่วงเวลา');
    addStatRow(12, 'วันนี้', stats.today);
    addStatRow(13, 'เดือนนี้', stats.thisMonth);
    addStatRow(14, 'ปีนี้', stats.thisYear);

    addSectionHeader(16, 'ห้องยอดนิยม (Top 5)');
    stats.popularRooms.forEach((room, index) => {
        addStatRow(17 + index, `${index + 1}. ${room[0]}`, `${room[1]} ครั้ง`);
    });

    summarySheet.getColumn('A').width = 30;
    summarySheet.getColumn('B').width = 20;

    // ==========================================
    // SHEET 2: Details
    // ==========================================
    const detailSheet = workbook.addWorksheet('รายละเอียดการจอง');

    // Headers
    const headers = ['ลำดับ', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'แผนก', 'สถานะ'];
    const headerRow = detailSheet.addRow(headers);

    headerRow.eachCell((cell) => {
        cell.font = { name: 'Sarabun', bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803d' } }; // Green-700
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Data
    bookings.forEach((b, i) => {
        const row = detailSheet.addRow([
            i + 1,
            formatDateThai(b.startTime),
            `${formatTimeThai(b.startTime)} - ${formatTimeThai(b.endTime)}`,
            b.room?.name || '-',
            b.topic || '-',
            b.user?.name || '-',
            b.user?.department || '-',
            b.status === 'approved' ? 'อนุมัติ' : b.status === 'pending' ? 'รออนุมัติ' : b.status === 'cancelled' ? 'ยกเลิก' : 'ปฏิเสธ'
        ]);

        // Row Styling
        const statusColor =
            b.status === 'approved' ? 'FF166534' : // green-800
                b.status === 'pending' ? 'FF854d0e' :  // yellow-800
                    'FF991b1b';                            // red-800

        const statusBg =
            b.status === 'approved' ? 'FFdcfce7' : // green-100
                b.status === 'pending' ? 'FFfef9c3' :  // yellow-100
                    'FFfee2e2';                            // red-100

        row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
            cell.alignment = { vertical: 'middle' };

            // Center align Status, ID, Date
            if ([1, 2, 3, 8].includes(colNumber)) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }

            // Status Badge Style
            if (colNumber === 8) {
                cell.font = { color: { argb: statusColor }, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
            }
        });
    });

    // Auto Width
    detailSheet.columns = [
        { width: 8 },  // ID
        { width: 20 }, // Date
        { width: 18 }, // Time
        { width: 20 }, // Room
        { width: 30 }, // Topic
        { width: 20 }, // User
        { width: 15 }, // Dept
        { width: 15 }  // Status
    ];

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Save
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${today.toISOString().split('T')[0]}.xlsx`);
};

// Export to PDF
export const exportToPDF = (bookings, filename = 'booking_report') => {
    const stats = calculateStats(bookings);
    const today = new Date();

    const doc = new jsPDF('p', 'mm', 'a4');

    // Title
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74); // Green
    doc.text('Booking Summary Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${formatDateThai(today)}`, 105, 28, { align: 'center' });

    // Stats Box
    let yPos = 40;
    doc.setFillColor(240, 253, 244); // Light green
    doc.roundedRect(14, yPos - 5, 182, 35, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Overview Statistics', 20, yPos + 3);

    doc.setFontSize(10);
    doc.setTextColor(60);
    const statsText = [
        `Total: ${stats.total}`,
        `Approved: ${stats.approved}`,
        `Pending: ${stats.pending}`,
        `Cancelled: ${stats.cancelled}`,
        `Rejected: ${stats.rejected}`
    ];
    statsText.forEach((text, i) => {
        doc.text(text, 20 + (i * 36), yPos + 15);
    });

    // Period Stats
    yPos += 20;
    doc.text(`Today: ${stats.today} | This Month: ${stats.thisMonth} | This Year: ${stats.thisYear}`, 20, yPos + 8);

    // Popular Rooms
    yPos += 25;
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Popular Rooms (Top 5)', 20, yPos);

    yPos += 5;
    stats.popularRooms.forEach(([name, count], i) => {
        doc.setFontSize(9);
        doc.setTextColor(70);
        doc.text(`${i + 1}. ${name} - ${count} bookings`, 25, yPos + (i * 6));
    });

    // Bookings Table
    yPos += (stats.popularRooms.length * 6) + 15;
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Booking Details', 20, yPos);

    const tableData = bookings.slice(0, 30).map((b, i) => [
        i + 1,
        formatDateThai(b.startTime),
        `${formatTimeThai(b.startTime)}-${formatTimeThai(b.endTime)}`,
        b.room?.name || '-',
        (b.topic || '-').substring(0, 20),
        b.user?.name || '-',
        b.status === 'approved' ? 'Approved' : b.status === 'pending' ? 'Pending' : b.status === 'cancelled' ? 'Cancelled' : 'Rejected'
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['#', 'Date', 'Time', 'Room', 'Topic', 'User', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [22, 163, 74],
            textColor: 255,
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 7,
            textColor: 50
        },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 25 },
            2: { cellWidth: 22 },
            3: { cellWidth: 25 },
            4: { cellWidth: 35 },
            5: { cellWidth: 25 },
            6: { cellWidth: 18 }
        },
        margin: { left: 14, right: 14 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    // Save
    doc.save(`${filename}_${today.toISOString().split('T')[0]}.pdf`);
};
