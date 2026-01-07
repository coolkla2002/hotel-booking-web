// server/index.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(cors({
    origin: "http://localhost:5173", // อนุญาตให้หน้าเว็บที่รันในเครื่องคุณส่งข้อมูลมาได้
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

// Config Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = path.join(__dirname, 'uploads'); 
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'file-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });


// Database Connection
const db = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '3139LmZoDYQEp3K.root',
    password: 'vXF32FzROBw8ZqKw',
    database: 'test',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
  });
  


// --- API หลัก ---

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) res.json({ success: true, user: results[0], role: results[0].role });
        else res.status(401).json({ success: false, message: 'Login Failed' });
    });
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM admins WHERE email = ? AND password = ?", [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            const userRole = results[0].role || 'admin';
            res.json({ success: true, user: { ...results[0], role: userRole } });
        } else {
            res.status(401).json({ success: false, message: 'Admin not found' });
        }
    });
});

// ✅ ส่วน B: สมัครสมาชิก (ใช้ phone)
app.post('/register', (req, res) => {
    const { name, email, password, phone } = req.body;
    db.query(sqlCheck, [email], (err, results) => {
        // 1. ดักจับ Error ก่อน! ถ้ามีปัญหา ให้แจ้งเตือน ไม่ใช่พัง
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดที่ Database", error: err.message });
        }
    
        // 2. ถ้าไม่มี Error ค่อยเช็คผลลัพธ์
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }
    
        // ... ส่วนบันทึกข้อมูล (INSERT) ทำต่อด้านล่าง ...
    });
});

// ✅ ส่วน B (Updated): แก้ไขข้อมูลส่วนตัว + รหัสผ่าน + รูปโปรไฟล์ (ใช้ phone)
app.put('/update-user', upload.single('profile_image'), (req, res) => {
    const { id, name, phone, gender, birthdate, password } = req.body;
    const validBirthdate = (!birthdate || birthdate === 'null' || birthdate === '') ? null : birthdate;

    // สร้าง SQL แบบ Dynamic ตามค่าที่ส่งมา
    let sql = "UPDATE users SET name=?, phone=?, gender=?, birthdate=?";
    let params = [name, phone, gender, validBirthdate];

    // ถ้ามีการอัปรูปมาด้วย
    if (req.file) {
        sql += ", profile_image=?";
        params.push(req.file.filename);
    }

    // ถ้ามีการเปลี่ยนรหัสผ่าน
    if (password && password.trim() !== "") {
        sql += ", password=?";
        params.push(password);
    }

    sql += " WHERE id=?";
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);
        // ส่งข้อมูลล่าสุดกลับไปอัปเดตหน้าเว็บ
        db.query("SELECT * FROM users WHERE id=?", [id], (e, r) => res.json({ success: true, user: r[0] }));
    });
});

// --- Booking API ---

app.get('/bookings/occupied', (req, res) => {
    const { room_name } = req.query;
    db.query("SELECT check_in_date, check_out_date FROM bookings WHERE room_name = ? AND status NOT IN ('cancelled', 'rejected')", [room_name], (err, results) => {
        res.json(results || []);
    });
});

// ✅ ส่วน C: จองห้องพัก + กันจองซ้ำ + จัดการวันที่
app.post('/reserve', upload.single('slip'), (req, res) => {
    const { user_id, room_name, price, check_in_date, check_out_date, payment_method } = req.body;
    const payment_slip = req.file ? req.file.filename : null;
    
    // แปลงวันที่ให้เป็นมาตรฐาน YYYY-MM-DD เพื่อป้องกันบั๊กเวลา
    const checkIn = new Date(check_in_date).toISOString().split('T')[0];
    const checkOut = new Date(check_out_date).toISOString().split('T')[0];

    // 1. เช็คห้องว่าง (Overlap Check)
    const checkSql = "SELECT * FROM bookings WHERE room_name = ? AND status NOT IN ('cancelled', 'rejected') AND (check_in_date < ? AND check_out_date > ?)";
    
    db.query(checkSql, [room_name, checkOut, checkIn], (err, results) => {
        if (err) return res.status(500).json(err);
        
        // ถ้ามีรายการจองที่ทับซ้อนกัน
        if (results.length > 0) return res.status(400).json({ success: false, message: 'Room Occupied (ห้องไม่ว่างในช่วงเวลานี้)' });
        
        // 2. ถ้าว่าง ให้บันทึก
        // เพิ่ม booking_date เข้าไปในรายชื่อคอลัมน์ และเพิ่ม NOW() เข้าไปอีกตัวใน VALUES
// เปลี่ยน NOW() เป็น DATE_ADD(NOW(), INTERVAL 7 HOUR) เพื่อแก้เวลาไทย
const sql = "INSERT INTO bookings (user_id, room_name, price, check_in_date, check_out_date, status, payment_method, payment_slip, created_at, booking_date) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 7 HOUR), DATE_ADD(NOW(), INTERVAL 7 HOUR))";
        db.query(sql, [user_id, room_name, price, checkIn, checkOut, payment_method, payment_slip], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

app.get('/my-bookings/:userId', (req, res) => {
    db.query("SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC", [req.params.userId], (err, r) => res.json(r));
});

app.put('/cancel-booking', (req, res) => {
    db.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [req.body.booking_id], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

app.get('/bookings', (req, res) => {
    const sql = "SELECT *, payment_slip AS slip_image FROM bookings ORDER BY id DESC";
    db.query(sql, (err, r) => res.json(r));
});

app.put('/updateBookingStatus', (req, res) => {
    const { id, status } = req.body;
    db.query("UPDATE bookings SET status = ? WHERE id = ?", [status, id], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// --- Reschedule System ---

app.post('/request-reschedule', (req, res) => {
    const { booking_id, new_check_in, new_check_out, new_price } = req.body;
    const sql = "UPDATE bookings SET status='pending_reschedule', request_check_in=?, request_check_out=?, request_price=? WHERE id=?";
    db.query(sql, [new_check_in, new_check_out, new_price, booking_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Request sent' });
    });
});

app.get('/admin/reschedule-requests', (req, res) => {
    const sql = `
        SELECT b.*, u.name as username 
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id 
        WHERE b.status = 'pending_reschedule' 
        ORDER BY b.id ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/admin/approve-reschedule', (req, res) => {
    const { booking_id, action } = req.body; 
    if (action === 'approve') {
        const sql = "UPDATE bookings SET check_in_date=request_check_in, check_out_date=request_check_out, price=IFNULL(request_price, price), status='upcoming', request_check_in=NULL, request_check_out=NULL, request_price=NULL WHERE id=?";
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'Approved' });
        });
    } else {
        const sql = "UPDATE bookings SET status='upcoming', request_check_in=NULL, request_check_out=NULL, request_price=NULL WHERE id=?";
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'Rejected' });
        });
    }
});

const port = process.env.PORT || 3000; 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});