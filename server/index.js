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
// ✅ [อัปเดตสำหรับ hotel_db_new] เปลี่ยนชื่อฐานข้อมูล
const db = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '3139LmZoDYQEp3K.root',
    password: 'vXF32FzROBw8ZqKw',
    database: 'hotel_db_new', // <-- แก้ตรงนี้เป็น Database ใหม่
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false 
    }
});

// --- API สำหรับซ่อมฐานข้อมูล ---

// ✅ API ซ่อมฐานข้อมูล เพิ่มคอลัมน์ method ให้ตาราง Payment
app.get('/fix-payment-method', (req, res) => {
    const sql = `ALTER TABLE Payment ADD COLUMN method VARCHAR(50) DEFAULT 'transfer'`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        }
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ method ให้ตาราง Payment เรียบร้อยแล้ว! ลุยต่อเลย!</h2>');
    });
});

// ✅ API ซ่อมฐานข้อมูล เพิ่มคอลัมน์ booking_date
app.get('/fix-booking-date', (req, res) => {
    const sql = `ALTER TABLE Booking ADD COLUMN booking_date DATETIME DEFAULT CURRENT_TIMESTAMP`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        }
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ booking_date ให้ตาราง Booking เรียบร้อยแล้ว!</h2>');
    });
});

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

// ✅ API ซ่อมฐานข้อมูล Users (อันเก่า)
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

// ✅ [เพิ่มใหม่] API สำหรับอัปเดตตาราง Customer (เพิ่ม sex, birthdate, profile_image)
app.get('/fix-customer-db', (req, res) => {
    const sql = `
        ALTER TABLE Customer 
        ADD COLUMN sex VARCHAR(20) NULL, 
        ADD COLUMN birthdate DATE NULL,
        ADD COLUMN profile_image VARCHAR(255) NULL
    `;
    db.query(sql, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                return res.send('<h2 style="color:orange">⚠️ มีคอลัมน์พวกนี้ในตาราง Customer อยู่แล้ว ลุยต่อได้เลย!</h2>');
            }
            return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        }
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ sex, birthdate และ profile_image ให้ตาราง Customer เรียบร้อยแล้ว!</h2>');
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

// ✅ อัปเดต API ขอยกเลิกการจอง (เพิ่ม Console.log และเผื่อชื่อ Field ไม่ตรง)
app.post('/cancel-booking', upload.fields([
    { name: 'refund_image', maxCount: 1 }, 
    { name: 'refund_qr', maxCount: 1 } // เผื่อหน้าเว็บส่งมาชื่อนี้
]), (req, res) => {
    console.log("🛑 [Cancel] ข้อมูล Text ที่ส่งมา:", req.body);
    console.log("🛑 [Cancel] ไฟล์ที่ส่งมา:", req.files);

    // ดึงข้อมูลเผื่อ Frontend ใช้ชื่อตัวแปรต่างกัน
    const booking_id = req.body.booking_id || req.body.id;
    const reason = req.body.reason || req.body.cancel_reason;
    const refund_details = req.body.refund_details || req.body.bank_account; 
    
    // เช็คว่ารูปส่งมาในชื่อ refund_image หรือ refund_qr
    let refund_image = null;
    if (req.files && req.files['refund_image']) {
        refund_image = req.files['refund_image'][0].filename;
    } else if (req.files && req.files['refund_qr']) {
        refund_image = req.files['refund_qr'][0].filename;
    }

    if (!booking_id) {
        return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const sql = `
        UPDATE Booking 
        SET 
            booking_status = 'pending_cancel', 
            cancel_reason = ?, 
            refund_details = ?, 
            refund_image = ? 
        WHERE booking_id = ?
    `;

    db.query(sql, [reason, refund_details, refund_image, booking_id], (err, result) => {
        if (err) {
            console.error("❌ Error updating cancel request:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'ส่งคำขอยกเลิกเรียบร้อยแล้ว' });
    });
});

// ✅ API ซ่อมฐานข้อมูลสำหรับการยกเลิก (รันครั้งเดียว)
app.get('/fix-cancel-booking-db', (req, res) => {
    const sql = `ALTER TABLE Booking 
                 ADD COLUMN cancel_reason TEXT NULL, 
                 ADD COLUMN refund_details TEXT NULL, 
                 ADD COLUMN refund_image VARCHAR(255) NULL`;
    
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        }
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์สำหรับการยกเลิกให้ตาราง Booking แล้ว ลุยต่อได้เลย!</h2>');
    });
});

// ✅ API ซ่อมฐานข้อมูลสำหรับเลื่อนวัน
app.get('/fix-reschedule-db', (req, res) => {
    const sql = "ALTER TABLE Booking ADD COLUMN reschedule_slip VARCHAR(255) NULL";
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
// ✅ [อัปเดตสำหรับ hotel_db_new] ระบบ Login ลูกค้า
app.post('/login', (req, res) => {
    // ✅ เปลี่ยนมารับค่าแบบนี้ เพื่อให้รองรับไม่ว่าหน้าเว็บจะส่งมาเป็นชื่อ email หรือ username
    const email = req.body.email || req.body.username; 
    const password = req.body.password; 

    // ✅ เช็กก่อนว่าส่งอีเมลกับรหัสผ่านมาครบไหม (ถ้าไม่ครบให้แจ้งเตือน จะได้ไม่ติด Error แปลกๆ)
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    const sql = `
        SELECT 
            u.user_id AS id, 
            u.username AS email, 
            u.role, 
            c.name, 
            c.phone,
            c.sex AS gender,
            c.birthdate
        FROM UserAccount u
        LEFT JOIN Customer c ON u.user_id = c.user_id
        WHERE u.username = ? AND u.password = ?
    `;
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json(err);
        
        if (results.length > 0) {
            res.json({ success: true, user: results[0], role: results[0].role });
        } else {
            res.status(401).json({ success: false, message: 'Login Failed' });
        }
    });
});

// ✅ [อัปเดตสำหรับ hotel_db_new] ระบบ Login แอดมิน
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    const sql = `
        SELECT ua.user_id AS id, ua.username AS email, ua.role, a.name 
        FROM UserAccount ua 
        JOIN Admin a ON ua.user_id = a.user_id 
        WHERE ua.username = ? AND ua.password = ? AND ua.role != 'customer'
    `;
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: 'Admin not found' });
        }
    });
});

// ==========================================
// --- 1. จัดการ Users (Admin Only) [อัปเดตใหม่] ---
// ==========================================

// ==========================================
// ✅ จัดการข้อมูลลูกค้าและแอดมิน (Admin Management)
// ==========================================

app.get('/users', (req, res) => {
    // ✅ เพิ่ม c.sex AS gender และ c.birthdate เข้าไปใน SELECT
    const sql = `
        SELECT 
            ua.user_id AS id, 
            COALESCE(c.name, a.name, 'ไม่ระบุชื่อ') AS name, 
            ua.username AS email, 
            COALESCE(c.phone, '') AS phone, 
            c.sex AS gender,
            c.birthdate,
            ua.role 
        FROM UserAccount ua
        LEFT JOIN Customer c ON ua.user_id = c.user_id
        LEFT JOIN Admin a ON ua.user_id = a.user_id
        ORDER BY ua.user_id DESC
    `;
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        res.json(data);
    });
});

app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    // ✅ เพิ่มการรับค่า gender และ birthdate จาก req.body
    const { name, email, phone, password, gender, birthdate } = req.body;
    
    // 1. อัปเดต UserAccount (อัปเดต Username และ รหัสผ่านถ้ามีการกรอกเข้ามาใหม่)
    let sqlAcc = "UPDATE UserAccount SET username = ?";
    let paramsAcc = [email];
    
    if (password && password.trim() !== "") {
        sqlAcc += ", password = ?";
        paramsAcc.push(password);
    }
    sqlAcc += " WHERE user_id = ?";
    paramsAcc.push(id);
    
    db.query(sqlAcc, paramsAcc, (err) => {
        if (err) {
            console.error("❌ Update UserAccount Error:", err);
            return res.status(500).json(err);
        }
        
        // ✅ แปลงค่า birthdate ให้เป็น null หากถูกส่งมาเป็นค่าว่าง เพื่อป้องกัน Error จากฐานข้อมูล
        const validBirthdate = (!birthdate || birthdate === '') ? null : birthdate;

        // 2. อัปเดตตาราง Customer (เพิ่ม sex และ birthdate เข้าไปในคำสั่ง UPDATE)
        db.query("UPDATE Customer SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), sex = COALESCE(?, sex), birthdate = COALESCE(?, birthdate) WHERE user_id = ?", 
        [name || null, email, phone || null, gender || null, validBirthdate, id], (err) => {
            if (err) {
                console.error("❌ Update Customer Error:", err);
                return res.status(500).json(err);
            }
            res.json({ success: true, message: 'User updated successfully' });
        });
    });
});

app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    if (id == 1) return res.status(403).json({ message: "Cannot delete Super Admin" });
    
    // ✅ แก้ไข: เพิ่มการดักจับ (err) ในทุกระดับ เพื่อให้รู้ว่าพังที่ตารางไหน
    db.query('DELETE FROM Customer WHERE user_id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        
        db.query('DELETE FROM Admin WHERE user_id = ?', [id], (err) => {
            if (err) return res.status(500).json(err);
            
            db.query('DELETE FROM UserAccount WHERE user_id = ?', [id], (err) => {
                if (err) return res.status(500).json(err);
                
                res.json({ message: 'User deleted' });
            });
        });
    });
});

app.put('/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    db.query('UPDATE UserAccount SET role = ? WHERE user_id = ?', [role, id], (err) => {
        if (err) {
            console.error("❌ Update Role Error:", err);
            return res.status(500).json(err);
        }
        res.json({ message: 'Role updated' });
    });
});

// --- 2. จัดการ Rooms (Admin Only) ---

// ✅ API ดึงข้อมูลห้องพักทั้งหมด
app.get('/rooms', (req, res) => {
    const sql = `
        SELECT 
            rt.room_type_id AS id, 
            rt.typename AS name, 
            rt.price, 
            rt.picture AS image_url,
            rt.amenities, -- ✅ 1. สั่งให้ดึงคอลัมน์ amenities ออกมาจากฐานข้อมูล
            COUNT(r.room_id) AS room_count 
        FROM RoomType rt
        LEFT JOIN Room r ON rt.room_type_id = r.room_type_id
        GROUP BY rt.room_type_id
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        
        const formattedResult = result.map(room => ({
            ...room,
            // ✅ 2. ลบที่ฟิกซ์ค่าตายตัวออก และเปลี่ยนมาใช้ค่าที่ดึงมาจากฐานข้อมูลแทน
            amenities: room.amenities || '' 
        }));

        res.json(formattedResult);
    });
});

app.post('/rooms', upload.single('room_image'), (req, res) => {
    const { room_name, price, room_count } = req.body;
    const image_url = req.file ? req.file.filename : ''; 
    const count = room_count ? parseInt(room_count) : 15; 

    // 1. สร้างประเภทห้อง (RoomType)
    const sqlRoomType = 'INSERT INTO RoomType (typename, price, picture) VALUES (?, ?, ?)';
    db.query(sqlRoomType, [room_name, price, image_url], (err, result) => {
        if (err) return res.status(500).json(err);
        
        const newRoomTypeId = result.insertId;
        
        // 2. สร้างห้องพักจริง (Room) จำนวนตามที่ระบุ (Bulk Insert)
        let roomValues = [];
        for(let i=1; i<=count; i++) {
            roomValues.push([`R${newRoomTypeId}-${String(i).padStart(2, '0')}`, 2, 'available', newRoomTypeId, image_url]);
        }
        
        const sqlRooms = 'INSERT INTO Room (roomnumber, capacity, status, room_type_id, picture) VALUES ?';
        db.query(sqlRooms, [roomValues], (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Room added successfully' });
        });
    });
});

app.put('/rooms/:id', upload.single('room_image'), (req, res) => {
    const { id } = req.params;
    // ✅ 1. รับค่า amenities เพิ่มเข้ามาจาก req.body
    const { room_name, price, room_count, amenities } = req.body; 
    
    // ✅ 2. เพิ่ม amenities=? ในคำสั่ง SQL
    let sql = 'UPDATE RoomType SET typename=?, price=?, amenities=?';
    let params = [room_name, price, amenities]; // ใส่ amenities เข้าไปใน params

    if (req.file) {
        sql += ', picture=?'; 
        params.push(req.file.filename);
    }
    sql += ' WHERE room_type_id=?';
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);
        
        // ถ้ามีการอัปเดตรูป ให้ไปอัปเดตรูปในห้องย่อยด้วย
        if (req.file) {
            db.query('UPDATE Room SET picture=? WHERE room_type_id=?', [req.file.filename, id]);
        }

        // ==========================================
        // ✅ ระบบจัดการเพิ่ม/ลดจำนวนห้องแบบอัตโนมัติ
        // ==========================================
        if (room_count) {
            const targetCount = parseInt(room_count);
            
            // 1. นับจำนวนห้องที่มีอยู่ในระบบปัจจุบัน
            db.query('SELECT COUNT(*) as current_count FROM Room WHERE room_type_id=?', [id], (err2, countRes) => {
                if (err2) return res.json({ message: 'Room updated but failed to check count' });
                
                const currentCount = countRes[0].current_count || 0;
                
                if (targetCount > currentCount) {
                    // 📌 กรณีที่ 1: แอดมินเพิ่มจำนวนห้อง -> ต้อง Insert ห้องย่อยเข้าไปเพิ่ม
                    const diff = targetCount - currentCount;
                    let roomValues = [];
                    const picToUse = req.file ? req.file.filename : null; 
                    
                    for(let i=1; i<=diff; i++) {
                        // สร้างเลขห้องแบบสุ่มเพื่อไม่ให้ซ้ำกัน
                        const newRoomNum = `R${id}-${Date.now().toString().slice(-4)}-${i}`;
                        roomValues.push([newRoomNum, 2, 'available', id, picToUse]);
                    }
                    
                    const sqlInsert = 'INSERT INTO Room (roomnumber, capacity, status, room_type_id, picture) VALUES ?';
                    db.query(sqlInsert, [roomValues], (err3) => {
                        return res.json({ message: 'Room updated successfully (Added new rooms)' });
                    });
                    
                } else if (targetCount < currentCount) {
                    // 📌 กรณีที่ 2: แอดมินลดจำนวนห้อง -> ต้อง Delete ห้องส่วนเกินทิ้ง (ลบเฉพาะห้องที่ยังว่างอยู่)
                    const diff = currentCount - targetCount;
                    const sqlDelete = "DELETE FROM Room WHERE room_type_id=? AND status='available' ORDER BY room_id DESC LIMIT ?";
                    db.query(sqlDelete, [id, diff], (err4) => {
                        return res.json({ message: 'Room updated successfully (Removed some rooms)' });
                    });
                } else {
                    // 📌 กรณีที่ 3: จำนวนเท่าเดิม -> ไม่ต้องทำอะไร
                    return res.json({ message: 'Room updated successfully' });
                }
            });
        } else {
            res.json({ message: 'Room updated' });
        }
    });
});

app.delete('/rooms/:id', (req, res) => {
    const { id } = req.params;
    // ต้องลบห้องจริงย่อยๆ ก่อน (กัน Error Foreign Key) แล้วค่อยลบประเภทห้อง
    db.query('DELETE FROM Room WHERE room_type_id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        db.query('DELETE FROM RoomType WHERE room_type_id = ?', [id], (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Room deleted' });
        });
    });
});

// ==========================================
// ✅ API สมัครสมาชิก (รับค่า เพศ และ วันเกิด เพิ่มเติม)
// ==========================================
app.post('/register', (req, res) => {
    // 1. รับค่า gender และ birthdate เพิ่มเข้ามาจาก req.body
    const { fullname, phone, email, password, gender, birthdate } = req.body; 

    // ตรวจสอบข้อมูลบังคับกรอก (ไม่บังคับเพศและวันเกิด เผื่อผู้ใช้ไม่กรอก)
    if (!fullname || !phone || !email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // เช็กว่าอีเมลซ้ำไหม
    db.query("SELECT * FROM UserAccount WHERE username = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.length > 0) return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        // สร้างบัญชีผู้ใช้
        db.query("INSERT INTO UserAccount (username, password, role) VALUES (?, ?, ?)", [email, password, 'customer'], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error creating account' });

            const userId = result.insertId;
            
            // 2. ✅ เพิ่มคอลัมน์ gender และ birthdate ลงในคำสั่ง INSERT
            const sqlInsertCustomer = "INSERT INTO Customer (user_id, name, phone, sex, birthdate) VALUES (?, ?, ?, ?, ?)";
            
            db.query(sqlInsertCustomer, [userId, fullname, phone, gender || null, birthdate || null], (err, result) => {
                if (err) {
                    // ถ้าพัง ให้ลบบัญชีที่สร้างไปเมื่อกี้ทิ้งด้วย (Rollback)
                    db.query("DELETE FROM UserAccount WHERE user_id = ?", [userId]);
                    return res.status(500).json({ success: false, message: 'Error creating profile' });
                }
                res.json({ success: true, message: 'สมัครสมาชิกสำเร็จ' });
            });
        });
    });
});

// ==========================================
// ✅ แก้ไขข้อมูลส่วนตัว (User Profile) [อัปเดตใหม่]
// ==========================================
// ลบ upload.single('profile_image') ออก เพราะเราเปลี่ยนมาส่งเป็น JSON ธรรมดาแล้ว
app.put('/update-user', (req, res) => {
    console.log("📥 [1] เริ่มรับข้อมูลแก้ไขโปรไฟล์ (JSON):", req.body);
    
    // รับค่าทั้งหมดที่ส่งมาจาก Frontend รวมถึง gender และ birthdate
    const { id, name, phone, gender, birthdate, password } = req.body;
    
    if (!id) {
        console.error("❌ [Error] ไม่พบ user_id ในคำขอ");
        return res.status(400).json({ success: false, message: "ไม่พบ User ID" });
    }

    // แปลง birthdate: ถ้าเป็นค่าว่างให้เป็น null เพื่อไม่ให้ฐานข้อมูล Error
    const validBirthdate = (!birthdate || birthdate === '') ? null : birthdate;

    // อัปเดตข้อมูล name, phone, sex (gender), และ birthdate ลงตาราง Customer
    const sqlCustomer = "UPDATE Customer SET name=?, phone=?, sex=?, birthdate=? WHERE user_id=?";
    const paramsCustomer = [name, String(phone), gender, validBirthdate, id];

    console.log("⏳ [2] กำลังอัปเดตตาราง Customer...");
    db.query(sqlCustomer, paramsCustomer, (err) => {
        if (err) {
            console.error("❌ [Error 1] อัปเดตตาราง Customer พัง:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดต Customer พัง", error: err.message });
        }
        
        console.log("✅ [3] อัปเดตตาราง Customer สำเร็จ!");

        if (password && password.trim() !== "") {
            console.log("⏳ [4] กำลังอัปเดตรหัสผ่าน...");
            db.query("UPDATE UserAccount SET password=? WHERE user_id=?", [password, id], (err2) => {
                if (err2) {
                    console.error("❌ [Error 2] อัปเดตรหัสผ่านพัง:", err2.message);
                    return res.status(500).json({ success: false, message: "อัปเดตรหัสผ่านพัง", error: err2.message });
                }
                console.log("✅ [5] อัปเดตรหัสผ่านสำเร็จ!");
                fetchUpdatedUser(id, res);
            });
        } else {
            fetchUpdatedUser(id, res);
        }
    });

    function fetchUpdatedUser(userId, res) {
        console.log("⏳ [6] กำลังดึงข้อมูลผู้ใช้ที่อัปเดตแล้วกลับไปให้หน้าเว็บ...");
        
        // เพิ่ม c.sex AS gender และ c.birthdate เข้าไปใน SELECT เพื่อส่งค่ากลับไปให้ Frontend โชว์
        const fetchSql = `
            SELECT ua.user_id AS id, ua.username AS email, ua.role, c.name, c.phone, c.sex AS gender, c.birthdate
            FROM UserAccount ua 
            JOIN Customer c ON ua.user_id = c.user_id 
            WHERE ua.user_id=?
        `;
        
        db.query(fetchSql, [userId], (e, r) => {
            if (e) {
                console.error("❌ [Error 3] ดึงข้อมูล User พัง:", e.message);
                return res.status(500).json({ success: false, message: "ดึงข้อมูลล้มเหลว", error: e.message });
            }
            console.log("🎉 [7] เสร็จสิ้นกระบวนการ! ส่งข้อมูลกลับสำเร็จ");
            res.json({ success: true, user: r[0] });
        });
    }
});

// ✅ เช็คจำนวนห้องว่าง
app.get('/room-availability', (req, res) => {
    const { room_name } = req.query;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // 1. นับจำนวนห้องพักทั้งหมดที่มีของประเภทนี้
    db.query('SELECT COUNT(*) as total_rooms FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ?', [room_name], (err, roomRes) => {
        if (err) return res.status(500).json(err);
        const maxRooms = roomRes[0].total_rooms || 0;

        // 2. เช็คการจองที่ทับซ้อนกับวันนี้
        const sql = `
            SELECT SUM(IFNULL(b.room_count, 1)) AS total_booked 
            FROM Booking b 
            JOIN Room r ON b.room_id = r.room_id
            JOIN RoomType rt ON r.room_type_id = rt.room_type_id
            WHERE rt.typename = ? 
            AND b.booking_status NOT IN ('cancelled', 'rejected')
            AND (DATE(b.check_in_date) <= ? AND DATE(b.check_out_date) > ?)
        `;

        db.query(sql, [room_name, today, today], (err, results) => {
            if (err) return res.status(500).json(err);
            const bookedCount = results[0].total_booked || 0;
            const available = maxRooms - bookedCount;

            res.json({ 
                room: room_name, booked: bookedCount, 
                available: available < 0 ? 0 : available, total_rooms: maxRooms
            });
        });
    });
});

app.get('/bookings/occupied', (req, res) => {
    const { room_name } = req.query;
    const sql = `
        SELECT b.check_in_date, b.check_out_date, b.room_count 
        FROM Booking b 
        JOIN Room r ON b.room_id = r.room_id
        JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        WHERE rt.typename = ? AND b.booking_status NOT IN ('cancelled', 'rejected')
    `;
    db.query(sql, [room_name], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

// ==========================================
// ✅ [อัปเดตใหม่] 3. ระบบการจองของลูกค้า (POST Booking & My Bookings)
// ==========================================

// API รับการจอง (รองรับระบบข้าราชการและบังคับสลิป)
// ==========================================
// ✅ [อัปเดตใหม่] ระบบการจองแบบ Crash-Proof (กันเซิร์ฟเวอร์ดับ)
// ==========================================
app.post('/bookings', upload.fields([{ name: 'slip', maxCount: 1 }, { name: 'gov_card', maxCount: 1 }]), (req, res) => {
    try {
        console.log("📥 [1] ข้อมูลที่ส่งมาจากหน้าเว็บ:", req.body);
        console.log("📂 [2] ไฟล์ที่แนบมา:", req.files);
        
        if (!req.files || !req.files['slip']) {
            return res.status(400).json({ success: false, message: 'กรุณาแนบสลิปการโอนเงินเพื่อยืนยันการจอง' });
        }

        const { user_id, room_name, price, check_in_date, check_out_date, payment_method, room_count, user_type } = req.body;
        
        // ดึงชื่อไฟล์จาก req.files
        const payment_slip = req.files['slip'][0].filename; 
        const gov_card_file = req.files['gov_card'] ? req.files['gov_card'][0].filename : null;

        let finalPrice = parseFloat(price || 0);
        if (user_type === 'official') {
            finalPrice = Math.max(0, finalPrice - 100);
        }

        // 1. หา cus_id จาก user_id
        db.query('SELECT cus_id FROM Customer WHERE user_id = ?', [user_id], (err, cusRes) => {
            if (err) { console.error("❌ DB Error 1:", err); return res.status(500).json({ success: false, message: 'DB Error 1' }); }
            if (!cusRes || cusRes.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้าในระบบ กรุณาล็อกอินใหม่' });
            
            const cus_id = cusRes[0].cus_id;

            // 2. หา room_id
            db.query('SELECT r.room_id FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ? LIMIT 1', [room_name], (err, roomRes) => {
                if (err) { console.error("❌ DB Error 2:", err); return res.status(500).json({ success: false, message: 'DB Error 2' }); }
                if (!roomRes || roomRes.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบประเภทห้องนี้' });
                
                const room_id = roomRes[0].room_id;

                // 3. บันทึกลงตาราง Booking (เพิ่ม slip_image และ id_card_image ตรงนี้)
                const sqlBooking = `INSERT INTO Booking 
                    (cus_id, room_id, room_count, total_amount, check_in_date, check_out_date, booking_status, user_type, slip_image, id_card_image, booking_date) 
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())`;
                
                db.query(sqlBooking, [
                    cus_id, 
                    room_id, 
                    parseInt(room_count) || 1, 
                    finalPrice, 
                    check_in_date, 
                    check_out_date, 
                    user_type || 'general',
                    payment_slip,   // บันทึกลง slip_image
                    gov_card_file   // บันทึกลง id_card_image
                ], (err, bookRes) => {
                    if (err) { console.error("❌ DB Error 3 (Booking):", err); return res.status(500).json({ success: false, message: err.message }); }
                    const booking_id = bookRes.insertId;

                    // 4. บันทึกลงตาราง Payment
                    const sqlPayment = `INSERT INTO Payment (booking_id, payment_slip, payment_date, payment_status, payment_method, amount) VALUES (?, ?, NOW(), 'pending', ?, ?)`;
                    db.query(sqlPayment, [booking_id, payment_slip, payment_method || 'transfer', finalPrice], (err) => {
                        if (err) { console.error("❌ DB Error 4 (Payment):", err); return res.status(500).json({ success: false, message: err.message }); }
                        res.json({ success: true, message: 'บันทึกการจองสำเร็จ!', booking_id: booking_id });
                    });
                });
            });
        });

    } catch (error) {
        console.error("🔥 CRITICAL ERROR (โค้ดพัง):", error);
        res.status(500).json({ success: false, message: 'ระบบเกิดข้อผิดพลาดร้ายแรง' });
    }
});

// Route เสริม (เผื่อ Frontend เรียกใช้คำว่า /reserve แทน)
app.post('/reserve', bookingUpload, (req, res) => {
    req.url = '/bookings';
    app.handle(req, res);
});

// ลูกค้าดึงประวัติการจองของตัวเองไปโชว์ในหน้า Profile / My Bookings
app.get('/my-bookings/:userId', (req, res) => {
    const sql = `
        SELECT 
            b.booking_id AS id, 
            rt.typename AS room_name, 
            b.room_count, 
            b.check_in_date, 
            b.check_out_date, 
            b.total_amount AS price, 
            b.booking_status AS status, 
            p.payment_slip AS slip_image,
            b.id_card_image,
            b.user_type
        FROM Booking b
        JOIN Customer c ON b.cus_id = c.cus_id
        JOIN Room r ON b.room_id = r.room_id
        JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN Payment p ON b.booking_id = p.booking_id
        WHERE c.user_id = ? 
        ORDER BY b.booking_id DESC
    `;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});
// ==========================================

// ✅ 1. API ซ่อมฐานข้อมูล (เพิ่มคอลัมน์เหตุผลและตัวนับ)
app.get('/fix-reschedule-reason-db', (req, res) => {
    const sql = `ALTER TABLE Booking 
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

    // ✅ แก้ไข 1: เปลี่ยน WHERE id = ? เป็น WHERE booking_id = ?
    db.query('SELECT reschedule_count FROM Booking WHERE booking_id = ?', [booking_id], (err, results) => {
        if (err) {
            console.error("❌ DB Error 1 (SELECT เลื่อนวัน):", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
        
        if (results[0].reschedule_count >= 1) {
            return res.status(400).json({ success: false, message: 'รายการนี้ใช้สิทธิ์เลื่อนวันไปแล้ว' });
        }

        // ✅ แก้ไข 2: เปลี่ยน status เป็น booking_status
        // ✅ แก้ไข 3: เปลี่ยน WHERE id=? เป็น WHERE booking_id=?
        const sql = `UPDATE Booking SET 
                     booking_status='pending_reschedule', 
                     request_check_in=?, 
                     request_check_out=?, 
                     reschedule_reason=? 
                     WHERE booking_id=?`;
        
        db.query(sql, [new_check_in, new_check_out, reason, booking_id], (err) => {
            if (err) {
                console.error("❌ DB Error 2 (UPDATE เลื่อนวัน):", err);
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'ส่งคำขอเลื่อนวันเรียบร้อยแล้ว' });
        });
    });
});

// ✅ 3. แก้ไข API อนุมัติเลื่อนวัน (แก้ปัญหาซ้ำซ้อนและใช้คอลัมน์ถูกต้อง)
app.post('/admin/approve-reschedule', (req, res) => {
    const { booking_id, action } = req.body;

    if (!booking_id || !action) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    let sql = '';
    
    // ✅ ใช้ตาราง Booking, คอลัมน์ booking_status และ booking_id
    if (action === 'approve') {
        // อนุมัติ: เอากำหนดวันใหม่ไปทับวันเดิม, เปลี่ยนสถานะ, นับว่าเลื่อนไปแล้ว 1 ครั้ง และลบคำขอทิ้ง
        sql = `UPDATE Booking SET 
               booking_status='approved', 
               check_in_date=request_check_in, 
               check_out_date=request_check_out, 
               reschedule_count = COALESCE(reschedule_count, 0) + 1,
               request_check_in=NULL, 
               request_check_out=NULL, 
               reschedule_reason=NULL 
               WHERE booking_id=?`;
    } else if (action === 'reject') {
        // ปฏิเสธ: เปลี่ยนสถานะกลับเป็นปกติและลบคำขอทิ้ง (ใช้วันเข้าพักเดิม)
        sql = `UPDATE Booking SET 
               booking_status='approved',
               request_check_in=NULL, 
               request_check_out=NULL, 
               reschedule_reason=NULL  
               WHERE booking_id=?`;
    }

    db.query(sql, [booking_id], (err, results) => {
        if (err) {
            console.error("❌ DB Error (Approve/Reject เลื่อนวัน):", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ 
            success: true, 
            message: action === 'approve' ? 'อนุมัติการเลื่อนวันและเปลี่ยนวันที่สำเร็จ' : 'ปฏิเสธคำขอและใช้กำหนดการเดิมเรียบร้อย' 
        });
    });
});

// ✅ API เช็คห้องว่างแบบระบุวันและประเภทห้อง
app.get('/check-availability', (req, res) => {
    const { checkIn, checkOut, roomName } = req.query;

    db.query('SELECT COUNT(*) as total_rooms FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ?', [roomName], (err, roomRes) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // กันเหนียว: ถ้าหาในระบบไม่เจอ ให้ตั้งค่าจำนวนห้องทั้งหมดเป็น 15 ห้อง
        const totalRooms = roomRes[0].total_rooms > 0 ? roomRes[0].total_rooms : 15;

        // ✅ คำนวณห้องที่ถูกจองไปแล้ว (นับรวมทุกสถานะ ยกเว้นคนที่โดนปฏิเสธ หรือยกเลิกไปแล้ว)
        const sql = `
            SELECT SUM(IFNULL(b.room_count, 1)) as booked_count 
            FROM Booking b 
            JOIN Room r ON b.room_id = r.room_id
            JOIN RoomType rt ON r.room_type_id = rt.room_type_id
            WHERE rt.typename = ? 
            AND b.booking_status NOT IN ('cancelled', 'rejected') 
            AND (DATE(b.check_in_date) < DATE(?) AND DATE(b.check_out_date) > DATE(?))
        `;

        db.query(sql, [roomName, checkOut, checkIn], (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const bookedCount = result[0].booked_count || 0;
            const availableRooms = totalRooms - bookedCount;
            
            // ส่งข้อมูลกลับไปให้หน้าเว็บ 3 อย่าง: ว่างกี่ห้อง / ทั้งหมดมีกี่ห้อง / โดนจองไปกี่ห้อง
            res.json({ 
                available: availableRooms > 0 ? availableRooms : 0,
                total: totalRooms, 
                booked: bookedCount
            });
        });
    });
});

// ✅ API ซ่อมฐานข้อมูล (รวมมิตรสำหรับระบบเลื่อนวัน)
app.get('/fix-reschedule-complete', (req, res) => {
    const queries = [
        "ALTER TABLE Booking ADD COLUMN reschedule_reason TEXT NULL",
        "ALTER TABLE Booking ADD COLUMN reschedule_count INT DEFAULT 0",
        "ALTER TABLE Booking ADD COLUMN request_check_in DATE NULL",
        "ALTER TABLE Booking ADD COLUMN request_check_out DATE NULL",
        "ALTER TABLE Booking ADD COLUMN request_price DECIMAL(10,2) NULL"
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

// ==========================================
// ✅ API สำหรับดึงข้อมูลการจองทั้งหมด (Admin)
// ==========================================
app.get('/bookings', (req, res) => {
    const sql = `
        SELECT 
            b.booking_id AS id, 
            c.user_id AS user_id, 
            c.name AS fullname, 
            c.email AS email,
            rt.typename AS room_name, 
            b.room_count, 
            b.check_in_date, 
            b.check_out_date, 
            b.total_amount AS price, 
            b.booking_status AS status, 
            b.user_type,
            b.id_card_image,       /* ✅ เพิ่มคอลัมน์นี้ เพื่อส่งรูปบัตรข้าราชการไปให้หน้า Admin */
            p.payment_slip AS slip_image,
            COALESCE(b.cancel_reason, cr.reason) AS cancel_reason,
            b.refund_details,      /* ✅ เพิ่มคอลัมน์นี้ */
            b.refund_image,        /* ✅ เพิ่มคอลัมน์นี้ */
            rr.new_check_in AS request_check_in,
            rr.new_check_out AS request_check_out,
            rr.reason AS reschedule_reason
        FROM Booking b
        LEFT JOIN Customer c ON b.cus_id = c.cus_id
        LEFT JOIN Room r ON b.room_id = r.room_id
        LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN Payment p ON b.booking_id = p.booking_id
        LEFT JOIN CancelReservation cr ON b.cancel_id = cr.cancel_id
        LEFT JOIN RescheduleReservation rr ON b.reschedule_id = rr.reschedule_id
        ORDER BY b.booking_id DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch Bookings Error:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// ==========================================
// ✅ API สำหรับลบข้อมูลการจอง (ล้างข้อมูลโดย Admin)
// ==========================================
app.delete('/bookings/:id', (req, res) => {
    const { id } = req.params;

    // 1. ต้องลบข้อมูลในตาราง Payment ที่ผูกกับ booking_id นี้ก่อน (ป้องกัน Foreign Key Error)
    db.query('DELETE FROM Payment WHERE booking_id = ?', [id], (err) => {
        if (err) {
            console.error("❌ Error deleting Payment:", err);
            return res.status(500).json({ success: false, message: 'ไม่สามารถลบข้อมูลการชำระเงินได้' });
        }

        // 2. เมื่อลบ Payment เสร็จแล้ว ค่อยลบข้อมูลในตาราง Booking
        db.query('DELETE FROM Booking WHERE booking_id = ?', [id], (err2) => {
            if (err2) {
                console.error("❌ Error deleting Booking:", err2);
                return res.status(500).json({ success: false, message: 'ไม่สามารถลบข้อมูลการจองได้' });
            }
            res.json({ success: true, message: 'ลบข้อมูลการจองเรียบร้อยแล้ว' });
        });
    });
});

app.put('/updateBookingStatus', (req, res) => {
    const { id, status } = req.body;
    db.query("UPDATE Booking SET booking_status = ? WHERE booking_id = ?", [status, id], (err) => {
        if(err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// --- Reschedule System ---
app.post('/request-reschedule', upload.single('reschedule_slip'), (req, res) => {
    const { booking_id, new_check_in, new_check_out, new_price } = req.body;
    const reschedule_slip = req.file ? req.file.filename : null;

    const sql = "UPDATE Booking SET booking_status='pending_reschedule', request_check_in=?, request_check_out=?, request_price=?, reschedule_slip=? WHERE booking_id=?";
    db.query(sql, [new_check_in, new_check_out, new_price, reschedule_slip, booking_id], (err) => {
        if (err) {
            console.error("Reschedule Error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Request sent' });
    });
});

app.get('/admin/reschedule-requests', (req, res) => {
    // ✅ แก้ไข: ใช้ตาราง Booking และคอลัมน์ booking_status
    const sql = `SELECT * FROM Booking WHERE booking_status = 'pending_reschedule'`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Fetch Reschedule Error:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// ตัวช่วยสร้างคอลัมน์สำหรับการเลื่อนวัน (รันครั้งเดียว)
app.get('/fix-reschedule', (req, res) => {
    const sql = `ALTER TABLE Booking
                 ADD COLUMN reschedule_count INT DEFAULT 0,
                 ADD COLUMN request_check_in DATE NULL,
                 ADD COLUMN request_check_out DATE NULL,
                 ADD COLUMN reschedule_reason TEXT NULL`;
                 
    db.query(sql, (err) => {
        if (err) {
            return res.send("❌ Error (หรืออาจจะมีคอลัมน์อยู่แล้ว): " + err.message);
        }
        res.send("<h1 style='color:green;'>✅ สร้างคอลัมน์เลื่อนวันสำเร็จ! กลับไปกดเลื่อนวันได้เลย</h1>");
    });
});

// ==========================================
// ✅ [อัปเดตใหม่] รีเซ็ตรหัสผ่าน (ลืมรหัสผ่าน)
// ==========================================
app.post('/reset-password', (req, res) => {
    const email = req.body.email;
    const password = req.body.password || req.body.newPassword; 
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    
    // อัปเดตรหัสผ่านในตาราง UserAccount โดยอ้างอิงจาก email (username)
    db.query("UPDATE UserAccount SET password = ? WHERE username = ?", [password, email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        res.status(200).json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' });
    });
});

const port = process.env.PORT || 3001; 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});