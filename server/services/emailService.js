const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EMAIL] Warning: EMAIL_USER or EMAIL_PASS not set in .env - emails will not be sent');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmailText = (value, fallback = '') => {
    const normalizedValue = String(value ?? fallback)
        .replace(/\s+/g, ' ')
        .trim();

    return normalizedValue || fallback;
};

const formatThaiDateTime = (value) => new Date(value).toLocaleString('th-TH');
const formatThaiTime = (value) => new Date(value).toLocaleTimeString('th-TH');

const getSafeBookingEmailDetails = (booking = {}) => {
    const topicText = normalizeEmailText(booking.topic, 'รายการจองห้อง');

    return {
        topicText,
        topicHtml: escapeHtml(topicText),
        userNameHtml: escapeHtml(normalizeEmailText(booking.user?.name, 'ผู้ใช้งาน')),
        roomNameHtml: escapeHtml(normalizeEmailText(booking.room?.name, 'N/A')),
        startDateTime: formatThaiDateTime(booking.startTime),
        endDateTime: formatThaiDateTime(booking.endTime),
        endTime: formatThaiTime(booking.endTime),
        cancellationReasonHtml: escapeHtml(normalizeEmailText(booking.cancellationReason, '')),
        cancelledByLabel: booking.cancelledByRole === 'admin'
            ? 'เจ้าหน้าที่'
            : booking.cancelledByRole === 'student'
                ? 'ผู้จอง'
                : 'ระบบ'
    };
};

const renderEmailLayout = ({ accentColor, title, body }) => `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: ${accentColor}; padding: 24px 28px;">
            <h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${title}</h2>
        </div>
        <div style="padding: 24px 28px; color: #334155; font-size: 14px; line-height: 1.8;">
            ${body}
        </div>
    </div>
`;

const renderInfoCard = (rows, options = {}) => {
    const borderColor = options.borderColor || '#dbeafe';
    const backgroundColor = options.backgroundColor || '#f8fafc';

    return `
        <div style="background-color: ${backgroundColor}; border-left: 4px solid ${borderColor}; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
            ${rows.join('')}
        </div>
    `;
};

const renderLabelValue = (label, value) => `
    <p style="margin: 0 0 8px; color: #334155;">
        <strong style="color: #0f172a;">${label}:</strong> ${value}
    </p>
`;

const sendEmail = async (to, subject, html, options = {}) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('[EMAIL] Skipped: Email not configured');
        return {
            success: false,
            skipped: true,
            code: 'EMAIL_NOT_CONFIGURED'
        };
    }

    try {
        const info = await transporter.sendMail({
            from: `"Meeting Room Booking" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            ...options
        });

        console.log(`Email sent to ${to}`);
        return {
            success: true,
            info
        };
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        return {
            success: false,
            error,
            code: 'EMAIL_SEND_FAILED'
        };
    }
};

const sendBookingCreated = async (booking) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime,
        endDateTime
    } = getSafeBookingEmailDetails(booking);

    const subject = `ได้รับคำขอจองห้อง: ${topicText}`;
    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #16a34a, #15803d)',
        title: 'ได้รับคำขอจองห้องเรียบร้อยแล้ว',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${userNameHtml},</p>
            <p>ระบบได้รับข้อมูลการจองของคุณแล้ว และกำลังรอการพิจารณาอนุมัติจากเจ้าหน้าที่</p>
            ${renderInfoCard([
                renderLabelValue('หัวข้อ', topicHtml),
                renderLabelValue('ห้อง', roomNameHtml),
                renderLabelValue('เวลาเริ่ม', startDateTime),
                renderLabelValue('เวลาสิ้นสุด', endDateTime)
            ])}
            <p style="margin-bottom: 0; color: #64748b;">ระบบจะแจ้งผลการอนุมัติให้ทราบทางอีเมลอีกครั้ง</p>
        `
    });

    return sendEmail(booking.user.email, subject, html);
};

const sendBookingApproved = async (booking) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime,
        endTime
    } = getSafeBookingEmailDetails(booking);

    const subject = `อนุมัติการจองห้อง: ${topicText}`;
    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #16a34a, #0f766e)',
        title: 'การจองของคุณได้รับการอนุมัติแล้ว',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${userNameHtml},</p>
            <p>รายการจองห้องของคุณได้รับการอนุมัติเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียดดังต่อไปนี้</p>
            ${renderInfoCard([
                renderLabelValue('หัวข้อ', topicHtml),
                renderLabelValue('ห้อง', roomNameHtml),
                renderLabelValue('วันและเวลา', `${startDateTime} - ${endTime}`)
            ], {
                borderColor: '#16a34a',
                backgroundColor: '#f0fdf4'
            })}
            <p style="margin-bottom: 0; color: #64748b;">กรุณามาถึงก่อนเวลาใช้งานประมาณ 5-10 นาที</p>
        `
    });

    return sendEmail(booking.user.email, subject, html);
};

const sendBookingReminder = async (booking) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime
    } = getSafeBookingEmailDetails(booking);

    const subject = `แจ้งเตือนใกล้ถึงเวลาใช้งานห้อง: ${topicText}`;
    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #f97316, #ea580c)',
        title: 'แจ้งเตือนใกล้ถึงเวลาใช้งานห้อง',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${userNameHtml},</p>
            <p>รายการจองของคุณกำลังจะเริ่มภายใน 1 ชั่วโมง กรุณาตรวจสอบรายละเอียดก่อนเข้าใช้งาน</p>
            ${renderInfoCard([
                renderLabelValue('หัวข้อ', topicHtml),
                renderLabelValue('ห้อง', roomNameHtml),
                renderLabelValue('เวลาเริ่ม', startDateTime)
            ], {
                borderColor: '#ea580c',
                backgroundColor: '#fff7ed'
            })}
            <p style="margin-bottom: 0; color: #64748b;">หากมีการเปลี่ยนแปลง กรุณาติดต่อเจ้าหน้าที่โดยเร็ว</p>
        `
    });

    return sendEmail(booking.user.email, subject, html);
};

const sendBookingModified = async (booking, oldStartTime, oldEndTime) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime,
        endTime
    } = getSafeBookingEmailDetails(booking);

    const subject = `มีการแก้ไขเวลาจองห้อง: ${topicText}`;
    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        title: 'เวลาจองห้องของคุณถูกแก้ไข',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${userNameHtml},</p>
            <p>เจ้าหน้าที่ได้ทำการแก้ไขเวลาใช้งานห้องของคุณ กรุณาตรวจสอบรายละเอียดใหม่ด้านล่าง</p>
            ${renderInfoCard([
                renderLabelValue('เวลาเดิม', `${formatThaiDateTime(oldStartTime)} - ${formatThaiTime(oldEndTime)}`)
            ], {
                borderColor: '#ef4444',
                backgroundColor: '#fef2f2'
            })}
            ${renderInfoCard([
                renderLabelValue('เวลาใหม่', `${startDateTime} - ${endTime}`),
                renderLabelValue('หัวข้อ', topicHtml),
                renderLabelValue('ห้อง', roomNameHtml)
            ], {
                borderColor: '#16a34a',
                backgroundColor: '#f0fdf4'
            })}
            <p style="margin-bottom: 0; color: #64748b;">หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่</p>
        `
    });

    return sendEmail(booking.user.email, subject, html);
};

const sendBookingCancelled = async (booking) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime,
        cancellationReasonHtml,
        cancelledByLabel
    } = getSafeBookingEmailDetails(booking);

    const subject = `การจองห้องถูกยกเลิก: ${topicText}`;
    const reasonSection = cancellationReasonHtml
        ? renderInfoCard([
            renderLabelValue('เหตุผลในการยกเลิก', cancellationReasonHtml)
        ], {
            borderColor: '#f97316',
            backgroundColor: '#fff7ed'
        })
        : '';

    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #ef4444, #dc2626)',
        title: 'การจองของคุณถูกยกเลิก',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${userNameHtml},</p>
            <p>รายการจองห้องของคุณถูกยกเลิกโดย${escapeHtml(cancelledByLabel)}</p>
            ${renderInfoCard([
                renderLabelValue('หัวข้อ', topicHtml),
                renderLabelValue('ห้อง', roomNameHtml),
                renderLabelValue('วันและเวลา', startDateTime)
            ], {
                borderColor: '#dc2626',
                backgroundColor: '#fef2f2'
            })}
            ${reasonSection}
            <p style="margin-bottom: 0; color: #64748b;">หากคุณไม่ได้เป็นผู้ดำเนินการ กรุณาติดต่อเจ้าหน้าที่</p>
        `
    });

    return sendEmail(booking.user.email, subject, html);
};

const sendBanNotification = async (user, reason) => {
    const safeUserName = escapeHtml(normalizeEmailText(user?.name, 'ผู้ใช้งาน'));
    const safeUserEmail = escapeHtml(normalizeEmailText(user?.email, ''));
    const safeReason = escapeHtml(normalizeEmailText(reason, ''));
    const subject = 'บัญชีของคุณถูกระงับการใช้งาน';
    const reasonSection = safeReason
        ? renderInfoCard([
            renderLabelValue('เหตุผล', safeReason)
        ], {
            borderColor: '#dc2626',
            backgroundColor: '#fef2f2'
        })
        : '';

    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        title: 'บัญชีถูกระงับการใช้งาน',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${safeUserName},</p>
            <p>บัญชีของคุณในระบบจองห้องถูกระงับการใช้งานโดยเจ้าหน้าที่</p>
            ${reasonSection}
            ${renderInfoCard([
                renderLabelValue('อีเมล', safeUserEmail),
                renderLabelValue('วันที่ระงับ', new Date().toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }))
            ])}
            <p style="margin-bottom: 0; color: #64748b;">หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่ประจำระบบ</p>
        `
    });

    return sendEmail(user.email, subject, html);
};

const sendUnbanNotification = async (user) => {
    const safeUserName = escapeHtml(normalizeEmailText(user?.name, 'ผู้ใช้งาน'));
    const safeUserEmail = escapeHtml(normalizeEmailText(user?.email, ''));
    const subject = 'บัญชีของคุณถูกปลดระงับแล้ว';
    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #16a34a, #15803d)',
        title: 'ปลดระงับบัญชีเรียบร้อยแล้ว',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${safeUserName},</p>
            <p>บัญชีของคุณได้รับการปลดระงับแล้ว และสามารถกลับเข้าใช้งานระบบได้ตามปกติ</p>
            ${renderInfoCard([
                renderLabelValue('อีเมล', safeUserEmail),
                renderLabelValue('วันที่ปลดระงับ', new Date().toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }))
            ], {
                borderColor: '#16a34a',
                backgroundColor: '#f0fdf4'
            })}
            <p style="margin-bottom: 0; color: #64748b;">กรุณาใช้งานระบบตามระเบียบที่กำหนด</p>
        `
    });

    return sendEmail(user.email, subject, html);
};

const sendAdminContactEmail = async ({ recipient, adminUser, subject, message }) => {
    const recipientName = escapeHtml(normalizeEmailText(recipient?.name || recipient?.email, 'ผู้ใช้งาน'));
    const adminName = escapeHtml(normalizeEmailText(adminUser?.name || adminUser?.email, 'ผู้ดูแลระบบ'));
    const adminEmail = escapeHtml(normalizeEmailText(adminUser?.email || process.env.EMAIL_USER, ''));
    const safeSubject = normalizeEmailText(subject, 'ข้อความจากผู้ดูแลระบบ');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

    const html = renderEmailLayout({
        accentColor: 'linear-gradient(135deg, #16a34a, #0f766e)',
        title: 'ข้อความจากผู้ดูแลระบบ',
        body: `
            <p style="margin-top: 0;">เรียนคุณ ${recipientName},</p>
            <p>ผู้ดูแลระบบได้ส่งข้อความถึงคุณผ่านระบบจัดการผู้ใช้งาน</p>
            ${renderInfoCard([
                renderLabelValue('หัวข้อ', escapeHtml(safeSubject))
            ])}
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
                <p style="margin: 0 0 8px; color: #0f172a; font-weight: 700;">ข้อความ</p>
                <p style="margin: 0; color: #334155; line-height: 1.8;">${safeMessage}</p>
            </div>
            ${renderInfoCard([
                renderLabelValue('ส่งโดย', adminName),
                renderLabelValue('อีเมลติดต่อกลับ', adminEmail)
            ], {
                borderColor: '#16a34a',
                backgroundColor: '#f0fdf4'
            })}
        `
    });

    return sendEmail(recipient.email, safeSubject, html, {
        replyTo: adminUser?.email || undefined
    });
};

module.exports = {
    sendBookingCreated,
    sendBookingApproved,
    sendBookingReminder,
    sendBookingModified,
    sendBookingCancelled,
    sendBanNotification,
    sendUnbanNotification,
    sendAdminContactEmail
};
