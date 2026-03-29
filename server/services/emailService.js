const nodemailer = require('nodemailer');

const SYSTEM_NAME = 'ระบบจัดการห้องอบรม';
const SYSTEM_UNIT = 'ภาควิชาคอมพิวเตอร์ศึกษา';
const SYSTEM_UNIVERSITY = 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ';
const SYSTEM_REPLY_NOTE = 'อีเมลฉบับนี้ถูกจัดส่งโดยอัตโนมัติจากระบบ';

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

const buildSubject = (title) => `[${SYSTEM_NAME}] ${title}`;

const getToneStyles = (tone = 'info') => {
    const toneMap = {
        info: {
            accent: '#1d4ed8',
            badgeBackground: '#eff6ff',
            badgeText: '#1d4ed8',
            sectionBorder: '#bfdbfe',
            sectionBackground: '#f8fbff'
        },
        success: {
            accent: '#15803d',
            badgeBackground: '#f0fdf4',
            badgeText: '#15803d',
            sectionBorder: '#bbf7d0',
            sectionBackground: '#f7fcf8'
        },
        warning: {
            accent: '#c2410c',
            badgeBackground: '#fff7ed',
            badgeText: '#c2410c',
            sectionBorder: '#fed7aa',
            sectionBackground: '#fffaf5'
        },
        danger: {
            accent: '#b91c1c',
            badgeBackground: '#fef2f2',
            badgeText: '#b91c1c',
            sectionBorder: '#fecaca',
            sectionBackground: '#fff8f8'
        },
        neutral: {
            accent: '#334155',
            badgeBackground: '#f8fafc',
            badgeText: '#334155',
            sectionBorder: '#cbd5e1',
            sectionBackground: '#fafcff'
        }
    };

    return toneMap[tone] || toneMap.info;
};

const renderRows = (rows = []) => rows.map(({ label, value, noGap = false }) => `
    <tr>
        <td style="padding: ${noGap ? '0' : '0 0 10px'}; vertical-align: top; width: 148px; color: #475569; font-size: 13px; font-weight: 600;">
            ${label}
        </td>
        <td style="padding: ${noGap ? '0' : '0 0 10px'}; vertical-align: top; color: #0f172a; font-size: 13px; line-height: 1.75;">
            ${value}
        </td>
    </tr>
`).join('');

const renderSection = ({
    title,
    rows = [],
    tone = 'info'
}) => {
    const styles = getToneStyles(tone);

    return `
        <div style="margin: 20px 0; border: 1px solid ${styles.sectionBorder}; border-radius: 14px; background-color: ${styles.sectionBackground}; overflow: hidden;">
            ${title ? `
                <div style="padding: 12px 18px; border-bottom: 1px solid ${styles.sectionBorder}; background-color: #ffffff;">
                    <p style="margin: 0; color: #0f172a; font-size: 13px; font-weight: 700;">${title}</p>
                </div>
            ` : ''}
            <div style="padding: 16px 18px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    ${renderRows(rows)}
                </table>
            </div>
        </div>
    `;
};

const renderParagraph = (text, withMarginBottom = true) => `
    <p style="margin: 0 0 ${withMarginBottom ? '12px' : '0'}; color: #334155; font-size: 14px; line-height: 1.85;">
        ${text}
    </p>
`;

const renderEmailLayout = ({
    tone = 'info',
    category,
    title,
    recipientName,
    intro,
    sections = [],
    note,
    replyNote
}) => {
    const styles = getToneStyles(tone);

    return `
        <div style="margin: 0; padding: 24px 0; background-color: #f5f7fb;">
            <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dbe1ea; border-radius: 18px; overflow: hidden;">
                <div style="padding: 22px 28px; background-color: #0f172a;">
                    <p style="margin: 0; color: rgba(255,255,255,0.76); font-size: 12px; letter-spacing: 0.08em;">
                        ${SYSTEM_UNIT}
                    </p>
                    <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        ${SYSTEM_NAME}
                    </h1>
                </div>

                <div style="padding: 28px;">
                    <div style="display: inline-block; padding: 6px 12px; border-radius: 999px; background-color: ${styles.badgeBackground}; color: ${styles.badgeText}; font-size: 12px; font-weight: 700; letter-spacing: 0.03em;">
                        ${category}
                    </div>

                    <h2 style="margin: 16px 0 12px; color: #0f172a; font-size: 24px; line-height: 1.45; font-weight: 700;">
                        ${title}
                    </h2>

                    ${renderParagraph(`เรียนคุณ ${recipientName}`)}
                    ${renderParagraph(intro)}

                    ${sections.join('')}

                    ${note ? renderParagraph(note, false) : ''}
                </div>

                <div style="padding: 16px 28px 20px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
                    <p style="margin: 0 0 6px; color: #475569; font-size: 12px; line-height: 1.7;">
                        ${SYSTEM_REPLY_NOTE}
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.7;">
                        ${replyNote || `${SYSTEM_NAME} ${SYSTEM_UNIT} ${SYSTEM_UNIVERSITY}`}
                    </p>
                </div>
            </div>
        </div>
    `;
};

const getSafeBookingEmailDetails = (booking = {}) => {
    const topicText = normalizeEmailText(booking.topic, 'รายการจองห้องอบรม');

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
            from: `"${SYSTEM_NAME}" <${process.env.EMAIL_USER}>`,
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

    return sendEmail(
        booking.user.email,
        buildSubject(`แจ้งรับคำขอจองห้องอบรม: ${topicText}`),
        renderEmailLayout({
            tone: 'info',
            category: 'แจ้งรับคำขอ',
            title: 'ระบบได้รับคำขอจองห้องอบรมเรียบร้อยแล้ว',
            recipientName: userNameHtml,
            intro: 'คำขอจองห้องอบรมของท่านถูกบันทึกเข้าสู่ระบบแล้ว และอยู่ระหว่างการพิจารณาจากเจ้าหน้าที่',
            sections: [
                renderSection({
                    title: 'รายละเอียดคำขอ',
                    tone: 'info',
                    rows: [
                        { label: 'หัวข้อ', value: topicHtml },
                        { label: 'ห้องอบรม', value: roomNameHtml },
                        { label: 'เวลาเริ่มใช้งาน', value: startDateTime },
                        { label: 'เวลาสิ้นสุด', value: endDateTime, noGap: true }
                    ]
                })
            ],
            note: 'เมื่อมีผลการพิจารณา ระบบจะแจ้งให้ท่านทราบทางอีเมลอีกครั้ง'
        })
    );
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

    return sendEmail(
        booking.user.email,
        buildSubject(`แจ้งผลการอนุมัติการจองห้องอบรม: ${topicText}`),
        renderEmailLayout({
            tone: 'success',
            category: 'อนุมัติการจอง',
            title: 'คำขอจองห้องอบรมของท่านได้รับการอนุมัติแล้ว',
            recipientName: userNameHtml,
            intro: 'เจ้าหน้าที่ได้อนุมัติคำขอของท่านเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียดการใช้งานด้านล่าง',
            sections: [
                renderSection({
                    title: 'รายละเอียดการใช้งาน',
                    tone: 'success',
                    rows: [
                        { label: 'หัวข้อ', value: topicHtml },
                        { label: 'ห้องอบรม', value: roomNameHtml },
                        { label: 'วันและเวลา', value: `${startDateTime} - ${endTime}`, noGap: true }
                    ]
                })
            ],
            note: 'กรุณามาถึงก่อนเวลาใช้งานประมาณ 5-10 นาที เพื่อความเรียบร้อยในการเข้าห้องอบรม'
        })
    );
};

const sendBookingReminder = async (booking) => {
    const {
        topicText,
        topicHtml,
        userNameHtml,
        roomNameHtml,
        startDateTime
    } = getSafeBookingEmailDetails(booking);

    return sendEmail(
        booking.user.email,
        buildSubject(`แจ้งเตือนกำหนดการใช้งานห้องอบรม: ${topicText}`),
        renderEmailLayout({
            tone: 'warning',
            category: 'แจ้งเตือนก่อนใช้งาน',
            title: 'ใกล้ถึงเวลาการใช้งานห้องอบรมของท่าน',
            recipientName: userNameHtml,
            intro: 'รายการจองห้องอบรมของท่านจะเริ่มใช้งานภายใน 1 ชั่วโมง กรุณาตรวจสอบข้อมูลก่อนเข้าห้องอบรม',
            sections: [
                renderSection({
                    title: 'รายละเอียดรายการจอง',
                    tone: 'warning',
                    rows: [
                        { label: 'หัวข้อ', value: topicHtml },
                        { label: 'ห้องอบรม', value: roomNameHtml },
                        { label: 'เวลาเริ่มใช้งาน', value: startDateTime, noGap: true }
                    ]
                })
            ],
            note: 'หากมีการเปลี่ยนแปลงหรือไม่สามารถเข้าใช้งานได้ กรุณาดำเนินการในระบบหรือติดต่อเจ้าหน้าที่โดยเร็ว'
        })
    );
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

    return sendEmail(
        booking.user.email,
        buildSubject(`แจ้งเปลี่ยนแปลงเวลาการใช้งานห้องอบรม: ${topicText}`),
        renderEmailLayout({
            tone: 'info',
            category: 'แก้ไขรายการจอง',
            title: 'มีการแก้ไขเวลาการใช้งานห้องอบรมของท่าน',
            recipientName: userNameHtml,
            intro: 'เจ้าหน้าที่ได้ปรับปรุงข้อมูลเวลาใช้งานห้องอบรมของท่าน กรุณาตรวจสอบรายละเอียดใหม่ด้านล่าง',
            sections: [
                renderSection({
                    title: 'ข้อมูลเดิม',
                    tone: 'danger',
                    rows: [
                        { label: 'วันและเวลาเดิม', value: `${formatThaiDateTime(oldStartTime)} - ${formatThaiTime(oldEndTime)}`, noGap: true }
                    ]
                }),
                renderSection({
                    title: 'ข้อมูลที่แก้ไขแล้ว',
                    tone: 'success',
                    rows: [
                        { label: 'หัวข้อ', value: topicHtml },
                        { label: 'ห้องอบรม', value: roomNameHtml },
                        { label: 'วันและเวลาใหม่', value: `${startDateTime} - ${endTime}`, noGap: true }
                    ]
                })
            ],
            note: 'หากข้อมูลดังกล่าวไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการตรวจสอบเพิ่มเติม'
        })
    );
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

    const sections = [
        renderSection({
            title: 'รายละเอียดรายการที่ถูกยกเลิก',
            tone: 'danger',
            rows: [
                { label: 'หัวข้อ', value: topicHtml },
                { label: 'ห้องอบรม', value: roomNameHtml },
                { label: 'วันและเวลา', value: startDateTime },
                { label: 'ผู้ดำเนินการยกเลิก', value: escapeHtml(cancelledByLabel), noGap: true }
            ]
        })
    ];

    if (cancellationReasonHtml) {
        sections.push(renderSection({
            title: 'เหตุผลประกอบการยกเลิก',
            tone: 'warning',
            rows: [
                { label: 'รายละเอียด', value: cancellationReasonHtml, noGap: true }
            ]
        }));
    }

    return sendEmail(
        booking.user.email,
        buildSubject(`แจ้งยกเลิกการจองห้องอบรม: ${topicText}`),
        renderEmailLayout({
            tone: 'danger',
            category: 'ยกเลิกรายการจอง',
            title: 'รายการจองห้องอบรมของท่านถูกยกเลิกแล้ว',
            recipientName: userNameHtml,
            intro: 'ระบบขอแจ้งให้ทราบว่ารายการจองห้องอบรมของท่านถูกยกเลิกเรียบร้อยแล้ว',
            sections,
            note: 'หากท่านไม่ได้เป็นผู้ดำเนินการ กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการตรวจสอบทันที'
        })
    );
};

const sendBanNotification = async (user, reason) => {
    const safeUserName = escapeHtml(normalizeEmailText(user?.name, 'ผู้ใช้งาน'));
    const safeUserEmail = escapeHtml(normalizeEmailText(user?.email, ''));
    const safeReason = escapeHtml(normalizeEmailText(reason, ''));
    const sections = [
        renderSection({
            title: 'ข้อมูลผู้ใช้งาน',
            tone: 'danger',
            rows: [
                { label: 'ชื่อผู้ใช้งาน', value: safeUserName },
                { label: 'อีเมล', value: safeUserEmail },
                {
                    label: 'วันที่ดำเนินการ',
                    value: new Date().toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    noGap: true
                }
            ]
        })
    ];

    if (safeReason) {
        sections.push(renderSection({
            title: 'เหตุผลในการระงับสิทธิ์',
            tone: 'warning',
            rows: [
                { label: 'รายละเอียด', value: safeReason, noGap: true }
            ]
        }));
    }

    return sendEmail(
        user.email,
        buildSubject('แจ้งระงับสิทธิ์การใช้งานระบบ'),
        renderEmailLayout({
            tone: 'danger',
            category: 'ระงับสิทธิ์การใช้งาน',
            title: 'บัญชีของท่านถูกระงับการใช้งานระบบ',
            recipientName: safeUserName,
            intro: 'เจ้าหน้าที่ได้ดำเนินการระงับสิทธิ์การใช้งานระบบจัดการห้องอบรมของท่าน',
            sections,
            note: 'หากมีข้อสงสัยเกี่ยวกับการดำเนินการดังกล่าว กรุณาติดต่อเจ้าหน้าที่ประจำระบบ'
        })
    );
};

const sendUnbanNotification = async (user) => {
    const safeUserName = escapeHtml(normalizeEmailText(user?.name, 'ผู้ใช้งาน'));
    const safeUserEmail = escapeHtml(normalizeEmailText(user?.email, ''));

    return sendEmail(
        user.email,
        buildSubject('แจ้งปลดระงับสิทธิ์การใช้งานระบบ'),
        renderEmailLayout({
            tone: 'success',
            category: 'ปลดระงับสิทธิ์',
            title: 'บัญชีของท่านได้รับการปลดระงับแล้ว',
            recipientName: safeUserName,
            intro: 'เจ้าหน้าที่ได้ปลดระงับสิทธิ์การใช้งานระบบของท่านเรียบร้อยแล้ว และท่านสามารถกลับเข้าใช้งานได้ตามปกติ',
            sections: [
                renderSection({
                    title: 'ข้อมูลผู้ใช้งาน',
                    tone: 'success',
                    rows: [
                        { label: 'ชื่อผู้ใช้งาน', value: safeUserName },
                        { label: 'อีเมล', value: safeUserEmail },
                        {
                            label: 'วันที่ดำเนินการ',
                            value: new Date().toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            noGap: true
                        }
                    ]
                })
            ],
            note: 'กรุณาใช้งานระบบตามระเบียบและข้อกำหนดที่เกี่ยวข้อง'
        })
    );
};

const sendAdminContactEmail = async ({ recipient, adminUser, subject, message }) => {
    const recipientName = escapeHtml(normalizeEmailText(recipient?.name || recipient?.email, 'ผู้ใช้งาน'));
    const adminName = escapeHtml(normalizeEmailText(adminUser?.name || adminUser?.email, 'ผู้ดูแลระบบ'));
    const adminEmail = escapeHtml(normalizeEmailText(adminUser?.email || process.env.EMAIL_USER, ''));
    const safeSubject = normalizeEmailText(subject, 'ข้อความจากผู้ดูแลระบบ');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

    return sendEmail(
        recipient.email,
        buildSubject(`ข้อความจากผู้ดูแลระบบ: ${safeSubject}`),
        renderEmailLayout({
            tone: 'neutral',
            category: 'ติดต่อจากผู้ดูแลระบบ',
            title: 'ท่านได้รับข้อความจากผู้ดูแลระบบห้องอบรม',
            recipientName,
            intro: 'ผู้ดูแลระบบได้ส่งข้อความถึงท่านผ่านระบบจัดการห้องอบรม กรุณาตรวจสอบรายละเอียดดังต่อไปนี้',
            sections: [
                renderSection({
                    title: 'หัวข้อข้อความ',
                    tone: 'neutral',
                    rows: [
                        { label: 'หัวข้อ', value: escapeHtml(safeSubject), noGap: true }
                    ]
                }),
                renderSection({
                    title: 'ข้อความ',
                    tone: 'neutral',
                    rows: [
                        { label: 'รายละเอียด', value: safeMessage, noGap: true }
                    ]
                }),
                renderSection({
                    title: 'ผู้ติดต่อ',
                    tone: 'info',
                    rows: [
                        { label: 'ชื่อผู้ดูแลระบบ', value: adminName },
                        { label: 'อีเมลติดต่อกลับ', value: adminEmail, noGap: true }
                    ]
                })
            ],
            note: 'หากต้องการติดต่อกลับ สามารถตอบกลับอีเมลฉบับนี้ได้โดยตรง',
            replyNote: `อีเมลนี้ตั้งค่าให้ตอบกลับไปยัง ${adminEmail}`
        }),
        {
            replyTo: adminUser?.email || undefined
        }
    );
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
