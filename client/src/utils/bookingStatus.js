export const getBookingStatusLabel = (booking) => {
    switch (booking?.status) {
        case 'approved':
            return 'อนุมัติ';
        case 'pending':
            return 'รออนุมัติ';
        case 'cancelled':
            if (booking?.cancelledByRole === 'student') {
                return 'นักศึกษายกเลิกเอง';
            }

            return 'ยกเลิก';
        case 'rejected':
            return 'ปฏิเสธ';
        default:
            return booking?.status || '-';
    }
};
