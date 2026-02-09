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

// Export to Excel using exceljs
export const exportToExcel = async (bookings, filename = 'booking_report', reportTitle = 'รายงานสรุปการจองห้องประชุม', scope = 'all') => {
    const today = new Date();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Room Booking System';
    workbook.created = today;

    // Helper: Add Title
    const addTitle = (sheet, title, subTitle, colorHex) => {
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { name: 'Sarabun', size: 18, bold: true, color: { argb: `FF${colorHex}` } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.mergeCells('A2:H2');
        const dateCell = sheet.getCell('A2');
        dateCell.value = subTitle || `Generated: ${formatDateThai(today)}`;
        dateCell.font = { name: 'Sarabun', size: 10, italic: true, color: { argb: 'FF666666' } };
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

        sheet.getRow(1).height = 30;
        sheet.getRow(2).height = 20;
    };

    // Helper: Add Table Headers
    const addHeaders = (sheet, headers, startRow, colorHex) => {
        const headerRow = sheet.getRow(startRow);
        headerRow.values = headers;
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Sarabun', bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colorHex}` } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        headerRow.height = 24;
    };

    // Helper: Add Data Rows
    const addDataRows = (sheet, filteredBookings, startRow) => {
        filteredBookings.forEach((b, i) => {
            const row = sheet.getRow(startRow + i);
            row.values = [
                i + 1,
                formatDateThai(b.startTime),
                `${formatTimeThai(b.startTime)} - ${formatTimeThai(b.endTime)}`,
                b.room?.name || '-',
                b.topic || '-',
                b.user?.name || '-',
                b.user?.department || '-',
                b.status === 'approved' ? 'อนุมัติ' : b.status === 'pending' ? 'รออนุมัติ' : b.status === 'cancelled' ? 'ยกเลิก' : 'ปฏิเสธ'
            ];

            // Styling
            const statusColor = b.status === 'approved' ? 'FF166534' : b.status === 'pending' ? 'FF854d0e' : 'FF991b1b';
            const statusBg = b.status === 'approved' ? 'FFdcfce7' : b.status === 'pending' ? 'FFfef9c3' : 'FFfee2e2';

            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Sarabun', size: 10 };
                cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };

                if ([1, 2, 3, 8].includes(colNumber)) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }

                if (colNumber === 8) {
                    cell.font = { color: { argb: statusColor }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
                }
            });
            row.height = 20;
        });
    };

    // 🟢 DAY REPORT (Green Theme)
    if (scope === 'day') {
        const sheet = workbook.addWorksheet('Daily Report', { views: [{ showGridLines: false }] });
        addTitle(sheet, reportTitle, `ข้อมูลสำหรับวันที่: ${formatDateThai(bookings[0]?.startTime || today)}`, '16a34a'); // Green

        // Summary Box
        sheet.mergeCells('A4:C6');
        const summaryBox = sheet.getCell('A4');
        summaryBox.value = `จำนวนการจองทั้งหมด: ${bookings.length} รายการ`;
        summaryBox.font = { size: 12, bold: true, color: { argb: 'FF166534' } };
        summaryBox.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
        summaryBox.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryBox.border = { top: { style: 'medium', color: { argb: 'FF16a34a' } }, left: { style: 'medium', color: { argb: 'FF16a34a' } }, bottom: { style: 'medium', color: { argb: 'FF16a34a' } }, right: { style: 'medium', color: { argb: 'FF16a34a' } } };

        addHeaders(sheet, ['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'แผนก', 'สถานะ'], 8, '16a34a');
        addDataRows(sheet, bookings, 9);

        // Auto Width
        sheet.columns = [
            { width: 8 }, { width: 20 }, { width: 18 }, { width: 20 },
            { width: 35 }, { width: 25 }, { width: 15 }, { width: 15 }
        ];
    }

    // 🔵 MONTH REPORT (Blue Theme)
    else if (scope === 'month') {
        const sheet = workbook.addWorksheet('Monthly Report', { views: [{ showGridLines: false }] });
        const monthDate = bookings[0]?.startTime || today;
        const monthName = new Date(monthDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

        addTitle(sheet, reportTitle, `ประจำเดือน: ${monthName}`, '2563EB'); // Blue

        // Stats Row
        const stats = calculateStats(bookings);
        const addStatBox = (col, label, value, color) => {
            sheet.getCell(`${col}4`).value = label;
            sheet.getCell(`${col}4`).font = { bold: true, color: { argb: 'FF666666' } };
            sheet.getCell(`${col}4`).alignment = { horizontal: 'center' };

            sheet.getCell(`${col}5`).value = value;
            sheet.getCell(`${col}5`).font = { size: 14, bold: true, color: { argb: `FF${color}` } };
            sheet.getCell(`${col}5`).alignment = { horizontal: 'center' };

            sheet.getCell(`${col}5`).border = { bottom: { style: 'thick', color: { argb: `FF${color}` } } };
        };

        addStatBox('A', 'ทั้งหมด', stats.total, '2563EB'); // Blue
        addStatBox('C', 'อนุมัติ', stats.approved, '16a34a'); // Green
        addStatBox('E', 'รออนุมัติ', stats.pending, 'ca8a04'); // Yellow
        addStatBox('G', 'ยกเลิก/ปฏิเสธ', stats.cancelled + stats.rejected, 'dc2626'); // Red

        addHeaders(sheet, ['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'แผนก', 'สถานะ'], 7, '2563EB');
        addDataRows(sheet, bookings, 8);

        // Auto Width
        sheet.columns = [
            { width: 8 }, { width: 20 }, { width: 18 }, { width: 15 },
            { width: 35 }, { width: 20 }, { width: 15 }, { width: 15 }
        ];
    }

    // 🟡 YEAR REPORT (Gold/Purple Theme)
    else if (scope === 'year') {
        // Sheet 1: Overview
        const sheet1 = workbook.addWorksheet('Overview', { views: [{ showGridLines: false }] });
        const yearNum = new Date(bookings[0]?.startTime || today).getFullYear() + 543;
        addTitle(sheet1, reportTitle, `สถิติประจำปี พ.ศ. ${yearNum}`, '7E22CE'); // Purple

        // Monthly Breakdown Table
        sheet1.getCell('A4').value = 'สถิติรายเดือน';
        sheet1.getCell('A4').font = { size: 12, bold: true, color: { argb: 'FF7E22CE' } };

        const months = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];

        // Header
        sheet1.getRow(5).values = ['เดือน', 'ทั้งหมด', 'อนุมัติ', 'รออนุมัติ', 'ยกเลิก', 'ปฏิเสธ'];
        sheet1.getRow(5).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Calculate Monthly Stats
        months.forEach((m, idx) => {
            const monthlyBookings = bookings.filter(b => new Date(b.startTime).getMonth() === idx);
            const row = sheet1.getRow(6 + idx);
            row.values = [
                m,
                monthlyBookings.length,
                monthlyBookings.filter(b => b.status === 'approved').length,
                monthlyBookings.filter(b => b.status === 'pending').length,
                monthlyBookings.filter(b => b.status === 'cancelled').length,
                monthlyBookings.filter(b => b.status === 'rejected').length
            ];
            row.eachCell(cell => {
                cell.alignment = { horizontal: 'center' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
            });
            if (monthlyBookings.length > 0) {
                row.getCell(1).font = { bold: true }; // Highlight months with data
            }
        });

        sheet1.columns = [{ width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];

        // Top Rooms
        sheet1.getCell('H4').value = 'ห้องยอดนิยม 5 อันดับแรก';
        sheet1.getCell('H4').font = { size: 12, bold: true, color: { argb: 'FFCA8A04' } }; // Gold

        const stats = calculateStats(bookings);
        stats.popularRooms.forEach((r, i) => {
            sheet1.getCell(`H${5 + i}`).value = `${i + 1}. ${r[0]}`;
            sheet1.getCell(`I${5 + i}`).value = r[1];
            sheet1.getCell(`I${5 + i}`).alignment = { horizontal: 'center' };
        });


        // Sheet 2: All Data
        const sheet2 = workbook.addWorksheet('All Data');
        addTitle(sheet2, `รายการจองทั้งหมด ปี ${yearNum}`, '', 'CA8A04'); // Gold Header
        addHeaders(sheet2, ['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'แผนก', 'สถานะ'], 4, 'CA8A04');
        addDataRows(sheet2, bookings, 5);

        sheet2.columns = [
            { width: 8 }, { width: 20 }, { width: 18 }, { width: 15 },
            { width: 35 }, { width: 20 }, { width: 15 }, { width: 15 }
        ];
    }

    // Default: ALL (Original Style)
    else {
        const sheet = workbook.addWorksheet('All Bookings');
        addTitle(sheet, reportTitle, 'ข้อมูลการจองทั้งหมดในระบบ', '15803d');
        addHeaders(sheet, ['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'แผนก', 'สถานะ'], 4, '15803d');
        addDataRows(sheet, bookings, 5);
        sheet.columns = [
            { width: 8 }, { width: 20 }, { width: 18 }, { width: 20 },
            { width: 35 }, { width: 25 }, { width: 15 }, { width: 15 }
        ];
    }

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${today.toISOString().split('T')[0]}.xlsx`);
};

// Helper: Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper: Load Fonts
const loadFonts = async (doc) => {
    try {
        const regularFont = await fetch('/fonts/Sarabun-Regular.ttf').then(res => res.arrayBuffer());
        const boldFont = await fetch('/fonts/Sarabun-Bold.ttf').then(res => res.arrayBuffer());

        const regularBase64 = arrayBufferToBase64(regularFont);
        const boldBase64 = arrayBufferToBase64(boldFont);

        doc.addFileToVFS('Sarabun-Regular.ttf', regularBase64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');

        doc.addFileToVFS('Sarabun-Bold.ttf', boldBase64);
        doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');

        doc.setFont('Sarabun');
        return true;
    } catch (error) {
        console.error('Error loading fonts:', error);
        return false;
    }
};

// Export to PDF
export const exportToPDF = async (bookings, filename = 'booking_report', reportTitle = 'Booking Summary Report', scope = 'all') => {
    const stats = calculateStats(bookings);
    const today = new Date();
    const doc = new jsPDF('p', 'mm', 'a4');

    // Load Thai Fonts
    await loadFonts(doc);

    const setupHeader = (title, subTitle, colorRGB) => {
        doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.rect(0, 0, 210, 30, 'F');

        doc.setFont('Sarabun', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 105, 18, { align: 'center' });

        doc.setFont('Sarabun', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(240, 240, 240);
        doc.text(subTitle || `Generated: ${formatDateThai(today)}`, 105, 26, { align: 'center' });
    };

    // 🟢 DAY REPORT (Green Theme)
    if (scope === 'day') {
        setupHeader(reportTitle, `ข้อมูลสำหรับวันที่: ${formatDateThai(bookings[0]?.startTime || today)}`, [22, 163, 74]); // Green-600

        // Summary Box
        doc.setFillColor(240, 253, 244); // Green-50
        doc.setDrawColor(22, 163, 74); // Green-600
        doc.roundedRect(14, 40, 182, 18, 2, 2, 'FD');

        doc.setFont('Sarabun', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(22, 101, 52); // Green-800
        doc.text(`จำนวนการจองทั้งหมด: ${bookings.length} รายการ`, 105, 51, { align: 'center' });

        // Table
        const tableData = bookings.map((b, i) => [
            i + 1,
            formatDateThai(b.startTime),
            `${formatTimeThai(b.startTime)}-${formatTimeThai(b.endTime)}`,
            b.room?.name || '-',
            (b.topic || '-').substring(0, 30),
            b.user?.name || '-',
            b.status === 'approved' ? 'อนุมัติ' : b.status === 'pending' ? 'รออนุมัติ' : b.status === 'cancelled' ? 'ยกเลิก' : 'ปฏิเสธ'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'สถานะ']],
            body: tableData,
            theme: 'grid',
            styles: { font: 'Sarabun', fontSize: 9 },
            headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 }, 6: { cellWidth: 20 } },
            margin: { left: 14, right: 14 }
        });
    }

    // 🔵 MONTH REPORT (Blue Theme)
    else if (scope === 'month') {
        const monthDate = bookings[0]?.startTime || today;
        const monthName = new Date(monthDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        setupHeader(reportTitle, `ประจำเดือน: ${monthName}`, [37, 99, 235]); // Blue-600

        // Stats Boxes
        const yStats = 45;
        const boxWidth = 40;
        const gap = 6;
        const startX = 14 + (182 - (4 * boxWidth + 3 * gap)) / 2;

        const drawStatBox = (x, label, value, color) => {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(color[0], color[1], color[2]);
            doc.roundedRect(x, yStats, boxWidth, 20, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(label, x + boxWidth / 2, yStats + 6, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('Sarabun', 'bold');
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(String(value), x + boxWidth / 2, yStats + 15, { align: 'center' });
        };

        drawStatBox(startX, 'ทั้งหมด', stats.total, [37, 99, 235]);
        drawStatBox(startX + boxWidth + gap, 'อนุมัติ', stats.approved, [22, 163, 74]);
        drawStatBox(startX + 2 * (boxWidth + gap), 'รออนุมัติ', stats.pending, [202, 138, 4]);
        drawStatBox(startX + 3 * (boxWidth + gap), 'ยกเลิก/ปฏิเสธ', stats.cancelled + stats.rejected, [220, 38, 38]);

        // Table
        const tableData = bookings.map((b, i) => [
            i + 1,
            formatDateThai(b.startTime),
            `${formatTimeThai(b.startTime)}`,
            b.room?.name || '-',
            (b.topic || '-').substring(0, 25),
            b.user?.name || '-',
            b.status === 'approved' ? 'อนุมัติ' : b.status === 'pending' ? 'รออนุมัติ' : 'ยกเลิก'
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'สถานะ']],
            body: tableData,
            theme: 'striped',
            styles: { font: 'Sarabun', fontSize: 9 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            margin: { left: 14, right: 14 }
        });
    }

    // 🟡 YEAR REPORT (Purple/Gold Theme)
    else if (scope === 'year') {
        const yearNum = new Date(bookings[0]?.startTime || today).getFullYear() + 543;
        setupHeader(reportTitle, `สถิติประจำปี พ.ศ. ${yearNum}`, [126, 34, 206]); // Purple-700

        // Monthly Stats Table
        const months = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const monthlyData = months.map((m, idx) => {
            const count = bookings.filter(b => new Date(b.startTime).getMonth() === idx).length;
            return [m, count];
        });

        doc.setFontSize(12);
        doc.setTextColor(80);
        doc.text('สถิติรายเดือน', 14, 40);

        // Split monthly data into 2 columns
        const col1 = monthlyData.slice(0, 6);
        const col2 = monthlyData.slice(6, 12);

        autoTable(doc, {
            startY: 45,
            head: [['เดือน', 'จำนวน', 'เดือน', 'จำนวน']],
            body: col1.map((d, i) => [...d, ...col2[i]]),
            theme: 'grid',
            styles: { font: 'Sarabun', fontSize: 9 },
            headStyles: { fillColor: [126, 34, 206], textColor: 255 },
            margin: { left: 14, right: 100 } // Left Side
        });

        // Top Rooms (Right Side)
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text('ห้องยอดนิยม', 120, 40);

        const roomData = stats.popularRooms.map((r, i) => [`${i + 1}. ${r[0]}`, r[1]]);
        autoTable(doc, {
            startY: 45,
            head: [['ห้อง', 'จำนวนครั้ง']],
            body: roomData,
            theme: 'grid',
            styles: { font: 'Sarabun', fontSize: 9 },
            headStyles: { fillColor: [202, 138, 4], textColor: 255 }, // Gold
            margin: { left: 120, right: 14 }
        });


        // All Bookings Table
        doc.text('รายการจองทั้งหมด', 14, finalY + 10);
        const tableData = bookings.slice(0, 50).map((b, i) => [ // Limit to 50 rows for performance/space
            i + 1,
            formatDateThai(b.startTime),
            b.room?.name || '-',
            (b.topic || '-').substring(0, 20),
            b.user?.name || '-',
            b.status === 'approved' ? 'อนุมัติ' : 'รอ'
        ]);

        autoTable(doc, {
            startY: finalY + 15,
            head: [['#', 'วันที่', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'สถานะ']],
            body: tableData,
            theme: 'striped',
            styles: { font: 'Sarabun', fontSize: 8 },
            headStyles: { fillColor: [126, 34, 206] },
            margin: { left: 14, right: 14 }
        });
    }

    // Default
    else {
        setupHeader(reportTitle, `ข้อมูลทั้งหมด`, [22, 163, 74]);
        const tableData = bookings.map((b, i) => [
            i + 1,
            formatDateThai(b.startTime),
            `${formatTimeThai(b.startTime)}`,
            b.room?.name || '-',
            b.topic || '-',
            b.status
        ]);
        autoTable(doc, {
            startY: 40,
            head: [['#', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'สถานะ']],
            body: tableData,
            styles: { font: 'Sarabun' },
            headStyles: { fillColor: [22, 163, 74] }
        });
    }

    // Save
    doc.save(`${filename}_${today.toISOString().split('T')[0]}.pdf`);
};
