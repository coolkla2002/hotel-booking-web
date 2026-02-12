// server/index.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: [
        "http://localhost:5173",             
        "http://localhost:3001",             
        "http://127.0.0.1:3001",             
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

// ✅ แก้ไขส่วน Upload ให้รับได้หลายฟิลด์ (สลิป และ บัตรข้าราชการ)
const bookingUpload = upload.fields([
    { name: 'slip', maxCount: 1 },
    { name: 'gov_card', maxCount: 1 }
]);

// Database Connection
const db = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '3139LmZoDYQEp3K.root',
    password: 'vXF32FzROBw8ZqKw',
    database: 'test',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false 
    }
});

// --- API สำหรับซ่อมฐานข้อมูล ---

// ✅ [ใหม่] API ซ่อมฐานข้อมูลรองรับระบบข้าราชการ
app.get('/fix-gov-db', (req, res) => {
    const sql = `ALTER TABLE bookings 
                 ADD COLUMN gov_card_image VARCHAR(255) NULL,
                 ADD COLUMN user_type VARCHAR(50) DEFAULT 'general'`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.status(500).send(err.message);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ gov_card_image และ user_type เรียบร้อยแล้ว</h2>');
    });
});

// ✅ API ซ่อมฐานข้อมูล Users (เพิ่ม gender/birthdate)
app.get('/fix-database', (req, res) => {
    const sql = `
        ALTER TABLE users 
        ADD COLUMN gender VARCHAR(20) NULL, 
        ADD COLUMN birthdate DATE NULL
    `;
    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                return res.send('<h2 style="color:orange">⚠️ มีคอลัมน์ gender/birthdate อยู่แล้ว (ใช้งานได้เลย)</h2>');
            }
            return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        }
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ gender และ birthdate ให้เรียบร้อยแล้ว</h2>');
    });
});

// ✅ API ซ่อมฐานข้อมูล Rooms เพิ่มคอลัมน์ room_count
app.get('/fix-rooms-db', (req, res) => {
    const sql = "ALTER TABLE rooms ADD COLUMN room_count INT DEFAULT 15";
    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                return res.send('<h1 style="color:orange">⚠️ มีคอลัมน์ room_count อยู่แล้ว (ใช้งานได้เลย)</h1>');
            }
            return res.send(`<h1 style="color:red">❌ Error: ${err.message}</h1>`);
        }
        res.send('<h1 style="color:green">✅ เพิ่มคอลัมน์ room_count สำเร็จ!</h1>');
    });
});

// ✅ API สำหรับแจ้งขอยกเลิกการจอง (รับเหตุผล + รายละเอียดคืนเงิน + รูป QR)
app.post('/cancel-booking', upload.single('refund_image'), (req, res) => {
    const { booking_id, reason, refund_details } = req.body;
    const refund_image = req.file ? req.file.filename : null; // ชื่อไฟล์รูป (ถ้ามี)

    if (!booking_id) {
        return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const sql = `
        UPDATE bookings 
        SET 
            status = 'pending_cancel', 
            cancel_reason = ?, 
            refund_details = ?, 
            refund_image = ? 
        WHERE id = ?
    `;

    db.query(sql, [reason, refund_details, refund_image, booking_id], (err, result) => {
        if (err) {
            console.error("Error updating cancel request:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'ส่งคำขอยกเลิกเรียบร้อยแล้ว' });
    });
});

// ✅ API ซ่อมฐานข้อมูลรองรับการยกเลิก
app.get('/fix-cancel-db', (req, res) => {
    const sqlAddCols = `ALTER TABLE bookings 
                  ADD COLUMN refund_details TEXT NULL, 
                  ADD COLUMN refund_image VARCHAR(255) NULL`;
    const sqlFixEnum = `ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'upcoming', 'cancelled', 'pending_cancel', 'pending_reschedule') DEFAULT 'pending'`;

    db.query(sqlAddCols, (err) => {
        db.query(sqlFixEnum, (err2) => {
            if (err2) return res.status(500).send("Error updating ENUM: " + err2.message);
            res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์คืนเงินและขยายสถานะ Status (ENUM) เรียบร้อยแล้ว</h2>');
        });
    });
});

// ✅ API ซ่อมฐานข้อมูลสำหรับเลื่อนวัน
app.get('/fix-reschedule-db', (req, res) => {
    const sql = "ALTER TABLE bookings ADD COLUMN reschedule_slip VARCHAR(255) NULL";
    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                return res.send('<h2 style="color:orange">⚠️ มีคอลัมน์ reschedule_slip อยู่แล้ว</h2>');
            }
            return res.status(500).send(err.message);
        }
        res.send('<h2 style="color:green">✅ เพิ่มคอลัมน์ reschedule_slip สำเร็จ!</h2>');
    });
});

// --- ระบบ Login ---
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

// --- 1. จัดการ Users (Admin Only) ---
app.get('/users', (req, res) => {
    db.query('SELECT id, name, email, phone, role FROM users', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const sql = "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?";
    db.query(sql, [name, email, phone, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, message: 'User updated successfully' });
    });
});

app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
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
// server/index.js

// ✅ API ดึงข้อมูลห้องพักทั้งหมด
app.get('/rooms', (req, res) => {
    const sql = "SELECT * FROM rooms";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching rooms:", err);
            // ส่ง Error 500 กลับไปบอก Frontend ว่า Server พังเพราะอะไร
            return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        }
        
        // แปลงข้อมูล amenities จาก JSON String เป็น Array (ถ้ามี)
        const formattedResult = result.map(room => {
             // ถ้าฐานข้อมูลเก็บ amenities เป็น text เช่น "Wifi,TV" หรือ JSON string
             let amenities = [];
             try {
                 if(room.amenities) {
                     // พยายามแปลง JSON หรือถ้าเป็น string ธรรมดาก็ใช้ได้เลย
                     amenities = typeof room.amenities === 'string' && room.amenities.startsWith('[') 
                        ? JSON.parse(room.amenities) 
                        : room.amenities.split(','); 
                 }
             } catch(e) {
                 amenities = ['Free Wi-Fi', 'Air Conditioning']; // ค่า default กัน Error
             }

             return {
                 ...room,
                 amenities: Array.isArray(amenities) ? amenities : ['Free Wi-Fi', 'Air Conditioning']
             };
        });

        res.json(formattedResult);
    });
});

app.post('/rooms', upload.single('room_image'), (req, res) => {
    const { room_name, price, room_count } = req.body;
    const image_url = req.file ? req.file.filename : ''; 
    const count = room_count ? parseInt(room_count) : 15; 

    const sql = 'INSERT INTO rooms (name, price, room_count, image_url) VALUES (?, ?, ?, ?)';
    db.query(sql, [room_name, price, count, image_url], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Room added successfully' });
    });
});

app.put('/rooms/:id', upload.single('room_image'), (req, res) => {
    const { id } = req.params;
    const { room_name, price, room_count } = req.body;
    const count = room_count ? parseInt(room_count) : 15; 
    
    let sql = 'UPDATE rooms SET name=?, price=?, room_count=?';
    let params = [room_name, price, count];

    if (req.file) {
        sql += ', image_url=?'; 
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

// ✅ สมัครสมาชิก
app.post('/register', (req, res) => {
    const { name, email, password, phone } = req.body;
    const sqlCheck = "SELECT * FROM users WHERE email = ?";
    db.query(sqlCheck, [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length > 0) return res.status(400).json({ success: false, message: 'Email already taken' });

        const sqlInsert = "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)";
        db.query(sqlInsert, [name, email, password, String(phone)], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.status(200).json({ success: true, message: 'User registered successfully' });
        });
    });
});

// ✅ แก้ไขข้อมูลส่วนตัว (User)
app.put('/update-user', upload.single('profile_image'), (req, res) => {
    const { id, name, phone, gender, birthdate, password } = req.body;
    const validBirthdate = (!birthdate || birthdate === 'null' || birthdate === '') ? null : birthdate;
    
    let sql = "UPDATE users SET name=?, phone=?, gender=?, birthdate=?";
    let params = [name, String(phone), gender, validBirthdate];

    if (req.file) {
        sql += ", profile_image=?";
        params.push(req.file.filename);
    }
    if (password && password.trim() !== "") {
        sql += ", password=?";
        params.push(password);
    }
    sql += " WHERE id=?";
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);
        db.query("SELECT * FROM users WHERE id=?", [id], (e, r) => res.json({ success: true, user: r[0] }));
    });
});

// ✅ เช็คจำนวนห้องว่าง
app.get('/room-availability', (req, res) => {
    const { room_name } = req.query;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    db.query('SELECT room_count FROM rooms WHERE name = ?', [room_name], (err, roomResults) => {
        if (err) return res.status(500).json(err);
        const maxRooms = (roomResults.length > 0 && roomResults[0].room_count) ? roomResults[0].room_count : 15;

        const sql = `
            SELECT SUM(IFNULL(room_count, 1)) AS total_booked 
            FROM bookings 
            WHERE room_name = ? 
            AND status NOT IN ('cancelled', 'rejected')
            AND (DATE(check_in_date) <= ? AND DATE(check_out_date) > ?)
        `;

        db.query(sql, [room_name, today, today], (err, results) => {
            if (err) return res.status(500).json(err);
            const bookedCount = results[0].total_booked || 0;
            const available = maxRooms - bookedCount;

            res.json({ 
                room: room_name, 
                booked: bookedCount, 
                available: available < 0 ? 0 : available,
                total_rooms: maxRooms
            });
        });
    });
});

app.get('/bookings/occupied', (req, res) => {
    const { room_name } = req.query;
    db.query("SELECT check_in_date, check_out_date, room_count FROM bookings WHERE room_name = ? AND status NOT IN ('cancelled', 'rejected')", [room_name], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

// ✅ [แก้ไขใหม่] API รับการจอง รองรับระบบข้าราชการและบังคับสลิป
app.post('/bookings', bookingUpload, (req, res) => {
    // 1. ตรวจสอบว่ามี req.files หรือไม่ เพื่อป้องกัน TypeError
    if (!req.files) {
        return res.status(400).json({ success: false, message: 'กรุณาส่งข้อมูลแบบ FormData และแนบไฟล์ที่จำเป็น' });
    }

    const { user_id, room_id, room_name, price, check_in_date, check_out_date, payment_method, room_count, user_type } = req.body;
    
    // 2. ใช้ Optional Chaining (?.) เพื่อป้องกันการอ่านพร็อพเพอร์ตี้ของ undefined
    const payment_slip = req.files['slip'] ? req.files['slip'][0].filename : null; 
    const gov_card = req.files['gov_card'] ? req.files['gov_card'][0].filename : null;

    // 3. บังคับส่งสลิป (ตามที่คุณต้องการ)
    if (!payment_slip) {
        return res.status(400).json({ success: false, message: 'กรุณาแนบสลิปการโอนเงินเพื่อยืนยันการจอง' });
    }

    // --- ส่วนที่เหลือของ Logic เหมือนเดิม ---
    let finalPrice = parseFloat(price);
    if (user_type === 'official') {
        finalPrice = Math.max(0, finalPrice - 100);
    }

    const getRoomName = (callback) => {
        if (room_name) return callback(null, room_name);
        db.query('SELECT name FROM rooms WHERE id = ?', [room_id], (err, result) => {
            if (err) return callback(err);
            if (result.length === 0) return callback(new Error('Room not found'));
            callback(null, result[0].name);
        });
    };

    getRoomName((err, finalRoomName) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        const sql = `INSERT INTO bookings 
            (user_id, room_name, room_count, price, check_in_date, check_out_date, 
             status, payment_method, payment_slip, gov_card_image, user_type, created_at, booking_date) 
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())`;
        
        const params = [
            user_id, finalRoomName, parseInt(room_count) || 1, finalPrice, 
            check_in_date, check_out_date, payment_method || 'transfer',
            payment_slip, gov_card, user_type || 'general'
        ];

        db.query(sql, params, (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'บันทึกการจองสำเร็จ!', booking_id: result.insertId });
        });
    });
});

// ✅ 1. API ซ่อมฐานข้อมูล (เพิ่มคอลัมน์เหตุผลและตัวนับ)
app.get('/fix-reschedule-reason-db', (req, res) => {
    const sql = `ALTER TABLE bookings 
                 ADD COLUMN reschedule_reason TEXT NULL, 
                 ADD COLUMN reschedule_count INT DEFAULT 0`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.status(500).send(err.message);
        res.send('<h2 style="color:green">✅ เพิ่มคอลัมน์ reschedule_reason และ reschedule_count เรียบร้อย!</h2>');
    });
});

// ✅ 2. API ขอเลื่อนวัน (รับเป็น JSON)
app.post('/reschedule', (req, res) => {
    const { booking_id, new_check_in, new_check_out, reason } = req.body;

    if (!booking_id || !new_check_in || !reason) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    // เช็คก่อนว่าเคยเลื่อนครบกำหนดหรือยัง
    db.query('SELECT reschedule_count FROM bookings WHERE id = ?', [booking_id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
        
        if (results[0].reschedule_count >= 1) {
            return res.status(400).json({ success: false, message: 'รายการนี้ใช้สิทธิ์เลื่อนวันไปแล้ว' });
        }

        const sql = `UPDATE bookings SET 
                     status='pending_reschedule', 
                     request_check_in=?, 
                     request_check_out=?, 
                     reschedule_reason=? 
                     WHERE id=?`;
        
        db.query(sql, [new_check_in, new_check_out, reason, booking_id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'ส่งคำขอเลื่อนวันเรียบร้อยแล้ว' });
        });
    });
});

// ✅ 3. แก้ไข API อนุมัติเลื่อนวัน (ให้นับจำนวนครั้งด้วย)
app.post('/admin/approve-reschedule', (req, res) => {
    const { booking_id, action } = req.body; 
    
    if (action === 'approve') {
        // อัปเดตวันจริง = วันที่ขอมา, เพิ่มตัวนับ reschedule_count + 1, ล้างค่า request
        const sql = `UPDATE bookings SET 
                     check_in_date=request_check_in, 
                     check_out_date=request_check_out, 
                     reschedule_count = reschedule_count + 1,
                     status='upcoming', 
                     request_check_in=NULL, 
                     request_check_out=NULL, 
                     reschedule_reason=NULL 
                     WHERE id=?`;
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'อนุมัติการเลื่อนวันเรียบร้อย' });
        });
    } else {
        // ปฏิเสธ: แค่ล้างค่า request ออก กลับไปสถานะเดิม (upcoming/approved)
        const sql = `UPDATE bookings SET 
                     status='upcoming', 
                     request_check_in=NULL, 
                     request_check_out=NULL, 
                     reschedule_reason=NULL 
                     WHERE id=?`;
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'ปฏิเสธคำขอเรียบร้อย' });
        });
    }
});

// ✅ API เช็คห้องว่างแบบระบุวันและประเภทห้อง
app.get('/check-availability', (req, res) => {
    const { checkIn, checkOut, roomName } = req.query;
    const totalRooms = 15; // 🏨 กำหนดจำนวนห้องพักสูงสุดที่นี่ (15 ห้อง)

    const sql = `
        SELECT SUM(room_count) as booked_count 
        FROM bookings 
        WHERE room_name = ? 
        AND status IN ('approved', 'pending', 'upcoming')
        AND (
            (check_in_date < ? AND check_out_date > ?)
        )
    `;

    db.query(sql, [roomName, checkOut, checkIn], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const bookedCount = result[0].booked_count || 0;
        const availableRooms = totalRooms - bookedCount;
        
        // ถ้าห้องว่างติดลบ (จองเกิน) ให้เป็น 0
        res.json({ 
            available: availableRooms > 0 ? availableRooms : 0,
            total: totalRooms,
            booked: bookedCount
        });
    });
});

// ⚠️ แก้ไข API /bookings (POST) อันเดิม ให้รับ room_count
// ค้นหา app.post('/bookings', ...) อันเดิม แล้วแก้ SQL Insert ให้มี room_count
/*
  ตัวอย่าง SQL ใหม่:
  "INSERT INTO bookings (user_id, room_name, check_in_date, check_out_date, price, status, room_count) VALUES (?, ?, ?, ?, ?, ?, ?)"
  
  และใน array ค่าที่ส่งไป:
  [user_id, room_name, check_in, check_out, total_price, 'pending', room_count]
*/
// ✅ API ซ่อมฐานข้อมูล (รวมมิตรสำหรับระบบเลื่อนวัน)
// ก็อปปี้ไปวางใน server/index.js แล้วกด Save
app.get('/fix-reschedule-complete', (req, res) => {
    const queries = [
        "ALTER TABLE bookings ADD COLUMN reschedule_reason TEXT NULL",
        "ALTER TABLE bookings ADD COLUMN reschedule_count INT DEFAULT 0",
        "ALTER TABLE bookings ADD COLUMN request_check_in DATE NULL",
        "ALTER TABLE bookings ADD COLUMN request_check_out DATE NULL",
        "ALTER TABLE bookings ADD COLUMN request_price DECIMAL(10,2) NULL"
    ];

    let completed = 0;
    let errors = [];

    queries.forEach((sql) => {
        db.query(sql, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') {
                errors.push(err.message);
            }
            completed++;
            if (completed === queries.length) {
                if (errors.length > 0) {
                    res.send(`<h2 style="color:orange">⚠️ เสร็จสิ้นแบบมีแจ้งเตือน (คอลัมน์อาจมีอยู่แล้ว): <br/>${errors.join('<br/>')}</h2>`);
                } else {
                    res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์สำหรับระบบเลื่อนวันครบถ้วนแล้ว</h2>');
                }
            }
        });
    });
});

// ✅ จองห้องพัก (ปรับปรุงให้ใช้ Logic เดียวกัน)
app.post('/reserve', bookingUpload, (req, res) => {
    // ส่งต่อไปที่ /bookings เพื่อใช้ตรรกะเดียวกัน
    req.url = '/bookings';
    app.handle(req, res);
});

app.get('/my-bookings/:userId', (req, res) => {
    const sql = `SELECT bookings.*, users.name AS fullname, users.email AS email FROM bookings LEFT JOIN users ON bookings.user_id = users.id WHERE bookings.user_id = ? ORDER BY bookings.id DESC`;
    db.query(sql, [req.params.userId], (err, r) => {
        if (err) return res.status(500).json(err);
        res.json(r);
    });
});

app.get('/bookings', (req, res) => {
    const sql = `SELECT bookings.*, bookings.payment_slip AS slip_image, users.name AS fullname, users.email AS email FROM bookings LEFT JOIN users ON bookings.user_id = users.id ORDER BY bookings.id DESC`;
    db.query(sql, (err, r) => {
        if (err) return res.status(500).json(err);
        res.json(r);
    });
});

app.put('/updateBookingStatus', (req, res) => {
    const { id, status } = req.body;
    db.query("UPDATE bookings SET status = ? WHERE id = ?", [status, id], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

app.put('/cancel-booking', upload.single('refund_qr'), (req, res) => {
    const { booking_id, refund_details } = req.body;
    const refund_image = req.file ? req.file.filename : null;

    if (!booking_id) {
        return res.status(400).json({ success: false, message: 'ไม่พบ ID การจอง' });
    }

    const sql = "UPDATE bookings SET status = 'pending_cancel', refund_details = ?, refund_image = ? WHERE id = ?";
    db.query(sql, [refund_details, refund_image, booking_id], (err, result) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'ส่งคำขอเรียกเงินคืนแล้ว รอการอนุมัติจาก Admin' });
    });
});

// --- Reschedule System ---
app.post('/request-reschedule', upload.single('reschedule_slip'), (req, res) => {
    const { booking_id, new_check_in, new_check_out, new_price } = req.body;
    const reschedule_slip = req.file ? req.file.filename : null;

    const sql = "UPDATE bookings SET status='pending_reschedule', request_check_in=?, request_check_out=?, request_price=?, reschedule_slip=? WHERE id=?";
    db.query(sql, [new_check_in, new_check_out, new_price, reschedule_slip, booking_id], (err) => {
        if (err) {
            console.error("Reschedule Error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Request sent' });
    });
});

app.get('/admin/reschedule-requests', (req, res) => {
    const sql = `SELECT b.*, u.name as username FROM bookings b LEFT JOIN users u ON b.user_id = u.id WHERE b.status = 'pending_reschedule' ORDER BY b.id ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/admin/approve-reschedule', (req, res) => {
    const { booking_id, action } = req.body; 
    if (action === 'approve') {
        const sql = "UPDATE bookings SET check_in_date=request_check_in, check_out_date=request_check_out, price=IFNULL(request_price, price), status='upcoming', request_check_in=NULL, request_check_out=NULL, request_price=NULL, reschedule_slip=NULL WHERE id=?";
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'Approved' });
        });
    } else {
        const sql = "UPDATE bookings SET status='upcoming', request_check_in=NULL, request_check_out=NULL, request_price=NULL, reschedule_slip=NULL WHERE id=?";
        db.query(sql, [booking_id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'Rejected' });
        });
    }
});

app.post('/reset-password', (req, res) => {
    const email = req.body.email;
    const password = req.body.password || req.body.newPassword; 
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    db.query("UPDATE users SET password = ? WHERE email = ?", [password, email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        res.status(200).json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' });
    });
});

const port = process.env.PORT || 3001; 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});