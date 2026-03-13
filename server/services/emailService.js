const nodemailer = require('nodemailer');

// Validate email config
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EMAIL] Warning: EMAIL_USER or EMAIL_PASS not set in .env - emails will not be sent');
}

// Configure Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn(`[EMAIL] Skipped: Email not configured`);
        return;
    }
    try {
        await transporter.sendMail({
            from: `"Meeting Room Booking" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
    }
};

const sendBookingCreated = async (booking) => {
    const subject = `ได้รับคำขอจองห้องประชุม: ${booking.topic}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #16a34a;">ได้รับคำขอจองห้องประชุมเรียบร้อยแล้ว</h2>
            <p>เรียนคุณ ${booking.user.name},</p>
            <p>ระบบได้รับข้อมูลการจองห้องของคุณแล้ว และกำลังรอการพิจารณาอนุมัติจาก Admin</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>หัวข้อ:</strong> ${booking.topic}</p>
                <p><strong>ห้อง:</strong> ${booking.room ? booking.room.name : 'N/A'}</p>
                <p><strong>เวลาเริ่ม:</strong> ${new Date(booking.startTime).toLocaleString('th-TH')}</p>
                <p><strong>เวลาสิ้นสุด:</strong> ${new Date(booking.endTime).toLocaleString('th-TH')}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">คุณจะได้รับอีเมลแจ้งเตือนอีกครั้งเมื่อแอดมินอนุมัติการจอง</p>
        </div>
    `;
    await sendEmail(booking.user.email, subject, html);
};

const sendBookingApproved = async (booking) => {
    const subject = `✅ อนุมัติการจองห้องประชุม: ${booking.topic}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #16a34a;">การจองของคุณได้รับการอนุมัติแล้ว</h2>
            <p>เรียนคุณ ${booking.user.name},</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <p><strong>หัวข้อ:</strong> ${booking.topic}</p>
                <p><strong>ห้อง:</strong> ${booking.room ? booking.room.name : 'N/A'}</p>
                <p><strong>เวลา:</strong> ${new Date(booking.startTime).toLocaleString('th-TH')} - ${new Date(booking.endTime).toLocaleTimeString('th-TH')}</p>
            </div>

            <p>กรุณามาถึงก่อนเวลาเริ่มประชุม 5-10 นาที</p>
        </div>
    `;
    await sendEmail(booking.user.email, subject, html);
};

const sendBookingReminder = async (booking) => {
    const subject = `⏰ แจ้งเตือน: ใกล้ถึงเวลาประชุม ${booking.topic}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ea580c;">แจ้งเตือนใกล้ถึงเวลาประชุม</h2>
            <p>เรียนคุณ ${booking.user.name},</p>
            <p>การจองห้องประชุมของคุณกำลังจะเริ่มขึ้นในอีก 1 ชั่วโมง (หรือเร็วๆ นี้)</p>
            
            <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
                <p><strong>หัวข้อ:</strong> ${booking.topic}</p>
                <p><strong>ห้อง:</strong> ${booking.room ? booking.room.name : 'N/A'}</p>
                <p><strong>เวลา:</strong> ${new Date(booking.startTime).toLocaleString('th-TH')}</p>
            </div>
        </div>
    `;
    await sendEmail(booking.user.email, subject, html);
};

const sendBookingModified = async (booking, oldStartTime, oldEndTime) => {
    const subject = `🔄 เวลาจองห้องประชุมถูกแก้ไข: ${booking.topic}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">เวลาจองห้องประชุมของคุณถูกแก้ไข</h2>
            <p>เรียนคุณ ${booking.user.name},</p>
            <p>แอดมินได้ทำการแก้ไขเวลาจองห้องประชุมของคุณ กรุณาตรวจสอบรายละเอียดใหม่ด้านล่าง:</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="margin: 0 0 5px 0; color: #991b1b; font-weight: bold;">❌ เวลาเดิม (ยกเลิก)</p>
                <p style="margin: 0; text-decoration: line-through; color: #6b7280;">${new Date(oldStartTime).toLocaleString('th-TH')} - ${new Date(oldEndTime).toLocaleTimeString('th-TH')}</p>
            </div>

            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <p style="margin: 0 0 5px 0; color: #166534; font-weight: bold;">✅ เวลาใหม่</p>
                <p style="margin: 0; font-weight: bold; color: #166534;">${new Date(booking.startTime).toLocaleString('th-TH')} - ${new Date(booking.endTime).toLocaleTimeString('th-TH')}</p>
            </div>

            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>หัวข้อ:</strong> ${booking.topic}</p>
                <p><strong>ห้อง:</strong> ${booking.room ? booking.room.name : 'N/A'}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่</p>
        </div>
    `;
    await sendEmail(booking.user.email, subject, html);
};

const sendBookingCancelled = async (booking) => {
    const subject = `🚫 การจองห้องประชุมถูกยกเลิก: ${booking.topic}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #dc2626;">การจองห้องประชุมของคุณถูกยกเลิก</h2>
            <p>เรียนคุณ ${booking.user.name},</p>
            <p>การจองห้องประชุมของคุณถูกยกเลิกแล้ว (โดยคุณ หรือ Admin)</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p><strong>หัวข้อ:</strong> ${booking.topic}</p>
                <p><strong>ห้อง:</strong> ${booking.room ? booking.room.name : 'N/A'}</p>
                <p><strong>เวลา:</strong> ${new Date(booking.startTime).toLocaleString('th-TH')}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">หากเป็นการยกเลิกโดยที่คุณไม่ได้ทำรายการ กรุณาติดต่อเจ้าหน้าที่</p>
        </div>
    `;
    await sendEmail(booking.user.email, subject, html);
};

const sendBanNotification = async (user, reason) => {
    const subject = `🚫 บัญชีของคุณถูกระงับการใช้งาน`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px 20px; text-align: center;">
                <h2 style="color: #fff; margin: 0; font-size: 22px;">⚠️ บัญชีถูกระงับการใช้งาน</h2>
            </div>
            <div style="padding: 30px 24px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">เรียนคุณ ${user.name || 'ผู้ใช้งาน'},</p>
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">บัญชีของคุณในระบบจองห้องประชุม ภาควิชาคอมพิวเตอร์ศึกษา ถูกระงับการใช้งานโดยเจ้าหน้าที่</p>
                
                ${reason ? `
                <div style="background-color: #fef2f2; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 6px 0; color: #991b1b; font-weight: bold; font-size: 13px;">📋 เหตุผล:</p>
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">${reason}</p>
                </div>
                ` : ''}

                <div style="background-color: #f9fafb; padding: 16px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">📧 อีเมล: ${user.email}</p>
                    <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">📅 วันที่ระงับ: ${new Date().toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">หากคุณมีคำถามหรือต้องการอุทธรณ์ กรุณาติดต่อเจ้าหน้าที่ภาควิชาคอมพิวเตอร์ศึกษา</p>
            </div>
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">ระบบจองห้องประชุม — ภาควิชาคอมพิวเตอร์ศึกษา KMUTNB</p>
            </div>
        </div>
    `;
    await sendEmail(user.email, subject, html);
};

const sendUnbanNotification = async (user) => {
    const subject = `✅ บัญชีของคุณได้รับการปลดระงับแล้ว`;
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px 20px; text-align: center;">
                <h2 style="color: #fff; margin: 0; font-size: 22px;">✅ ปลดระงับบัญชีเรียบร้อยแล้ว</h2>
            </div>
            <div style="padding: 30px 24px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">เรียนคุณ ${user.name || 'ผู้ใช้งาน'},</p>
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">บัญชีของคุณได้รับการปลดระงับแล้ว คุณสามารถเข้าสู่ระบบจองห้องประชุมได้ตามปกติแล้ว</p>
                
                <div style="background-color: #f0fdf4; padding: 16px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #16a34a;">
                    <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">🎉 คุณสามารถเข้าสู่ระบบและจองห้องประชุมได้ตามปกติแล้ว</p>
                </div>

                <div style="background-color: #f9fafb; padding: 16px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">📧 อีเมล: ${user.email}</p>
                    <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">📅 วันที่ปลดระงับ: ${new Date().toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">กรุณาปฏิบัติตามระเบียบการใช้งานอย่างเคร่งครัด</p>
            </div>
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">ระบบจองห้องประชุม — ภาควิชาคอมพิวเตอร์ศึกษา KMUTNB</p>
            </div>
        </div>
    `;
    await sendEmail(user.email, subject, html);
};

module.exports = {
    sendBookingCreated,
    sendBookingApproved,
    sendBookingReminder,
    sendBookingModified,
    sendBookingCancelled,
    sendBanNotification,
    sendUnbanNotification
};
