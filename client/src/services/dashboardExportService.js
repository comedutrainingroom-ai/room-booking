import { getBookingStatusLabel } from '../utils/bookingStatus';

const CARD_THEMES = {
    total: { fill: 'EFF6FF', border: 'BFDBFE', text: '1D4ED8', accent: '#0EA5E9' },
    approved: { fill: 'ECFDF5', border: 'A7F3D0', text: '047857', accent: '#10B981' },
    pending: { fill: 'FFFBEB', border: 'FDE68A', text: 'B45309', accent: '#F59E0B' },
    rejected: { fill: 'FFF1F2', border: 'FDA4AF', text: 'BE123C', accent: '#FB7185' }
};

const CHART_SERIES = [
    { key: 'approved', label: 'อนุมัติ', color: '#10B981' },
    { key: 'pending', label: 'รอตรวจสอบ', color: '#F59E0B' },
    { key: 'rejected', label: 'ปฏิเสธ / ยกเลิก', color: '#FB7185' }
];

const STATUS_SHEET_LAYOUT = {
    imageTopRow: 3,
    imageWidth: 720,
    imageHeight: 360,
    tableStartRow: 27
};

const ROOM_SHARE_SHEET_LAYOUT = {
    imageTopRow: 3,
    imageWidth: 560,
    imageHeight: 292,
    noteStartRow: 20,
    noteEndRow: 21,
    tableStartRow: 24
};

const formatNumber = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

const formatShortDate = (value) => new Date(value).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const formatDateTime = (value) => new Date(value).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

const formatTime = (value) => new Date(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
});

const formatTimeRange = (startTime, endTime) => `${formatTime(startTime)} - ${formatTime(endTime)}`;

const getRoomName = (booking) => booking?.room?.name || 'ไม่ระบุห้อง';
const getUserName = (booking) => booking?.user?.name || 'ไม่ทราบชื่อ';
const getBookingCode = (booking) => `BK-${String(booking?._id || '').slice(-6).toUpperCase() || '------'}`;
const getStatusThemeKey = (booking) => (booking?.status === 'approved'
    ? 'approved'
    : booking?.status === 'pending'
        ? 'pending'
        : 'rejected');

const normalizeBookingRows = (bookings = []) => bookings.map((booking, index) => ({
    index: index + 1,
    code: getBookingCode(booking),
    topic: booking?.topic || '-',
    room: getRoomName(booking),
    user: getUserName(booking),
    email: booking?.user?.email || '-',
    department: booking?.user?.department || '-',
    date: formatShortDate(booking?.startTime),
    time: formatTimeRange(booking?.startTime, booking?.endTime),
    status: getBookingStatusLabel(booking),
    statusThemeKey: getStatusThemeKey(booking),
    createdAt: booking?.createdAt ? formatDateTime(booking.createdAt) : '-'
}));

const argb = (hex) => `FF${hex.replace('#', '')}`;
const EXCEL_FONT_FAMILY = 'Leelawadee UI';
const CANVAS_FONT_FAMILY = '"Leelawadee UI", "Sarabun Export", "Noto Sans Thai", Tahoma, sans-serif';
let exportCanvasFontsPromise = null;

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);

    for (let index = 0; index < bytes.byteLength; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return window.btoa(binary);
};

const loadFonts = async (doc) => {
    try {
        const [regularFont, boldFont] = await Promise.all([
            fetch('/fonts/Sarabun-Regular.ttf').then((response) => response.arrayBuffer()),
            fetch('/fonts/Sarabun-Bold.ttf').then((response) => response.arrayBuffer())
        ]);

        doc.addFileToVFS('Sarabun-Regular.ttf', arrayBufferToBase64(regularFont));
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.addFileToVFS('Sarabun-Bold.ttf', arrayBufferToBase64(boldFont));
        doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
        doc.setFont('Sarabun', 'normal');
        doc.setLineHeightFactor(1.35);
    } catch (error) {
        console.error('Failed to load Thai fonts for export:', error);
    }
};

const ensureCanvasFontsLoaded = async () => {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) {
        return;
    }

    if (!exportCanvasFontsPromise) {
        exportCanvasFontsPromise = Promise.all([
            new FontFace('Sarabun Export', 'url(/fonts/Sarabun-Regular.ttf)', {
                weight: '400',
                style: 'normal'
            }).load(),
            new FontFace('Sarabun Export', 'url(/fonts/Sarabun-Bold.ttf)', {
                weight: '700',
                style: 'normal'
            }).load()
        ])
            .then(async (faces) => {
                faces.forEach((face) => document.fonts.add(face));
                await Promise.all([
                    document.fonts.load(`400 16px ${CANVAS_FONT_FAMILY}`),
                    document.fonts.load(`700 16px ${CANVAS_FONT_FAMILY}`)
                ]);
            })
            .catch((error) => {
                console.error('Failed to load canvas Thai fonts for export:', error);
            });
    }

    await exportCanvasFontsPromise;
};

const loadBrandAssets = async () => ({ seal: null, banner: null });

const hexToRgb = (hex) => {
    const normalized = hex.replace('#', '');
    return [
        parseInt(normalized.slice(0, 2), 16),
        parseInt(normalized.slice(2, 4), 16),
        parseInt(normalized.slice(4, 6), 16)
    ];
};

const getColumnLetter = (columnNumber) => {
    let value = columnNumber;
    let column = '';

    while (value > 0) {
        const remainder = (value - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        value = Math.floor((value - 1) / 26);
    }

    return column;
};

const addExcelImage = (workbook, sheet, imageData, range) => {
    if (!imageData) {
        return;
    }

    const imageId = workbook.addImage({
        base64: imageData,
        extension: 'png'
    });

    sheet.addImage(imageId, range);
};

const createCanvasContext = (width, height) => {
    if (typeof document === 'undefined') {
        return null;
    }

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    context.scale(scale, scale);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    return { canvas, context };
};

const setCanvasFont = (context, weight, size) => {
    context.font = `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
};

const drawRoundedRect = (context, x, y, width, height, radius, fillColor, strokeColor = null) => {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();

    if (fillColor) {
        context.fillStyle = fillColor;
        context.fill();
    }

    if (strokeColor) {
        context.strokeStyle = strokeColor;
        context.lineWidth = 1;
        context.stroke();
    }
};

const createStatusChartImage = (report) => {
    const chartBase = createCanvasContext(1200, 660);
    if (!chartBase) {
        return null;
    }

    const { canvas, context } = chartBase;
    const { chartData = [], filters } = report;
    const chartTitle = 'สถิติเปรียบเทียบการจอง';
    const chartSubtitle = `จำแนกตามสถานะในช่วง ${filters.rangeLabel}`;

    drawRoundedRect(context, 18, 18, 1164, 624, 26, '#ffffff', '#E2E8F0');

    context.fillStyle = '#0F172A';
    setCanvasFont(context, 700, 30);
    context.fillText(chartTitle, 54, 68);
    context.fillStyle = '#64748B';
    setCanvasFont(context, 400, 16);
    context.fillText(chartSubtitle, 54, 98);

    let legendX = 792;
    CHART_SERIES.forEach((series) => {
        context.fillStyle = series.color;
        context.beginPath();
        context.arc(legendX, 86, 7, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = '#334155';
        setCanvasFont(context, 600, 14);
        context.fillText(series.label, legendX + 16, 91);
        legendX += 136;
    });

    if (chartData.length === 0) {
        context.fillStyle = '#94A3B8';
        setCanvasFont(context, 600, 24);
        context.fillText('ไม่มีข้อมูลกราฟสำหรับช่วงที่เลือก', 410, 332);
        return canvas.toDataURL('image/png');
    }

    const chartLeft = 86;
    const chartTop = 136;
    const chartWidth = 1050;
    const chartHeight = 420;
    const maxValue = Math.max(1, ...chartData.map((item) => item.approved + item.pending + item.rejected));
    const slotWidth = chartWidth / Math.max(chartData.length, 1);
    const barWidth = Math.min(48, slotWidth * 0.44);

    [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
        const y = chartTop + chartHeight - (chartHeight * ratio);
        context.strokeStyle = '#E2E8F0';
        context.setLineDash([6, 8]);
        context.beginPath();
        context.moveTo(chartLeft, y);
        context.lineTo(chartLeft + chartWidth, y);
        context.stroke();
        context.setLineDash([]);

        context.fillStyle = '#94A3B8';
        setCanvasFont(context, 400, 13);
        context.textAlign = 'right';
        context.fillText(String(Math.round(maxValue * ratio)), chartLeft - 14, y + 4);
        context.textAlign = 'left';
    });

    chartData.forEach((item, index) => {
        const x = chartLeft + (slotWidth * index) + (slotWidth / 2) - (barWidth / 2);
        const total = item.approved + item.pending + item.rejected;
        const approvedHeight = (item.approved / maxValue) * chartHeight;
        const pendingHeight = (item.pending / maxValue) * chartHeight;
        const rejectedHeight = (item.rejected / maxValue) * chartHeight;
        const approvedY = chartTop + chartHeight - approvedHeight;
        const pendingY = approvedY - pendingHeight;
        const rejectedY = pendingY - rejectedHeight;

        drawRoundedRect(context, x, rejectedY, barWidth, rejectedHeight, 8, '#FB7185');
        drawRoundedRect(context, x, pendingY, barWidth, pendingHeight, 8, '#F59E0B');
        drawRoundedRect(context, x, approvedY, barWidth, approvedHeight, 8, '#10B981');

        context.fillStyle = '#475569';
        setCanvasFont(context, 500, 13);
        context.textAlign = 'center';
        context.fillText(item.label, x + (barWidth / 2), chartTop + chartHeight + 28);

        if (total > 0) {
            context.fillStyle = '#64748B';
            setCanvasFont(context, 600, 12);
            context.fillText(String(total), x + (barWidth / 2), rejectedY - 10);
        }
    });

    return canvas.toDataURL('image/png');
};

const createRoomShareChartImage = (report) => {
    const chartBase = createCanvasContext(900, 560);
    if (!chartBase) {
        return null;
    }

    const { canvas, context } = chartBase;
    const { roomShareData = [] } = report;
    const total = roomShareData.reduce((sum, item) => sum + item.count, 0);

    drawRoundedRect(context, 18, 18, 864, 524, 26, '#ffffff', '#E2E8F0');

    if (roomShareData.length === 0 || total === 0) {
        context.fillStyle = '#94A3B8';
        setCanvasFont(context, 600, 22);
        context.textAlign = 'center';
        context.fillText('ไม่มีข้อมูลสัดส่วนห้องสำหรับช่วงที่เลือก', 450, 286);
        context.textAlign = 'left';
        return canvas.toDataURL('image/png');
    }

    const centerX = 246;
    const centerY = 278;
    const outerRadius = 126;
    const innerRadius = 68;
    let currentAngle = -Math.PI / 2;

    roomShareData.forEach((item) => {
        const angle = (item.count / total) * Math.PI * 2;

        context.beginPath();
        context.moveTo(centerX, centerY);
        context.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + angle);
        context.closePath();
        context.fillStyle = item.color;
        context.fill();

        currentAngle += angle;
    });

    context.beginPath();
    context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.fill();

    context.fillStyle = '#94A3B8';
    setCanvasFont(context, 600, 16);
    context.textAlign = 'center';
    context.fillText('รวมทั้งหมด', centerX, centerY - 10);
    context.fillStyle = '#0F172A';
    setCanvasFont(context, 700, 38);
    context.fillText(formatNumber(total), centerX, centerY + 28);
    context.textAlign = 'left';

    let legendY = 136;
    roomShareData.forEach((item) => {
        context.fillStyle = item.color;
        drawRoundedRect(context, 476, legendY - 11, 16, 16, 5, item.color);

        context.fillStyle = '#0F172A';
        setCanvasFont(context, 600, 16);
        context.fillText(item.label, 506, legendY + 2);

        context.fillStyle = '#64748B';
        setCanvasFont(context, 400, 14);
        context.fillText(`${formatNumber(item.count)} ครั้ง • ${item.percent.toFixed(1)}%`, 506, legendY + 26);

        legendY += 66;
    });

    return canvas.toDataURL('image/png');
};

const setSheetTitle = (sheet, title, subtitle) => {
    const lastColumn = getColumnLetter(Math.max(sheet.columnCount, 1));
    sheet.mergeCells(`A1:${lastColumn}1`);
    sheet.getCell('A1').value = title;
    sheet.getCell('A1').font = { name: EXCEL_FONT_FAMILY, size: 19, bold: true, color: { argb: argb('0F172A') } };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells(`A2:${lastColumn}2`);
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { name: EXCEL_FONT_FAMILY, size: 11, color: { argb: argb('64748B') } };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getRow(1).height = 28;
    sheet.getRow(2).height = 20;
};

const setMetricCard = (sheet, topLeftCell, bottomRightCell, card) => {
    const theme = CARD_THEMES[card.key] || CARD_THEMES.total;
    sheet.mergeCells(`${topLeftCell}:${bottomRightCell}`);
    const cell = sheet.getCell(topLeftCell);
    cell.value = {
        richText: [
            {
                text: `${card.label}\n`,
                font: { name: EXCEL_FONT_FAMILY, size: 11, bold: true, color: { argb: argb('475569') } }
            },
            {
                text: formatNumber(card.value),
                font: { name: EXCEL_FONT_FAMILY, size: 22, bold: true, color: { argb: argb(theme.text) } }
            }
        ]
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(theme.fill) } };
    cell.border = {
        top: { style: 'thin', color: { argb: argb(theme.border) } },
        left: { style: 'thin', color: { argb: argb(theme.border) } },
        bottom: { style: 'thin', color: { argb: argb(theme.border) } },
        right: { style: 'thin', color: { argb: argb(theme.border) } }
    };
};

const styleTableHeader = (row, fillHex = '0F766E') => {
    row.eachCell((cell) => {
        cell.font = { name: EXCEL_FONT_FAMILY, size: 11, bold: true, color: { argb: argb('FFFFFF') } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fillHex) } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: argb('E2E8F0') } },
            left: { style: 'thin', color: { argb: argb('E2E8F0') } },
            bottom: { style: 'thin', color: { argb: argb('E2E8F0') } },
            right: { style: 'thin', color: { argb: argb('E2E8F0') } }
        };
    });
};

const styleBodyRow = (row) => {
    const fillHex = row.number % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    row.eachCell((cell) => {
        cell.font = { name: EXCEL_FONT_FAMILY, size: 10, color: { argb: argb('334155') } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fillHex) } };
        cell.border = {
            top: { style: 'thin', color: { argb: argb('E2E8F0') } },
            left: { style: 'thin', color: { argb: argb('E2E8F0') } },
            bottom: { style: 'thin', color: { argb: argb('E2E8F0') } },
            right: { style: 'thin', color: { argb: argb('E2E8F0') } }
        };
    });
};

const styleStatusCell = (cell, statusThemeKey) => {
    const styles = {
        approved: { fill: 'ECFDF5', text: '047857' },
        pending: { fill: 'FFFBEB', text: 'B45309' },
        rejected: { fill: 'FFF1F2', text: 'BE123C' }
    };
    const style = styles[statusThemeKey] || { fill: 'F8FAFC', text: '334155' };

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(style.fill) } };
    cell.font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true, color: { argb: argb(style.text) } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
};

const createOverviewSheet = (workbook, report, brandAssets) => {
    const sheet = workbook.addWorksheet('ภาพรวม', {
        views: [{ showGridLines: false }]
    });

    sheet.properties.tabColor = { argb: argb('0F766E') };
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.columns = Array.from({ length: 12 }, () => ({ width: 15 }));
    sheet.properties.defaultRowHeight = 24;

    sheet.mergeCells('A1:H4');
    const heroCell = sheet.getCell('A1');
    heroCell.value = `${report.title}\n${report.subtitle}`;
    heroCell.font = { name: EXCEL_FONT_FAMILY, size: 18, bold: true, color: { argb: argb('FFFFFF') } };
    heroCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    heroCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('0F766E') } };
    heroCell.border = {
        top: { style: 'thin', color: { argb: argb('0F766E') } },
        left: { style: 'thin', color: { argb: argb('0F766E') } },
        bottom: { style: 'thin', color: { argb: argb('0F766E') } },
        right: { style: 'thin', color: { argb: argb('0F766E') } }
    };

    sheet.mergeCells('I1:L4');
    const metaCell = sheet.getCell('I1');
    metaCell.value = [
        'ข้อมูลรายงาน',
        `ช่วงข้อมูล: ${report.filters.rangeLabel}`,
        `สถานะ: ${report.filters.statusLabel}`,
        `คำค้นหา: ${report.filters.searchQuery || 'ไม่มี'}`,
        `สร้างเมื่อ: ${formatDateTime(report.generatedAt)}`
    ].join('\n');
    metaCell.font = { name: EXCEL_FONT_FAMILY, size: 11, color: { argb: argb('0F172A') } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('ECFDF5') } };
    metaCell.border = {
        top: { style: 'thin', color: { argb: argb('A7F3D0') } },
        left: { style: 'thin', color: { argb: argb('A7F3D0') } },
        bottom: { style: 'thin', color: { argb: argb('A7F3D0') } },
        right: { style: 'thin', color: { argb: argb('A7F3D0') } }
    };

    addExcelImage(workbook, sheet, brandAssets?.banner, {
        tl: { col: 0.3, row: 0.2 },
        ext: { width: 165, height: 42 }
    });
    addExcelImage(workbook, sheet, brandAssets?.seal, {
        tl: { col: 10.2, row: 0.3 },
        ext: { width: 82, height: 46 }
    });

    const cardRanges = [
        ['A6', 'C9'],
        ['D6', 'F9'],
        ['G6', 'I9'],
        ['J6', 'L9']
    ];

    report.cards.slice(0, 4).forEach((card, index) => {
        const [startCell, endCell] = cardRanges[index];
        setMetricCard(sheet, startCell, endCell, card);
    });

    sheet.mergeCells('A11:L13');
    const noteCell = sheet.getCell('A11');
    noteCell.value = [
        'สรุปข้อมูลรายงาน',
        `ข้อมูลที่ใช้สรุปภาพรวม: ${formatNumber(report.summary.overviewBookings)} รายการ`,
        `ข้อมูลตามตัวกรองที่พร้อมส่งออก: ${formatNumber(report.summary.tableBookings)} รายการ`
    ].join('\n');
    noteCell.font = { name: EXCEL_FONT_FAMILY, size: 11, color: { argb: argb('334155') } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('F8FAFC') } };
    noteCell.border = {
        top: { style: 'thin', color: { argb: argb('CBD5E1') } },
        left: { style: 'thin', color: { argb: argb('CBD5E1') } },
        bottom: { style: 'thin', color: { argb: argb('CBD5E1') } },
        right: { style: 'thin', color: { argb: argb('CBD5E1') } }
    };
};

const createStatusChartSheet = (workbook, report, chartImage, brandAssets) => {
    const sheet = workbook.addWorksheet('กราฟสถานะ', {
        views: [{ showGridLines: false }]
    });

    sheet.properties.tabColor = { argb: argb('0EA5E9') };
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.columns = [
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 18 }
    ];

    setSheetTitle(sheet, 'กราฟเปรียบเทียบสถานะการจอง', `${report.filters.rangeLabel} • ${report.filters.statusLabel}`);
    addExcelImage(workbook, sheet, brandAssets?.banner, {
        tl: { col: 4.2, row: 0.1 },
        ext: { width: 140, height: 32 }
    });

    if (chartImage) {
        const chartImageId = workbook.addImage({
            base64: chartImage,
            extension: 'png'
        });
        sheet.addImage(chartImageId, {
            tl: { col: 0, row: STATUS_SHEET_LAYOUT.imageTopRow },
            ext: { width: STATUS_SHEET_LAYOUT.imageWidth, height: STATUS_SHEET_LAYOUT.imageHeight }
        });
    }

    const tableStartRow = STATUS_SHEET_LAYOUT.tableStartRow;
    const headerRow = sheet.getRow(tableStartRow);
    headerRow.values = ['ช่วงเวลา', 'อนุมัติ', 'รอตรวจสอบ', 'ปฏิเสธ / ยกเลิก', 'รวม'];
    styleTableHeader(headerRow);

    report.chartData.forEach((item, index) => {
        const row = sheet.getRow(tableStartRow + index + 1);
        row.values = [
            item.label,
            item.approved,
            item.pending,
            item.rejected,
            item.approved + item.pending + item.rejected
        ];
        styleBodyRow(row);
    });

    sheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow, column: 5 }
    };
    sheet.views = [{ state: 'frozen', ySplit: tableStartRow, showGridLines: false }];
};

const createRoomShareSheet = (workbook, report, chartImage, brandAssets) => {
    const sheet = workbook.addWorksheet('สัดส่วนห้อง', {
        views: [{ showGridLines: false }]
    });

    sheet.properties.tabColor = { argb: argb('10B981') };
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.columns = [
        { width: 28 },
        { width: 14 },
        { width: 14 },
        { width: 36 }
    ];

    setSheetTitle(sheet, 'สัดส่วนการใช้งานห้อง', `${report.filters.rangeLabel} • ${report.filters.statusLabel}`);
    addExcelImage(workbook, sheet, brandAssets?.banner, {
        tl: { col: 2.7, row: 0.1 },
        ext: { width: 140, height: 32 }
    });

    if (chartImage) {
        const chartImageId = workbook.addImage({
            base64: chartImage,
            extension: 'png'
        });
        sheet.addImage(chartImageId, {
            tl: { col: 0, row: ROOM_SHARE_SHEET_LAYOUT.imageTopRow },
            ext: { width: ROOM_SHARE_SHEET_LAYOUT.imageWidth, height: ROOM_SHARE_SHEET_LAYOUT.imageHeight }
        });
    }

    sheet.mergeCells(`A${ROOM_SHARE_SHEET_LAYOUT.noteStartRow}:D${ROOM_SHARE_SHEET_LAYOUT.noteEndRow}`);
    const noteCell = sheet.getCell(`A${ROOM_SHARE_SHEET_LAYOUT.noteStartRow}`);
    noteCell.value = report.notes.roomShare;
    noteCell.font = { name: EXCEL_FONT_FAMILY, size: 11, color: { argb: argb('475569') } };
    noteCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    const tableStartRow = ROOM_SHARE_SHEET_LAYOUT.tableStartRow;
    const headerRow = sheet.getRow(tableStartRow);
    headerRow.values = ['ห้อง', 'จำนวนครั้ง', 'สัดส่วน (%)', 'หมายเหตุ'];
    styleTableHeader(headerRow, '0F766E');

    if (report.roomShareData.length === 0) {
        const row = sheet.getRow(tableStartRow + 1);
        row.values = ['ไม่มีข้อมูล', 0, 0, 'ไม่พบการใช้งานห้องตามตัวกรอง'];
        styleBodyRow(row);
    } else {
        report.roomShareData.forEach((item, index) => {
            const row = sheet.getRow(tableStartRow + index + 1);
            row.values = [
                item.label,
                item.count,
                item.percent,
                index === 0 ? 'ห้องที่มีการใช้งานสูงสุดในช่วงนี้' : ''
            ];
            styleBodyRow(row);
        });
    }

    sheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow, column: 4 }
    };
    sheet.views = [{ state: 'frozen', ySplit: tableStartRow, showGridLines: false }];
};

const createBookingSheet = (workbook, title, subtitle, bookings, sheetName, brandAssets) => {
    const rows = normalizeBookingRows(bookings);
    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: false }]
    });

    sheet.properties.tabColor = { argb: argb('64748B') };
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.columns = [
        { width: 8 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 20 },
        { width: 28 },
        { width: 22 },
        { width: 26 },
        { width: 18 },
        { width: 22 },
        { width: 22 }
    ];

    setSheetTitle(sheet, title, subtitle);
    addExcelImage(workbook, sheet, brandAssets?.banner, {
        tl: { col: 7.5, row: 0.1 },
        ext: { width: 140, height: 32 }
    });

    const startRow = 4;
    const headerRow = sheet.getRow(startRow);
    headerRow.values = ['#', 'รหัสจอง', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'อีเมล', 'ภาควิชา', 'สถานะ', 'สร้างเมื่อ'];
    styleTableHeader(headerRow, '0F766E');

    if (rows.length === 0) {
        const row = sheet.getRow(startRow + 1);
        row.values = ['-', '-', '-', '-', '-', 'ไม่มีข้อมูลสำหรับตัวกรองนี้', '-', '-', '-', '-', '-'];
        styleBodyRow(row);
    } else {
        rows.forEach((item, index) => {
            const row = sheet.getRow(startRow + index + 1);
            row.values = [
                item.index,
                item.code,
                item.date,
                item.time,
                item.room,
                item.topic,
                item.user,
                item.email,
                item.department,
                item.status,
                item.createdAt
            ];
            styleBodyRow(row);
            row.getCell(2).font = { name: EXCEL_FONT_FAMILY, size: 10, bold: true, color: { argb: argb('0F172A') } };
            styleStatusCell(row.getCell(10), item.statusThemeKey);
        });
    }

    sheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: startRow, column: 11 }
    };
    sheet.views = [{ state: 'frozen', ySplit: startRow, showGridLines: false }];
};

const drawPdfHeader = (doc, report, pageTitle, brandAssets = {}) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 3, 'F');

    if (brandAssets.banner) {
        doc.addImage(brandAssets.banner, 'PNG', 14, 7, 58, 14);
    } else {
        doc.setFont('Sarabun', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.text(report.title, 14, 16);
    }

    if (brandAssets.seal) {
        doc.addImage(brandAssets.seal, 'PNG', 176, 6, 18, 18);
    }

    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(pageTitle, 14, 24);

    doc.setFont('Sarabun', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(formatDateTime(report.generatedAt), 196, 24, { align: 'right' });
};

const getPdfTextLines = (doc, text, maxWidth) => doc.splitTextToSize(String(text || ''), maxWidth);
const PDF_TABLE_CELL_PADDING = Object.freeze({ top: 2.2, right: 2.4, bottom: 2.8, left: 2.4 });
const PDF_TABLE_HEAD_PADDING = Object.freeze({ top: 2.6, right: 2.4, bottom: 3, left: 2.4 });

const createPdfTableStyles = (fillColor, overrides = {}) => ({
    styles: {
        font: 'Sarabun',
        fontSize: 8.2,
        cellPadding: PDF_TABLE_CELL_PADDING,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        ...(overrides.styles || {})
    },
    headStyles: {
        fillColor,
        textColor: 255,
        fontStyle: 'bold',
        valign: 'middle',
        minCellHeight: 9,
        cellPadding: PDF_TABLE_HEAD_PADDING,
        ...(overrides.headStyles || {})
    },
    bodyStyles: {
        textColor: [51, 65, 85],
        ...(overrides.bodyStyles || {})
    }
});

const drawPdfChip = (doc, x, y, width, label, value, accent) => {
    const [red, green, blue] = hexToRgb(accent);
    const displayValue = value.length > 15 ? `${value.slice(0, 14)}…` : value;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(red, green, blue);
    doc.roundedRect(x, y, width, 16, 3, 3, 'FD');
    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(red, green, blue);
    doc.text(label, x + 3, y + 5.5);
    doc.setFont('Sarabun', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(displayValue, x + 3, y + 11.5);
};

const drawPdfCard = (doc, x, y, width, height, card) => {
    const theme = CARD_THEMES[card.key] || CARD_THEMES.total;
    const [red, green, blue] = hexToRgb(theme.accent);
    const isCompact = height <= 26;
    doc.setFillColor(...hexToRgb(theme.fill));
    doc.setDrawColor(...hexToRgb(theme.border));
    doc.roundedRect(x, y, width, height, 4, 4, 'FD');
    doc.setFillColor(red, green, blue);
    doc.roundedRect(x, y, width, 4, 4, 4, 'F');

    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(isCompact ? 8.8 : 9.2);
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, x + 4, y + (isCompact ? 10.2 : 11.5));

    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(isCompact ? 16.5 : 18);
    doc.setTextColor(red, green, blue);
    doc.text(formatNumber(card.value), x + 4, y + (isCompact ? 19.4 : 21));
};

const drawPdfHero = (doc, report, brandAssets = {}) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFillColor(15, 118, 110);
    doc.roundedRect(12, 12, 186, 54, 6, 6, 'F');
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(12, 52, 186, 14, 0, 0, 'F');

    if (brandAssets.banner) {
        doc.addImage(brandAssets.banner, 'PNG', 18, 18, 72, 18);
    }

    if (brandAssets.seal) {
        doc.addImage(brandAssets.seal, 'PNG', 164, 18, 24, 24);
    }

    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(220, 252, 231);
    doc.text('ข้อมูลสรุปสำหรับผู้ดูแลระบบ', 18, 42);

    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text(report.title, 18, 50);

    doc.setFont('Sarabun', 'normal');
    doc.setFontSize(10.5);
    doc.text(report.subtitle, 18, 58);

    drawPdfChip(doc, 18, 72, 50, 'ช่วงข้อมูล', report.filters.rangeLabel, '#0EA5E9');
    drawPdfChip(doc, 72, 72, 40, 'สถานะ', report.filters.statusLabel, '#10B981');
    drawPdfChip(doc, 116, 72, 40, 'คำค้นหา', report.filters.searchQuery || 'ไม่มี', '#F59E0B');
    drawPdfChip(doc, 160, 72, 32, 'สร้างเมื่อ', formatShortDate(report.generatedAt), '#64748B');
};

const drawPdfSectionPanel = (doc, x, y, width, height, title, subtitle) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, height, 5, 5, 'FD');

    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const titleLines = getPdfTextLines(doc, title, width - 10);
    doc.text(titleLines, x + 5, y + 8);

    doc.setFont('Sarabun', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const titleHeight = doc.getTextDimensions(titleLines).h;
    const subtitleLines = getPdfTextLines(doc, subtitle, width - 10);
    const subtitleY = y + 8 + titleHeight + 2.5;
    doc.text(subtitleLines, x + 5, subtitleY);
    const subtitleHeight = subtitleLines.length > 0 ? doc.getTextDimensions(subtitleLines).h : 0;

    return {
        contentStartY: Math.min(subtitleY + subtitleHeight + 4, y + height - 8),
        bottomY: y + height - 6
    };
};

const addPdfFooters = (doc, report) => {
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 287, 196, 287);
        doc.setFont('Sarabun', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(report.title, 14, 292);
        doc.text(`หน้า ${page} / ${pageCount}`, 196, 292, { align: 'right' });
    }
};

export const exportDashboardToExcel = async (report, filename = 'dashboard_export') => {
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
        import('exceljs'),
        import('file-saver')
    ]);

    await ensureCanvasFontsLoaded();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ระบบจัดการห้องอบรม';
    workbook.created = new Date();
    workbook.modified = new Date();

    const brandAssets = await loadBrandAssets();
    const statusChartImage = createStatusChartImage(report);
    const roomShareChartImage = createRoomShareChartImage(report);

    createOverviewSheet(workbook, report, brandAssets);
    createStatusChartSheet(workbook, report, statusChartImage, brandAssets);
    createRoomShareSheet(workbook, report, roomShareChartImage, brandAssets);
    createBookingSheet(
        workbook,
        'ข้อมูลช่วงเวลาสรุป',
        `ชุดข้อมูลที่ใช้สรุปภาพรวมและกราฟสถานะ • ${report.filters.rangeLabel}`,
        report.datasets.overviewBookings,
        'ข้อมูลช่วงเวลาสรุป',
        brandAssets
    );
    createBookingSheet(
        workbook,
        'ข้อมูลตารางที่ส่งออก',
        `${report.filters.statusLabel}${report.filters.searchQuery ? ` • ค้นหา: ${report.filters.searchQuery}` : ''}`,
        report.datasets.tableBookings,
        'ข้อมูลตาราง',
        brandAssets
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportDashboardToPDF = async (report, filename = 'dashboard_export') => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);

    await ensureCanvasFontsLoaded();

    const doc = new jsPDF('p', 'mm', 'a4');
    await loadFonts(doc);

    const brandAssets = await loadBrandAssets();
    const statusChartImage = createStatusChartImage(report);
    const roomShareChartImage = createRoomShareChartImage(report);
    const tableRows = normalizeBookingRows(report.datasets.tableBookings);
    const primaryCards = report.cards.slice(0, 4);
    const roomShareSummaryRows = report.roomShareData.slice(0, 5);
    const roomShareSummarySubtitle = report.roomShareData.length > roomShareSummaryRows.length
        ? `แสดง ${formatNumber(roomShareSummaryRows.length)} ห้องที่มีการใช้งานสูงสุดจาก ${formatNumber(report.roomShareData.length)} ห้อง`
        : `${formatNumber(report.roomShareData.length)} ห้องในรายงานนี้`;

    drawPdfHero(doc, report, brandAssets);

    const primaryCardPositions = [
        [14, 96], [106, 96],
        [14, 128], [106, 128]
    ];

    primaryCards.forEach((card, index) => {
        const [x, y] = primaryCardPositions[index];
        drawPdfCard(doc, x, y, 88, 28, card);
    });

    const statusOverviewPanel = drawPdfSectionPanel(
        doc,
        14,
        162,
        182,
        116,
        'ภาพรวมสถานะการจอง',
        `สรุปจำนวนรายการตามสถานะจากข้อมูลจริงในช่วง ${report.filters.rangeLabel}`
    );
    if (statusChartImage) {
        const statusChartY = statusOverviewPanel.contentStartY + 1;
        const statusChartHeight = Math.max(72, statusOverviewPanel.bottomY - statusChartY - 1);
        doc.addImage(statusChartImage, 'PNG', 18, statusChartY, 174, statusChartHeight);
    }

    doc.addPage();
    drawPdfHeader(doc, report, 'สัดส่วนห้องและข้อมูลประกอบ', brandAssets);

    const roomSharePanel = drawPdfSectionPanel(
        doc,
        14,
        34,
        182,
        136,
        'สัดส่วนการใช้งานห้อง',
        'แสดงห้องที่มีการใช้งานตามตัวกรองสถานะที่เลือก'
    );

    if (roomShareChartImage) {
        const roomShareChartY = roomSharePanel.contentStartY + 2;
        const roomShareChartHeight = Math.max(84, roomSharePanel.bottomY - roomShareChartY - 1);
        doc.addImage(roomShareChartImage, 'PNG', 18, roomShareChartY, 174, roomShareChartHeight);
    }

    const roomSummaryPanel = drawPdfSectionPanel(
        doc,
        14,
        176,
        182,
        96,
        'สรุปห้องที่ใช้งาน',
        roomShareSummarySubtitle
    );
    autoTable(doc, {
        startY: roomSummaryPanel.contentStartY + 1,
        head: [['ห้อง', 'จำนวนครั้ง', 'สัดส่วน (%)']],
        body: roomShareSummaryRows.length > 0
            ? roomShareSummaryRows.map((item) => [item.label, formatNumber(item.count), item.percent.toFixed(1)])
            : [['ไม่มีข้อมูล', '0', '0.0']],
        theme: 'grid',
        ...createPdfTableStyles([15, 118, 110], {
            styles: { fontSize: 7.6 },
            headStyles: { fontSize: 7.4, minCellHeight: 9.5 }
        }),
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 28, halign: 'center' }
        },
        margin: { left: 18, right: 18 }
    });

    doc.addPage();
    drawPdfHeader(doc, report, 'ตารางสถานะรายช่วงเวลา', brandAssets);
    const statusSupportPanel = drawPdfSectionPanel(
        doc,
        14,
        34,
        182,
        238,
        'ตารางข้อมูลประกอบกราฟสถานะ',
        'ใช้ตรวจสอบจำนวนรายการในแต่ละช่วงเวลา'
    );
    autoTable(doc, {
        startY: statusSupportPanel.contentStartY + 2,
        head: [['ช่วงเวลา', 'อนุมัติ', 'รอตรวจสอบ', 'ปฏิเสธ / ยกเลิก', 'รวม']],
        body: report.chartData.length > 0
            ? report.chartData.map((item) => [
                item.label,
                formatNumber(item.approved),
                formatNumber(item.pending),
                formatNumber(item.rejected),
                formatNumber(item.approved + item.pending + item.rejected)
            ])
            : [['ไม่มีข้อมูล', '0', '0', '0', '0']],
        theme: 'grid',
        ...createPdfTableStyles([14, 165, 233], {
            styles: { fontSize: 8.1 },
            headStyles: { minCellHeight: 10 }
        }),
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 24, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 42, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
        },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        margin: { left: 18, right: 18, bottom: 22 }
    });

    doc.addPage();
    drawPdfHeader(doc, report, 'ข้อมูลตารางที่ส่งออก', brandAssets);
    drawPdfChip(doc, 14, 34, 52, 'ช่วงข้อมูล', report.filters.rangeLabel, '#0EA5E9');
    drawPdfChip(doc, 70, 34, 42, 'สถานะ', report.filters.statusLabel, '#10B981');
    drawPdfChip(doc, 116, 34, 44, 'คำค้นหา', report.filters.searchQuery || 'ไม่มี', '#F59E0B');
    drawPdfChip(doc, 164, 34, 28, 'รวม', `${formatNumber(tableRows.length)} รายการ`, '#64748B');
    const exportDataPanel = drawPdfSectionPanel(
        doc,
        14,
        56,
        182,
        30,
        'ข้อมูลรายการที่ส่งออก',
        report.notes.search
    );

    autoTable(doc, {
        startY: exportDataPanel.contentStartY + 2,
        head: [['รหัสจอง', 'วันที่', 'เวลา', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'สถานะ']],
        body: tableRows.length > 0
            ? tableRows.map((item) => [
                item.code,
                item.date,
                item.time,
                item.room,
                item.topic,
                item.user,
                item.status
            ])
            : [['-', '-', '-', '-', 'ไม่มีข้อมูลสำหรับตัวกรองนี้', '-', '-']],
        theme: 'striped',
        ...createPdfTableStyles([15, 118, 110], {
            styles: { fontSize: 7.9 },
            headStyles: { minCellHeight: 10 }
        }),
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 20 },
            2: { cellWidth: 20 },
            3: { cellWidth: 24 },
            4: { cellWidth: 38 },
            5: { cellWidth: 34 },
            6: { cellWidth: 24 }
        },
        margin: { left: 14, right: 14, bottom: 22 }
    });

    addPdfFooters(doc, report);
    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
