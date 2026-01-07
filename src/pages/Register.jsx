import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import Swal from 'sweetalert2'; 

const Register = () => {
  const navigate = useNavigate(); 

  const [formData, setFormData] = useState({
    fullname: '',
    gender: '',
    birthdate: '',
    phone: '', 
    email: '',
    password: '',
    confirmPassword: ''
  });

  // ✅ แก้ไข: เพิ่ม Logic ตรวจจับเบอร์โทรศัพท์ (รับเฉพาะตัวเลข + สูงสุด 10 หลัก)
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
        // 1. แทนที่ทุกตัวอักษรที่ไม่ใช่ตัวเลข (0-9) ให้เป็นค่าว่าง
        const onlyNums = value.replace(/[^0-9]/g, '');
        
        // 2. ถ้าความยาวไม่เกิน 10 หลัก ให้บันทึกค่าได้
        if (onlyNums.length <= 10) {
            setFormData({ ...formData, [name]: onlyNums });
        }
    } else {
        // สำหรับช่องอื่น ทำงานตามปกติ
        setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    // ✅ เพิ่ม: ตรวจสอบว่าเบอร์โทรครบ 10 หลักหรือไม่ก่อนส่ง
    if (formData.phone.length !== 10) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
      Swal.fire('ข้อผิดพลาด', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    try {
        const response = await fetch('https://hotel-booking-web-kfks.onrender.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name: formData.fullname, 
                email: formData.email, 
                password: formData.password, 
                phone: formData.phone 
            }),
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'สมัครสมาชิกสำเร็จ',
                text: 'กรุณาเข้าสู่ระบบ',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                navigate('/'); 
            });
        } else {
            Swal.fire('แจ้งเตือน', data.message || 'การสมัครสมาชิกผิดพลาด', 'warning');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col relative overflow-hidden" style={{ 
        backgroundImage: 'url("")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    }}>
      <div className="p-4 absolute top-0 left-0 flex items-center">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-2">RC</div>
        <h1 className="text-2xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>RCBAT Hotel</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 mt-16">
        <div className="bg-blue-300/80 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl w-full max-w-2xl border-4 border-blue-200/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white bg-blue-500/80 inline-block px-8 py-3 rounded-full shadow-md">
              สมัครสมาชิก/Create an Account
            </h2>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="md:col-span-2">
                <label className="block text-blue-900 font-bold mb-2 text-lg">ชื่อ - นามสกุล</label>
                <input 
                  type="text" 
                  name="fullname" 
                  onChange={handleChange} 
                  value={formData.fullname} // เพิ่ม value
                  placeholder="Full Name" 
                  required 
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">เพศ</label>
                <select 
                    name="gender"
                    onChange={handleChange}
                    value={formData.gender}
                    className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg shadow-inner appearance-none">
                  <option value="">Gender</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">วัน/เดือน/ปีเกิด</label>
                <input 
                  type="date" 
                  name="birthdate"
                  onChange={handleChange}
                  value={formData.birthdate}
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg shadow-inner"
                />
              </div>

              {/* --- ส่วนเบอร์โทรศัพท์ที่แก้ไข --- */}
              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">เบอร์โทรศัพท์ (10 หลัก)</label>
                <input 
                  type="text" 
                  inputMode="numeric" // ✅ ช่วยให้มือถือเด้งแป้นพิมพ์ตัวเลข
                  maxLength={10}      // ✅ จำกัด HTML เบื้องต้น
                  name="phone" 
                  onChange={handleChange}
                  value={formData.phone} // ✅ สำคัญ: ต้องผูกค่ากับ State เพื่อให้ Logic ทำงาน
                  placeholder="08xxxxxxxx" 
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">อีเมล</label>
                <input 
                  type="email" 
                  name="email"
                  onChange={handleChange} 
                  value={formData.email}
                  placeholder="Email Address" 
                  required
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">รหัสผ่าน</label>
                <input 
                  type="password" 
                  name="password"
                  onChange={handleChange} 
                  value={formData.password}
                  placeholder="Password" 
                  required
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-bold mb-2 text-lg">ยืนยันรหัสผ่าน</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  onChange={handleChange} 
                  value={formData.confirmPassword}
                  placeholder="Confirm Password" 
                  required
                  className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-10">
              <Link to="/" className="bg-red-400 hover:bg-red-500 text-white text-xl font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95">
                ยกเลิก
              </Link>
              <button type="submit" className="bg-green-400 hover:bg-green-500 text-white text-xl font-bold py-3 px-12 rounded-full shadow-lg transition-transform active:scale-95">
                ยืนยัน
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;