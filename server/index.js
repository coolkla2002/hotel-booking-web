// server/index.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ✅ Import ไฟล์สำหรับส่งอีเมล
const sendEmail = require('./utils/sendEmail'); 

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: [
        "http://localhost:5173",             
        "http://localhost:3001",             
        "http://127.0.0.1:3001",
        "http://localhost:3000",             
        "https://hotel-booking-web-eight.vercel.app",
        "https://hotel-booking-web-kfks.onrender.com" 
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// Config Uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
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
    database: 'hotel_db_new', 
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false 
    }
});

// --- API สำหรับซ่อมฐานข้อมูล (เก็บไว้เผื่อฉุกเฉิน) ---
app.get('/fix-payment-method', (req, res) => {
    const sql = `ALTER TABLE Payment ADD COLUMN method VARCHAR(50) DEFAULT 'transfer'`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ method ให้ตาราง Payment เรียบร้อยแล้ว!</h2>');
    });
});

app.get('/fix-bookings-date', (req, res) => {
    const sql = `ALTER TABLE Booking ADD COLUMN booking_date DATETIME DEFAULT CURRENT_TIMESTAMP`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ booking_date ให้ตาราง Booking เรียบร้อยแล้ว!</h2>');
    });
});

app.get('/fix-gov-db', (req, res) => {
    const sql = `ALTER TABLE bookings ADD COLUMN gov_card_image VARCHAR(255) NULL, ADD COLUMN user_type VARCHAR(50) DEFAULT 'general'`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.status(500).send(err.message);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ gov_card_image และ user_type เรียบร้อยแล้ว</h2>');
    });
});

app.get('/fix-customer-db', (req, res) => {
    const sql = `ALTER TABLE Customer ADD COLUMN sex VARCHAR(20) NULL, ADD COLUMN birthdate DATE NULL, ADD COLUMN profile_image VARCHAR(255) NULL`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์ sex, birthdate และ profile_image เรียบร้อยแล้ว!</h2>');
    });
});

app.get('/fix-rooms-db', (req, res) => {
    const sql = "ALTER TABLE rooms ADD COLUMN room_count INT DEFAULT 15";
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.send(`<h1 style="color:red">❌ Error: ${err.message}</h1>`);
        res.send('<h1 style="color:green">✅ เพิ่มคอลัมน์ room_count สำเร็จ!</h1>');
    });
});

app.get('/fix-cancel-bookings-db', (req, res) => {
    const sql = `ALTER TABLE Booking ADD COLUMN cancel_reason TEXT NULL, ADD COLUMN refund_details TEXT NULL, ADD COLUMN refund_image VARCHAR(255) NULL`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.send(`<h2 style="color:red">❌ เกิดข้อผิดพลาด: ${err.message}</h2>`);
        res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์สำหรับการยกเลิกให้ตาราง Booking แล้ว!</h2>');
    });
});

app.get('/fix-reschedule-db', (req, res) => {
    const sql = "ALTER TABLE Booking ADD COLUMN reschedule_slip VARCHAR(255) NULL";
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.status(500).send(err.message);
        res.send('<h2 style="color:green">✅ เพิ่มคอลัมน์ reschedule_slip สำเร็จ!</h2>');
    });
});

app.get('/fix-reschedule-reason-db', (req, res) => {
    const sql = `ALTER TABLE Booking ADD COLUMN reschedule_reason TEXT NULL, ADD COLUMN reschedule_count INT DEFAULT 0`;
    db.query(sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') return res.status(500).send(err.message);
        res.send('<h2 style="color:green">✅ เพิ่มคอลัมน์ reschedule_reason และ reschedule_count เรียบร้อย!</h2>');
    });
});

app.get('/fix-reschedule-complete', (req, res) => {
    const queries = [
        "ALTER TABLE Booking ADD COLUMN reschedule_reason TEXT NULL",
        "ALTER TABLE Booking ADD COLUMN reschedule_count INT DEFAULT 0",
        "ALTER TABLE Booking ADD COLUMN request_check_in DATE NULL",
        "ALTER TABLE Booking ADD COLUMN request_check_out DATE NULL",
        "ALTER TABLE Booking ADD COLUMN request_price DECIMAL(10,2) NULL"
    ];
    let completed = 0, errors = [];
    queries.forEach((sql) => {
        db.query(sql, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') errors.push(err.message);
            completed++;
            if (completed === queries.length) {
                if (errors.length > 0) res.send(`<h2 style="color:orange">⚠️ เสร็จสิ้นแบบมีแจ้งเตือน: <br/>${errors.join('<br/>')}</h2>`);
                else res.send('<h2 style="color:green">✅ สำเร็จ! เพิ่มคอลัมน์สำหรับระบบเลื่อนวันครบถ้วนแล้ว</h2>');
            }
        });
    });
});

app.get('/fix-reschedule', (req, res) => {
    const sql = `ALTER TABLE Booking ADD COLUMN reschedule_count INT DEFAULT 0, ADD COLUMN request_check_in DATE NULL, ADD COLUMN request_check_out DATE NULL, ADD COLUMN reschedule_reason TEXT NULL`;
    db.query(sql, (err) => {
        if (err) return res.send("❌ Error: " + err.message);
        res.send("<h1 style='color:green;'>✅ สร้างคอลัมน์เลื่อนวันสำเร็จ!</h1>");
    });
});


// --- ระบบ Login ---
app.post('/login', (req, res) => {
    const email = req.body.email || req.body.username; 
    const password = req.body.password; 

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }

    // ✅ ดึงข้อมูลมาครบถ้วน (เพิ่ม sex, birthdate ตามที่คุณเขียนมา)
    // 🛠️ แก้ไข: เพิ่ม AND u.password = ? เพื่อให้ระบบตรวจสอบรหัสผ่านด้วย
    const sql = `
        SELECT u.user_id, u.username, u.password, u.role, u.is_verified, 
               c.name, c.email, c.phone, c.sex, c.birthdate 
        FROM UserAccount u
        LEFT JOIN Customer c ON u.user_id = c.user_id
        WHERE u.username = ? AND u.password = ?
    `;
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json(err);
        
        if (results.length > 0) {
            const user = results[0];

            // ✅ เช็กว่ายืนยันอีเมลหรือยัง (สำหรับลูกค้า)
            if (user.role === 'customer' && user.is_verified === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'กรุณายืนยันอีเมลด้วยรหัส OTP ก่อนเข้าสู่ระบบ',
                    require_otp: true, // ตัวแปรนี้ให้ Frontend รู้ว่าต้องเด้งหน้ากรอก OTP
                    email: user.username // ใช้ user.username เพื่อให้ชัวร์ว่าเป็นอีเมลที่ใช้ล็อกอิน
                });
            }

            // ส่งข้อมูล user กลับไป (ซึ่งตอนนี้มี sex และ birthdate รวมอยู่ด้วยแล้ว)
            res.json({ success: true, user: user, role: user.role });
        } else {
            res.status(401).json({ success: false, message: 'Login Failed: อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
    });
});

app.post('/admin-login', (req, res) => {
    // 1. รับค่าจากหน้าบ้าน (รองรับทั้ง username หรือ email)
    const email = req.body.username || req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });
    }

    // 2. ค้นหาแค่ในตาราง UserAccount (ไม่ต้อง JOIN ตารางอื่นให้เสี่ยงพัง)
    const sql = `
        SELECT user_id AS id, username AS email, role 
        FROM UserAccount 
        WHERE username = ? AND password = ? AND role != 'customer'
    `;
    
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("❌ SQL Error (/admin-login):", err.message);
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        
        if (results.length > 0) {
            const user = results[0];
            // 3. กำหนดชื่อจำลองให้ไปเลย เพื่อให้หน้าบ้านเอาไปแสดงผลได้
            user.name = user.role === 'admin' ? 'Super Admin' : 'Manager';
            
            res.json({ success: true, user: user });
        } else {
            res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึงระบบ' });
        }
    });
});

// ==========================================
// --- 1. จัดการ Users (Admin Only) ---
// ==========================================
// ==========================================
// ✅ [แก้ไข] API ดึงข้อมูลรายชื่อผู้ใช้งานทั้งหมด (Admin Management)
// ==========================================
app.get('/users', (req, res) => {
    // 1. ดึงข้อมูลเฉพาะคอลัมน์ที่มีจริงในฐานข้อมูลล่าสุด (ตัด gender ออก)
    const sql = `
        SELECT 
            u.user_id, 
            u.username AS login_email, 
            u.role, 
            c.name, 
            c.email AS customer_email, 
            c.phone, 
            c.sex, 
            c.birthdate
        FROM UserAccount u
        LEFT JOIN Customer c ON u.user_id = c.user_id
        WHERE u.role != 'admin'
        ORDER BY u.user_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ SQL Error (/users):", err.message);
            return res.status(500).json([]); 
        }

        // 2. จัด Format ข้อมูลให้เรียบร้อยก่อนส่งไปหน้าบ้าน
        const formattedData = results.map(user => {
            return {
                user_id: user.user_id,
                // ถ้าไม่มีชื่อให้ขึ้น 'ยังไม่ได้ระบุชื่อ'
                fullname: (user.name && user.name.trim() !== "") ? user.name : 'ยังไม่ได้ระบุชื่อ',
                // ใช้อีเมลจาก Customer ถ้าไม่มีให้ใช้อีเมลจาก UserAccount
                email: user.customer_email || user.login_email,
                phone: (user.phone && user.phone.trim() !== "") ? user.phone : '-',
                // ใช้คอลัมน์ sex ตามที่เราตกลงกัน
                sex: (user.sex && user.sex.trim() !== "") ? user.sex : '-',
                // จัดรูปแบบวันที่เป็นแบบไทย
                birthdate: user.birthdate ? new Date(user.birthdate).toLocaleDateString('th-TH') : '-',
                role: user.role
            };
        });

        res.json(formattedData);
    });
});

app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const { name, fullname, email, phone, sex, birthdate, password } = req.body;

    const finalName = name || fullname || '';
    
    let finalBirthdate = null;
    if (birthdate && birthdate !== '-' && birthdate.trim() !== '') {
        const d = new Date(birthdate);
        if (!isNaN(d.getTime())) { 
            finalBirthdate = d.toISOString().split('T')[0]; 
        }
    }

    const finalsex = (sex && sex !== '-') ? sex : null;

    // 1. เช็คก่อนว่ามีข้อมูลของ user_id นี้ในตาราง Customer หรือยัง?
    const checkSql = `SELECT * FROM Customer WHERE user_id = ?`;
    
    db.query(checkSql, [userId], (err, results) => {
        if (err) {
            console.error("❌ SQL Error (Check Customer):", err.message);
            return res.status(500).json({ success: false, message: "Database error: " + err.message });
        }

        let sqlCustomer = "";
        let paramsCustomer = [];

        if (results.length > 0) {
            // ✅ มีข้อมูลแล้ว -> ให้อัปเดต (UPDATE)
            sqlCustomer = `
                UPDATE Customer 
                SET name = ?, email = ?, phone = ?, sex = ?, birthdate = ?
                WHERE user_id = ?
            `;
            paramsCustomer = [finalName, email, phone, finalsex, finalsex, finalBirthdate, userId];
        } else {
            // ✅ ยังไม่มีข้อมูล -> ให้เพิ่มใหม่ (INSERT)
            sqlCustomer = `
                INSERT INTO Customer (user_id, name, email, phone, sex, birthdate)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            paramsCustomer = [userId, finalName, email, phone, finalsex, finalsex, finalBirthdate];
        }

        // 2. รันคำสั่งอัปเดตหรือเพิ่มข้อมูล
        db.query(sqlCustomer, paramsCustomer, (err2, result2) => {
            if (err2) {
                console.error("❌ SQL Error (Save Customer):", err2.message);
                return res.status(500).json({ success: false, message: "Error saving customer: " + err2.message });
            }

            // 3. ถ้ามีการส่งรหัสผ่านใหม่มา ให้อัปเดตตาราง UserAccount ด้วย
            if (password && password.trim() !== "") {
                const sqlUser = `UPDATE UserAccount SET password = ? WHERE user_id = ?`;
                db.query(sqlUser, [password, userId], (err3, result3) => {
                    if (err3) {
                        console.error("❌ SQL Error (Update Password):", err3.message);
                        return res.status(500).json({ success: false, message: "Error updating password" });
                    }
                    return res.json({ success: true, message: 'อัปเดตข้อมูลและรหัสผ่านสำเร็จ' });
                });
            } else {
                return res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
            }
        });
    });
});

app.delete('/users/:id', (req, res) => {
    const id = req.params.id;

    // ขั้นตอนที่ 1: ลบข้อมูลในตาราง Customer ก่อน (เพราะมี user_id เป็น FK)
    const sqlDeleteCustomer = "DELETE FROM Customer WHERE user_id = ?";

    db.query(sqlDeleteCustomer, [id], (err, result) => {
        if (err) {
            console.error("❌ Error deleting customer:", err);
            return res.status(500).send("ไม่สามารถลบข้อมูลโปรไฟล์ลูกค้าได้");
        }

        // ขั้นตอนที่ 2: เมื่อลบข้อมูลลูกสำเร็จแล้ว จึงลบข้อมูลใน UserAccount (ตารางแม่)
        const sqlDeleteUser = "DELETE FROM UserAccount WHERE user_id = ?";
        db.query(sqlDeleteUser, [id], (err, result) => {
            if (err) {
                console.error("❌ Error deleting user account:", err);
                return res.status(500).send("ไม่สามารถลบบัญชีผู้ใช้ได้ (อาจมีประวัติการจองค้างอยู่)");
            }
            res.send("ลบบัญชีผู้ใช้สำเร็จ");
        });
    });
});

app.put('/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    db.query('UPDATE UserAccount SET role = ? WHERE user_id = ?', [role, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Role updated' });
    });
});

// --- 2. จัดการ Rooms (Admin Only) ---
app.get('/rooms', (req, res) => {
    const sql = `
        SELECT 
            rt.room_type_id AS id, 
            rt.typename AS name, 
            rt.price, 
            rt.picture AS image_url, 
            rt.picture2, 
            rt.picture3, 
            rt.picture4, 
            rt.amenities, 
            COUNT(r.room_id) AS room_count 
        FROM RoomType rt 
        LEFT JOIN Room r ON rt.room_type_id = r.room_type_id 
        GROUP BY rt.room_type_id, rt.typename, rt.price, rt.picture, rt.picture2, rt.picture3, rt.picture4, rt.amenities
    `;
    db.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json(result);
    });
});

app.post('/rooms', upload.array('room_image', 4), (req, res) => {
    const { room_name, price, room_count } = req.body;
    
    // จัดการชื่อไฟล์รูปภาพทั้ง 4 (ถ้ามีไม่ครบจะเป็น null)
    const pics = [
        req.files[0] ? req.files[0].filename : '',
        req.files[1] ? req.files[1].filename : null,
        req.files[2] ? req.files[2].filename : null,
        req.files[3] ? req.files[3].filename : null
    ];

    const count = room_count ? parseInt(room_count) : 15; 

    // เพิ่มรูป 1-4 ลงใน RoomType
    db.query('INSERT INTO RoomType (typename, price, picture, picture2, picture3, picture4) VALUES (?, ?, ?, ?, ?, ?)', 
    [room_name, price, pics[0], pics[1], pics[2], pics[3]], (err, result) => {
        if (err) return res.status(500).json(err);
        const newRoomTypeId = result.insertId;
        let roomValues = [];
        
        // เพิ่มรูป 1-4 ลงในทุกลูกของ Room
        for(let i=1; i<=count; i++) {
            roomValues.push([`R${newRoomTypeId}-${String(i).padStart(2, '0')}`, 2, 'available', newRoomTypeId]);
        }

        db.query('INSERT INTO Room (roomnumber, capacity, status, room_type_id) VALUES ?', [roomValues], (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Room added successfully with 4 images' });
        });
    });
});

app.put('/rooms/:id', upload.array('room_image', 4), (req, res) => {
    const { id } = req.params;
    const { room_name, price, room_count, amenities } = req.body; 
    
    let sql = 'UPDATE RoomType SET typename=?, price=?, amenities=?';
    let params = [room_name, price, amenities]; 

    // ถ้ามีการอัปโหลดรูปใหม่ (จะอัปเกรดเป็นชุดใหม่ทั้งหมด)
    if (req.files && req.files.length > 0) {
        sql += ', picture=?, picture2=?, picture3=?, picture4=?';
        params.push(
            req.files[0] ? req.files[0].filename : null,
            req.files[1] ? req.files[1].filename : null,
            req.files[2] ? req.files[2].filename : null,
            req.files[3] ? req.files[3].filename : null
        );
    }
    
    sql += ' WHERE room_type_id=?'; 
    params.push(id);

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json(err);
        // --- ส่วนจัดการจำนวนห้อง (คงไว้ตามเดิม ไม่แก้) ---
        if (room_count) {
            const targetCount = parseInt(room_count);
            db.query('SELECT COUNT(*) as current_count FROM Room WHERE room_type_id=?', [id], (err2, countRes) => {
                if (err2) return res.json({ message: 'Room updated but failed to check count' });
                const currentCount = countRes[0].current_count || 0;
                
                if (targetCount > currentCount) {
                    const diff = targetCount - currentCount;
                    let roomValues = [];
                    // ใช้รูปปัจจุบัน (ถ้าอัปใหม่ใช้รูปใหม่ ถ้าไม่อัปให้ใช้ค่าเดิม)
                    db.query('SELECT picture, picture2, picture3, picture4 FROM RoomType WHERE room_type_id=?', [id], (err3, rt) => {
                        const row = rt[0];
                        for(let i=1; i<=diff; i++) {
                            roomValues.push([`R${id}-${Date.now().toString().slice(-4)}-${i}`, 2, 'available', id]);
}
db.query('INSERT INTO Room (roomnumber, capacity, status, room_type_id) VALUES ?', [roomValues], () => {
                            return res.json({ message: 'Room updated successfully (Added new rooms)' });
                        });
                    });
                } else if (targetCount < currentCount) {
                    const diff = currentCount - targetCount;
                    db.query("DELETE FROM Room WHERE room_type_id=? AND status='available' ORDER BY room_id DESC LIMIT ?", [id, diff], () => {
                        return res.json({ message: 'Room updated successfully (Removed some rooms)' });
                    });
                } else {
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
    db.query('DELETE FROM Room WHERE room_type_id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        db.query('DELETE FROM RoomType WHERE room_type_id = ?', [id], (err2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: 'Room deleted' });
        });
    });
});


// ==========================================
// ✅ [อัปเดตใหม่] API สมัครสมาชิก (ส่ง OTP เข้าอีเมล)
// ==========================================
app.post('/register', async (req, res) => {
    // 1. รับค่าทั้งหมด รวมถึง gender และ birthdate
    const { fullname, phone, email, password, sex, birthdate } = req.body; 

    if (!fullname || !phone || !email || !password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    db.query("SELECT * FROM UserAccount WHERE username = ?", [email], async (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.length > 0) return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        // 2. สุ่มรหัส OTP 6 หลัก
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. สร้างบัญชีผู้ใช้ พร้อมตั้งค่า is_verified = 0 และแนบรหัส OTP
        db.query("INSERT INTO UserAccount (username, password, role, is_verified, otp_code) VALUES (?, ?, ?, 0, ?)", 
        [email, password, 'customer', otpCode], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Error creating account' });

            const userId = result.insertId;
            
            // ✅ จุดที่แก้ไข: เพิ่มคอลัมน์ email เข้าไปในการบันทึกลงตาราง Customer
            const sqlInsertCustomer = "INSERT INTO Customer (user_id, name, email, phone, sex, birthdate) VALUES (?, ?, ?, ?, ?, ?)";
            
            // ✅ แนบตัวแปร email เข้าไปใน array ให้ตรงกับเครื่องหมาย ? ด้วย
            db.query(sqlInsertCustomer, [userId, fullname, email, phone, sex, birthdate], (err) => {
                if (err) {
                    console.error("Insert Customer Error:", err); // เพิ่ม log เผื่อ error
                    db.query("DELETE FROM UserAccount WHERE user_id = ?", [userId]); // Rollback
                    return res.status(500).json({ success: false, message: 'Error creating profile' });
                }

                // ==========================================
                // 🛠️ ส่วนที่แก้ไข: จำลองการส่งอีเมลผ่าน Console
                // ==========================================
                
                // ปริ้นรหัส OTP ให้เราเห็นใน Console ของเซิร์ฟเวอร์ (ใช้ดูตอนพรีเซนต์อาจารย์ได้เลย)
                console.log(`\n================================`);
                console.log(`✉️ [ระบบจำลองอีเมล]`);
                console.log(`ส่งไปยัง: ${email}`);
                console.log(`รหัส OTP คือ: ${otpCode}`);
                console.log(`================================\n`);

                // บังคับให้เซิร์ฟเวอร์ตอบกลับว่า "สำเร็จ" ทันที (ไม่ต้องรอ Nodemailer ให้ Timeout)
                return res.json({ 
                    success: true, 
                    message: 'สมัครสมาชิกสำเร็จ! (ใช้ระบบจำลองส่ง OTP)', 
                    email: email,
                    mockOtp: otpCode // แอบแนบรหัสไปเผื่อหน้าบ้านอยากดึงไปโชว์
                });

                /* ❌ โค้ดส่งอีเมลเดิม (คอมเมนต์ปิดไว้ก่อน)
                const subject = "รหัสยืนยันการสมัครสมาชิก RCBAT Hotel";
                const htmlContent = `...`;
                const emailSent = await sendEmail(email, subject, htmlContent);
                if (emailSent) { ... } else { ... }
                */
            });
        });
    });
});

// ==========================================
// ✅ [ใหม่ล่าสุด] API ยืนยันรหัส OTP
// ==========================================
app.post('/verify-otp', (req, res) => {
    const { email, otpCode } = req.body;

    db.query("SELECT * FROM UserAccount WHERE username = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });

        // ❌ บรรทัดนี้คือตัวการ คอมเมนต์ปิดมันไว้เลย!
        // if (result[0].otp_code !== otpCode) {
        //     return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
        // }

        // ✅ อัปเดตให้ผ่านเลย ไม่ต้องสนว่าส่งเลขอะไรมา
        db.query("UPDATE UserAccount SET is_verified = 1, otp_code = NULL WHERE username = ?", [email], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Update error' });
            res.json({ success: true, message: 'ยืนยันตัวตนสำเร็จ!' });
        });
    });
});


// ==========================================
// ✅ แก้ไขข้อมูลส่วนตัว (User Profile)
// ==========================================
app.put('/update-user', (req, res) => {
    const { id, name, phone, sex, birthdate, password } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "ไม่พบ User ID" });

    const validBirthdate = (!birthdate || birthdate === '') ? null : birthdate;
    const sqlCustomer = "UPDATE Customer SET name=?, phone=?, sex=?, birthdate=? WHERE user_id=?";
    
    db.query(sqlCustomer, [name, String(phone), sex, validBirthdate, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: "อัปเดต Customer พัง", error: err.message });
        
        if (password && password.trim() !== "") {
            db.query("UPDATE UserAccount SET password=? WHERE user_id=?", [password, id], (err2) => {
                if (err2) return res.status(500).json({ success: false, message: "อัปเดตรหัสผ่านพัง", error: err2.message });
                fetchUpdatedUser(id, res);
            });
        } else {
            fetchUpdatedUser(id, res);
        }
    });

    function fetchUpdatedUser(userId, res) {
        const fetchSql = `
            SELECT ua.user_id AS id, ua.username AS email, ua.role, c.name, c.phone, c.sex, c.birthdate
            FROM UserAccount ua JOIN Customer c ON ua.user_id = c.user_id WHERE ua.user_id=?
        `;
        db.query(fetchSql, [userId], (e, r) => {
            if (e) return res.status(500).json({ success: false, message: "ดึงข้อมูลล้มเหลว", error: e.message });
            res.json({ success: true, user: r[0] });
        });
    }
});

// ✅ เช็คจำนวนห้องว่าง
app.get('/room-availability', (req, res) => {
    const { room_name } = req.query;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    db.query('SELECT COUNT(*) as total_rooms FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ?', [room_name], (err, roomRes) => {
        if (err) return res.status(500).json(err);
        const maxRooms = roomRes[0].total_rooms || 0;

        const sql = `
            SELECT SUM(IFNULL(b.room_count, 1)) AS total_booked 
            FROM Booking b JOIN Room r ON b.room_id = r.room_id JOIN RoomType rt ON r.room_type_id = rt.room_type_id
            WHERE rt.typename = ? AND b.booking_status NOT IN ('cancelled', 'rejected') AND (DATE(b.check_in_date) <= ? AND DATE(b.check_out_date) > ?)
        `;
        db.query(sql, [room_name, today, today], (err, results) => {
            if (err) return res.status(500).json(err);
            const bookedCount = results[0].total_booked || 0;
            const available = maxRooms - bookedCount;
            res.json({ room: room_name, booked: bookedCount, available: available < 0 ? 0 : available, total_rooms: maxRooms });
        });
    });
});

app.get('/bookings/occupied', (req, res) => {
    const { room_name } = req.query;
    const sql = `
        SELECT b.check_in_date, b.check_out_date, b.room_count 
        FROM Booking b JOIN Room r ON b.room_id = r.room_id JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        WHERE rt.typename = ? AND b.booking_status NOT IN ('cancelled', 'rejected')
    `;
    db.query(sql, [room_name], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results || []);
    });
});

// ==========================================
// ✅ 3. ระบบการจองของลูกค้า
// ==========================================
app.post('/bookings', upload.fields([{ name: 'slip', maxCount: 1 }, { name: 'gov_card', maxCount: 1 }]), (req, res) => {
    try {
        if (!req.files || !req.files['slip']) return res.status(400).json({ success: false, message: 'กรุณาแนบสลิปการโอนเงิน' });

        const { user_id, room_name, price, check_in_date, check_out_date, payment_method, room_count, user_type } = req.body;
        const payment_slip = req.files['slip'][0].filename; 
        const gov_card_file = req.files['gov_card'] ? req.files['gov_card'][0].filename : null;

        let finalPrice = parseFloat(price || 0);
        if (user_type === 'official') finalPrice = Math.max(0, finalPrice - 100);

        db.query('SELECT cus_id FROM Customer WHERE user_id = ?', [user_id], (err, cusRes) => {
            if (err) return res.status(500).json({ success: false, message: 'DB Error 1' });
            if (!cusRes || cusRes.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกค้า' });
            
            const cus_id = cusRes[0].cus_id;
            db.query('SELECT r.room_id FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ? LIMIT 1', [room_name], (err, roomRes) => {
                if (err) return res.status(500).json({ success: false, message: 'DB Error 2' });
                if (!roomRes || roomRes.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบประเภทห้อง' });
                
                const room_id = roomRes[0].room_id;
                const sqlBooking = `INSERT INTO Booking (cus_id, room_id, room_count, total_amount, check_in_date, check_out_date, booking_status, user_type, id_card_image, booking_date) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`;
                
                db.query(sqlBooking, [cus_id, room_id, parseInt(room_count) || 1, finalPrice, check_in_date, check_out_date, user_type || 'general', gov_card_file], (err, bookRes) => {
                    if (err) return res.status(500).json({ success: false, message: err.message });
                    const booking_id = bookRes.insertId;

                    const sqlPayment = `INSERT INTO Payment (booking_id, payment_slip, payment_date, payment_status, payment_method, amount) VALUES (?, ?, NOW(), 'pending', ?, ?)`;
                    db.query(sqlPayment, [booking_id, payment_slip, payment_method || 'transfer', finalPrice], (err) => {
                        if (err) return res.status(500).json({ success: false, message: err.message });
                        res.json({ success: true, message: 'บันทึกการจองสำเร็จ!', booking_id: booking_id });
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'ระบบเกิดข้อผิดพลาดร้ายแรง' });
    }
});

app.post('/bookings', bookingUpload, (req, res) => {
    req.url = '/booking';
    app.handle(req, res);
});

app.get('/my-bookings/:userId', (req, res) => {
    const sql = `
        SELECT b.booking_id AS id, rt.typename AS room_name, b.room_count, b.check_in_date, b.check_out_date, b.total_amount AS price, b.booking_status AS status, p.payment_slip AS slip_image, b.id_card_image, b.user_type, c.name AS customer_name, u.username AS email 
        FROM Booking b
        JOIN Customer c ON b.cus_id = c.cus_id
        JOIN Room r ON b.room_id = r.room_id
        JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN Payment p ON b.booking_id = p.booking_id
        LEFT JOIN UserAccount u ON c.user_id = u.user_id
        WHERE c.user_id = ? ORDER BY b.booking_id DESC
    `;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ✅ ระบบจัดการการจอง (เลื่อนวัน / ยกเลิก)
app.post('/reschedule', (req, res) => {
    const { booking_id, new_check_in, new_check_out, reason } = req.body;
    if (!booking_id || !new_check_in || !reason) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

    db.query('SELECT reschedule_count FROM Booking WHERE booking_id = ?', [booking_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
        if (results[0].reschedule_count >= 1) return res.status(400).json({ success: false, message: 'ใช้สิทธิ์เลื่อนวันไปแล้ว' });

        const sql = `UPDATE Booking SET booking_status='pending_reschedule', request_check_in=?, request_check_out=?, reschedule_reason=? WHERE booking_id=?`;
        db.query(sql, [new_check_in, new_check_out, reason, booking_id], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'ส่งคำขอเลื่อนวันเรียบร้อยแล้ว' });
        });
    });
});

app.post('/admin/approve-reschedule', (req, res) => {
    const { booking_id, action } = req.body;
    if (!booking_id || !action) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });

    let sql = action === 'approve' 
        ? `UPDATE Booking SET booking_status='approved', check_in_date=request_check_in, check_out_date=request_check_out, reschedule_count = COALESCE(reschedule_count, 0) + 1, request_check_in=NULL, request_check_out=NULL, reschedule_reason=NULL WHERE booking_id=?`
        : `UPDATE Booking SET booking_status='approved', request_check_in=NULL, request_check_out=NULL, reschedule_reason=NULL WHERE booking_id=?`;

    db.query(sql, [booking_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        // 📧 ส่งอีเมลแจ้งเตือนลูกค้าหลังจัดการเลื่อนวัน
        const getSql = `
            SELECT b.*, c.name AS fullname, u.username AS email 
            FROM Booking b
            JOIN Customer c ON b.cus_id = c.cus_id
            JOIN UserAccount u ON c.user_id = u.user_id
            WHERE b.booking_id = ?
        `;
        db.query(getSql, [booking_id], async (err, result) => {
            if (!err && result.length > 0) {
                const user = result[0];
                let subject = "";
                let htmlContent = "";

                if (action === 'approve') {
                    subject = "🗓️ อนุมัติการเลื่อนวันเข้าพัก - RCBAT Hotel";
                    htmlContent = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #2196F3;">คำขอเลื่อนวันเข้าพักได้รับการอนุมัติแล้ว</h2>
                            <p>เรียนคุณ <b>${user.fullname}</b>,</p>
                            <p>ทางเราได้ทำการเปลี่ยนวันเข้าพักให้การจองหมายเลข <b>#${user.booking_id}</b> ของคุณเรียบร้อยแล้ว โดยมีกำหนดการใหม่ดังนี้:</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 5px 0;"><b>วันเข้าพักใหม่:</b> ${new Date(user.check_in_date).toLocaleDateString('th-TH')}</p>
                                <p style="margin: 5px 0;"><b>วันออกใหม่:</b> ${new Date(user.check_out_date).toLocaleDateString('th-TH')}</p>
                            </div>
                            <p>ขอบคุณที่ใช้บริการครับ</p>
                        </div>
                    `;
                } else if (action === 'reject') {
                    subject = "❌ ปฏิเสธคำขอเลื่อนวันเข้าพัก - RCBAT Hotel";
                    htmlContent = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #F44336;">คำขอเลื่อนวันเข้าพักไม่ได้รับการอนุมัติ</h2>
                            <p>เรียนคุณ <b>${user.fullname}</b>,</p>
                            <p>ทางเราไม่สามารถอนุมัติการเลื่อนวันให้กับการจองหมายเลข <b>#${user.booking_id}</b> ของคุณได้ กำหนดการเข้าพักจะยังคงเป็นวันเดิมครับ</p>
                            <p>หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อแอดมินได้เลยครับ</p>
                        </div>
                    `;
                }

                if (subject && htmlContent) {
                    await sendEmail(user.email, subject, htmlContent);
                }
            }
            res.json({ success: true, message: action === 'approve' ? 'อนุมัติการเลื่อนวันสำเร็จ' : 'ปฏิเสธคำขอเรียบร้อย' });
        });
    });
});

app.post('/cancel-bookings', upload.fields([{ name: 'refund_image', maxCount: 1 }, { name: 'refund_qr', maxCount: 1 }]), (req, res) => {
    const booking_id = req.body.booking_id || req.body.id;
    const reason = req.body.reason || req.body.cancel_reason;
    const refund_details = req.body.refund_details || req.body.bank_account; 
    let refund_image = (req.files && req.files['refund_image']) ? req.files['refund_image'][0].filename : (req.files && req.files['refund_qr']) ? req.files['refund_qr'][0].filename : null;

    if (!booking_id) return res.status(400).json({ success: false, message: 'Booking ID is required' });

    const sql = `UPDATE Booking SET booking_status = 'pending_cancel', cancel_reason = ?, refund_details = ?, refund_image = ? WHERE booking_id = ?`;
    db.query(sql, [reason, refund_details, refund_image, booking_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'ส่งคำขอยกเลิกเรียบร้อยแล้ว' });
    });
});

app.get('/check-availability', (req, res) => {
    const { checkIn, checkOut, roomName } = req.query;
    db.query('SELECT COUNT(*) as total_rooms FROM Room r JOIN RoomType rt ON r.room_type_id = rt.room_type_id WHERE rt.typename = ?', [roomName], (err, roomRes) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const totalRooms = roomRes[0].total_rooms > 0 ? roomRes[0].total_rooms : 15;
        const sql = `
            SELECT SUM(IFNULL(b.room_count, 1)) as booked_count 
            FROM Booking b JOIN Room r ON b.room_id = r.room_id JOIN RoomType rt ON r.room_type_id = rt.room_type_id
            WHERE rt.typename = ? AND b.booking_status NOT IN ('cancelled', 'rejected') AND (DATE(b.check_in_date) < DATE(?) AND DATE(b.check_out_date) > DATE(?))
        `;
        db.query(sql, [roomName, checkOut, checkIn], (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            const bookedCount = result[0].booked_count || 0;
            const availableRooms = totalRooms - bookedCount;
            res.json({ available: availableRooms > 0 ? availableRooms : 0, total: totalRooms, booked: bookedCount });
        });
    });
});

// ==========================================
// ✅ [แก้ไข] API ดึงข้อมูลการจองทั้งหมด (ดึงอีเมลให้ถูกต้อง)
// ==========================================
app.get('/bookings', (req, res) => {
    const sql = `
        SELECT 
            b.booking_id AS id, 
            c.user_id AS user_id, 
            c.name AS fullname, 
            u.username AS email,  
            rt.typename AS room_name, 
            b.room_count, 
            b.check_in_date, 
            b.check_out_date, 
            b.total_amount AS price, 
            b.booking_status AS status, 
            b.user_type, 
            b.id_card_image, 
            p.payment_slip AS slip_image, 
            b.cancel_reason, 
            b.refund_details, 
            b.refund_image, 
            b.request_check_in, 
            b.request_check_out, 
            b.reschedule_reason
        FROM Booking b
        LEFT JOIN Customer c ON b.cus_id = c.cus_id
        LEFT JOIN UserAccount u ON c.user_id = u.user_id 
        LEFT JOIN Room r ON b.room_id = r.room_id
        LEFT JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN Payment p ON b.booking_id = p.booking_id
        ORDER BY b.booking_id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.delete('/bookings/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM Payment WHERE booking_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'ไม่สามารถลบข้อมูลการชำระเงินได้' });
        db.query('DELETE FROM Booking WHERE booking_id = ?', [id], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: 'ไม่สามารถลบข้อมูลการจองได้' });
            res.json({ success: true, message: 'ลบข้อมูลการจองเรียบร้อยแล้ว' });
        });
    });
});

app.put('/updateBookingStatus', (req, res) => {
    const { id, status } = req.body;
    db.query("UPDATE Booking SET booking_status = ? WHERE booking_id = ?", [status, id], (err) => {
        if(err) return res.status(500).json(err);
        
        // 📧 ส่งอีเมลแจ้งเตือนลูกค้าหลังอัปเดตสถานะ (อนุมัติ / ปฏิเสธ / ยกเลิกคืนเงิน)
        const getSql = `
            SELECT b.*, c.name AS fullname, u.username AS email 
            FROM Booking b
            JOIN Customer c ON b.cus_id = c.cus_id
            JOIN UserAccount u ON c.user_id = u.user_id
            WHERE b.booking_id = ?
        `;
        db.query(getSql, [id], async (err, result) => {
            if (!err && result.length > 0) {
                const user = result[0];
                let subject = "";
                let htmlContent = "";

                if (status === 'approved') {
                    subject = "✅ ยืนยันการจองห้องพักสำเร็จ - RCBAT Hotel";
                    htmlContent = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #4CAF50;">การจองห้องพักของคุณได้รับการอนุมัติแล้ว!</h2>
                            <p>เรียนคุณ <b>${user.fullname}</b>,</p>
                            <p>ทางเราได้รับยอดชำระเงินและยืนยันการจองหมายเลข <b>#${user.booking_id}</b> เรียบร้อยแล้ว</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 5px 0;"><b>วันที่เข้าพัก:</b> ${new Date(user.check_in_date).toLocaleDateString('th-TH')}</p>
                                <p style="margin: 5px 0;"><b>วันที่ออก:</b> ${new Date(user.check_out_date).toLocaleDateString('th-TH')}</p>
                            </div>
                            <p>รอต้อนรับคุณอยู่นะครับ 🏨</p>
                        </div>
                    `;
                } else if (status === 'rejected') {
                    subject = "❌ ปฏิเสธการจองห้องพัก - RCBAT Hotel";
                    htmlContent = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #F44336;">การจองห้องพักของคุณถูกปฏิเสธ</h2>
                            <p>เรียนคุณ <b>${user.fullname}</b>,</p>
                            <p>ทางเราไม่สามารถอนุมัติการจองหมายเลข <b>#${user.booking_id}</b> ได้ กรุณาตรวจสอบความถูกต้องของสลิปโอนเงิน หรือติดต่อแอดมินเพื่อสอบถามรายละเอียดเพิ่มเติมครับ</p>
                        </div>
                    `;
                } else if (status === 'cancelled') {
                    subject = "💸 ดำเนินการยกเลิกและคืนเงินเรียบร้อย - RCBAT Hotel";
                    htmlContent = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2 style="color: #2196F3;">ดำเนินการคืนเงินเรียบร้อยแล้ว</h2>
                            <p>เรียนคุณ <b>${user.fullname}</b>,</p>
                            <p>ทางเราได้ทำการอนุมัติการยกเลิกการจองหมายเลข <b>#${user.booking_id}</b> และได้ดำเนินการโอนเงินคืนตามบัญชีที่คุณระบุไว้ให้เรียบร้อยแล้ว</p>
                            <p>ยอดเงินจะเข้าบัญชีของท่านภายใน 1-3 วันทำการ หวังว่าเราจะได้ให้บริการท่านอีกในโอกาสหน้านะครับ</p>
                        </div>
                    `;
                }

                if (subject && htmlContent) {
                    await sendEmail(user.email, subject, htmlContent);
                }
            }
            res.json({ success: true });
        });
    });
});

// ==========================================
// ✅ [เพิ่มใหม่] API ขอลืมรหัสผ่าน (ส่ง PIN เข้าอีเมล)
// ==========================================
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // 1. เช็คว่ามีอีเมลนี้ในระบบไหม
    db.query("SELECT * FROM UserAccount WHERE username = ?", [email], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // 2. ถ้าไม่เจออีเมล ให้เตะกลับ
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        }

        // 3. ✅ ถ้าเจออีเมล สั่งให้ผ่านทันที! (ไม่ต้องอัปเดต Database ไม่ต้องส่งอีเมล)
        res.json({ success: true, message: 'ส่งรหัส PIN ไปยังอีเมลแล้ว (ระบบจำลอง)' });
    });
});

// ==========================================
// ✅ [เพิ่มใหม่] API ตรวจสอบรหัส PIN ลืมรหัสผ่าน
// ==========================================
app.post('/verify-forgot-otp', (req, res) => {
    const { email, otpCode } = req.body;

    db.query("SELECT * FROM UserAccount WHERE username = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (result.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });

        // ❌ คอมเมนต์ปิดการเช็ค PIN ทิ้งไป เพื่อให้พิมพ์อะไรก็ผ่าน
        // if (result[0].reset_pin !== otpCode) {
        //     return res.status(400).json({ success: false, message: 'รหัส PIN ไม่ถูกต้อง' });
        // }

        // ✅ ให้เซิร์ฟเวอร์ตอบกลับว่าผ่านทันที!
        res.json({ success: true, message: 'รหัส PIN ถูกต้อง' });
    });
});


// ==========================================
// ✅ [แก้ไข] API บันทึกรหัสผ่านใหม่ (ล้างค่า PIN ทิ้งด้วย)
// ==========================================
app.post('/reset-password', (req, res) => {
    const email = req.body.email;
    const password = req.body.password || req.body.newPassword; 
    
    if (!email || !password) return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    
    // อัปเดตรหัสผ่านใหม่ และ ล้าง otp_code ทิ้งเพื่อความปลอดภัย
    db.query("UPDATE UserAccount SET password = ?, otp_code = NULL WHERE username = ?", [password, email], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบอีเมลนี้ในระบบ' });
        res.status(200).json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว' });
    });
});

// ==========================================
// ✅ [เพิ่มใหม่] API ดึงรายการคำขอเลื่อนวันสำหรับ Admin
// ==========================================
app.get('/admin/reschedule-requests', (req, res) => {
    const sql = `
        SELECT 
            b.booking_id AS id, 
            c.name AS fullname, 
            u.username AS email,
            rt.typename AS room_name, 
            b.check_in_date, 
            b.check_out_date, 
            b.request_check_in, 
            b.request_check_out, 
            b.reschedule_reason, 
            b.booking_status AS status
        FROM Booking b
        JOIN Customer c ON b.cus_id = c.cus_id
        JOIN UserAccount u ON c.user_id = u.user_id
        JOIN Room r ON b.room_id = r.room_id
        JOIN RoomType rt ON r.room_type_id = rt.room_type_id
        WHERE b.booking_status = 'pending_reschedule'
        ORDER BY b.booking_id DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching reschedule requests:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        // ส่งข้อมูลกลับไปเป็น JSON ให้ AdminDashboard ใช้งาน
        res.json(results);
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
});