// server/index.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// --- ย้าย express.json มาไว้ตรงนี้ เพื่อให้ Server อ่านข้อมูลจากหน้าบ้านได้ (แก้ Error 500) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: [
        "http://localhost:5173", 
        "https://hotel-booking-web-eight.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

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
        // 🚩 แก้ไขตรงนี้: เปลี่ยน true เป็น false เพื่อป้องกัน Server ดับตอนเชื่อมต่อ Database
        rejectUnauthorized: false 
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

// ==========================================
// 📌 [NEW - EDITED] ส่วนจัดการ Admin Management (แก้ไขให้ตรงกับ DB เดิม)
// ==========================================

// --- 1. จัดการ Users (Admin Only) ---
app.get('/users', (req, res) => {
    // แก้ไข: เลือก column ให้ตรงกับตาราง users (id, name, email, phone, role)
    db.query('SELECT id, name, email, phone, role FROM users', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    // ป้องกันการลบ Super Admin (id 1)
    if (id == 1) return res.status(403).json({ message: "Cannot delete Super Admin" });

    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User deleted' });
    });
});

app.put('/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    db.query('UPDATE users SET role = ? WHERE id = ?', [role, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Role updated' });
    });
});

// --- 2. จัดการ Rooms (Admin Only) ---
// แก้ไข: ให้ใช้ column name, price, image_url ตาม Database เดิม

app.get('/rooms', (req, res) => {
    db.query('SELECT * FROM rooms', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/rooms', upload.single('room_image'), (req, res) => {
    // รับค่า room_name จากหน้าบ้าน แต่จะบันทึกลงช่อง name ใน DB
    const { room_name, price } = req.body;
    // หมายเหตุ: description และ guest_limit ถูกตัดออกเพราะ DB ไม่มีช่องเก็บ
    
    const image_url = req.file ? req.file.filename : ''; // บันทึกชื่อไฟล์ลง image_url

    // ✅ SQL แก้ให้ตรงกับตาราง rooms (name, price, image_url)
    const sql = 'INSERT INTO rooms (name, price, image_url) VALUES (?, ?, ?)';
    
    db.query(sql, [room_name, price, image_url], (err, result) => {
        if (err) {
            console.error("DB Insert Error:", err);
            return res.status(500).json(err);
        }
        res.json({ message: 'Room added successfully' });
    });
});

app.put('/rooms/:id', upload.single('room_image'), (req, res) => {
    const { id } = req.params;
    const { room_name, price } = req.body;
    
    // ✅ SQL แก้ให้ตรงกับตาราง rooms
    let sql = 'UPDATE rooms SET name=?, price=?';
    let params = [room_name, price];

    if (req.file) {
        sql += ', image_url=?'; // อัปเดตชื่อไฟล์รูป
        params.push(req.file.filename);
    }
    
    sql += ' WHERE id=?';
    params.push(id);

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Room updated' });
    });
});

app.delete('/rooms/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM rooms WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Room deleted' });
    });
});

// ==========================================
// 📌 [END NEW] จบส่วนจัดการ Admin Management
// ==========================================


// ✅ ส่วน B: สมัครสมาชิก (ใช้ phone)
app.post('/register', (req, res) => {
    const { name, email, password, phone } = req.body;

    // 1. สร้างตัวแปร sqlCheck เพื่อเช็คว่าอีเมลซ้ำไหม
    const sqlCheck = "SELECT * FROM users WHERE email = ?";
    
    db.query(sqlCheck, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already taken' });
        }

        // 2. ถ้าไม่ซ้ำ ให้บันทึกข้อมูล
        const sqlInsert = "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)";
        db.query(sqlInsert, [name, email, password, phone], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.status(200).json({ success: true, message: 'User registered successfully' });
        });
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

// ✅ API (แก้ไข): เช็คจำนวนห้องว่าง พร้อม Log ดูค่าใน Console
app.get('/room-availability', (req, res) => {
    const { room_name } = req.query;
    
    // 1. ระบุเวลาปัจจุบันแบบเจาะจงโซนไทย (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    console.log(`----- Checking Availability -----`);
    console.log(`Checking Room: ${room_name}`);
    console.log(`For Date: ${today}`);

    // 2. SQL Query แบบชัวร์ที่สุด (ใช้ DATE() ครอบเพื่อตัดเวลาทิ้ง เผื่อใน DB มีเวลาติดมา)
    const sql = `
        SELECT COUNT(*) AS count 
        FROM bookings 
        WHERE room_name = ? 
        AND status != 'cancelled'
        AND (DATE(check_in_date) <= ? AND DATE(check_out_date) > ?)
    `;

    db.query(sql, [room_name, today, today], (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json(err);
        }
        
        const bookedCount = results[0].count;
        const maxRooms = 15; 
        const available = maxRooms - bookedCount;

        console.log(`Found Booked: ${bookedCount} rooms`);
        console.log(`Available Left: ${available}`);
        console.log(`---------------------------------`);

        res.json({ 
            room: room_name, 
            booked: bookedCount, 
            available: available < 0 ? 0 : available
        });
    });
});

// --- Booking API ---

app.get('/bookings/occupied', (req, res) => {
    const { room_name } = req.query;
    db.query("SELECT check_in_date, check_out_date FROM bookings WHERE room_name = ? AND status NOT IN ('cancelled', 'rejected')", [room_name], (err, results) => {
        res.json(results || []);
    });
});

// ✅ ส่วน C (แก้ไข): จองห้องพัก + จำกัดห้องวันละ 15 ห้อง
app.post('/reserve', upload.single('slip'), (req, res) => {
    const { user_id, room_name, price, check_in_date, check_out_date, payment_method } = req.body;
    const payment_slip = req.file ? req.file.filename : null;
    
    // แปลงวันที่ให้เป็นมาตรฐาน YYYY-MM-DD เพื่อป้องกันบั๊กเวลา
    const checkIn = new Date(check_in_date).toISOString().split('T')[0];
    const checkOut = new Date(check_out_date).toISOString().split('T')[0];

    // 1. เช็คห้องว่าง (Overlap Check)
    // ดึงรายการจองทั้งหมดที่ทับซ้อนกับช่วงเวลานี้
    const checkSql = "SELECT * FROM bookings WHERE room_name = ? AND status NOT IN ('cancelled', 'rejected') AND (check_in_date < ? AND check_out_date > ?)";
    
    db.query(checkSql, [room_name, checkOut, checkIn], (err, results) => {
        if (err) return res.status(500).json(err);
        
        // --- แก้ไขตรงนี้: กำหนด LIMIT 15 ห้อง ---
        const MAX_ROOMS = 15; 
        
        // ถ้านับจำนวนการจองในช่วงเวลานี้ได้มากกว่าหรือเท่ากับ 15 ให้แจ้งเตือนว่าเต็ม
        if (results.length >= MAX_ROOMS) {
            return res.status(400).json({ 
                success: false, 
                message: `ขออภัย ห้อง ${room_name} ในช่วงวันที่เลือก เต็มแล้ว (ครบ ${MAX_ROOMS} ห้อง)` 
            });
        }
        
        // 2. ถ้ายังไม่ครบ 15 ให้บันทึก
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

// ✅ เพิ่ม API สำหรับตั้งรหัสผ่านใหม่ (Forgot Password)
app.post('/reset-password', (req, res) => {
    // ดึงค่ามาเช็คทั้ง password และ newPassword (เผื่อหน้าบ้านใช้ชื่อต่างกัน)
    const email = req.body.email;
    const password = req.body.password || req.body.newPassword; 

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    db.query("UPDATE users SET password = ? WHERE email = ?", [password, email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        }
        
        res.status(200).json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' });
    });
});

const port = process.env.PORT || 3000; 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});