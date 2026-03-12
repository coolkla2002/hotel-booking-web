const nodemailer = require('nodemailer');

// 1. ตั้งค่าบัญชีที่จะใช้ส่ง (Transporter)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'chakkrit.ma@rmuti.ac.th', // อีเมลของโรงแรม
        pass: 'xfghnamtgsqxqzvi'   // รหัสผ่าน 16 ตัวที่ได้จาก Google
    }
});

// 2. ฟังก์ชันสำหรับส่งอีเมล
const sendEmail = async (toEmail, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: '"RCBAT Hotel" <chakkrit.ma@rmuti.ac.th>', // ชื่อคนส่ง
            to: toEmail,                                   // อีเมลลูกค้า
            subject: subject,                              // หัวข้ออีเมล
            html: htmlContent                              // เนื้อหาอีเมล (เขียนเป็น HTML ได้เพื่อให้สวยงาม)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('ส่งอีเมลสำเร็จ:', info.response);
        return true;
    } catch (error) {
        console.error('ส่งอีเมลไม่สำเร็จ:', error);
        return false;
    }
};

module.exports = sendEmail;