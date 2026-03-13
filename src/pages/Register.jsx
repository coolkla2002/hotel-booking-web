import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import Swal from 'sweetalert2';
import API_URL from "/src/config";
import myLogo from '../assets/logo.png'; 

const Register = () => {
  const navigate = useNavigate(); 

  // State สำหรับฟอร์มสมัครสมาชิก
  const [formData, setFormData] = useState({
    fullname: '',
    sex: '', // แก้จาก gender เป็น sex
    birthdate: '',
    phone: '', 
    email: '',
    password: '',
    confirmPassword: ''
  });

  // ✅ State ใหม่สำหรับระบบ OTP
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
        const onlyNums = value.replace(/[^0-9]/g, '');
        if (onlyNums.length <= 10) {
            setFormData({ ...formData, [name]: onlyNums });
        }
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };

  // ✅ ฟังก์ชันตอนกดปุ่ม "ยืนยัน" (สมัครสมาชิก)
  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (formData.phone.length !== 10) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก', 'warning');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
      Swal.fire('ข้อผิดพลาด', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    try {
      // แจ้งเตือนกำลังโหลด (เพราะต้องรอส่งอีเมล)
      Swal.fire({
          title: 'กำลังดำเนินการ...',
          text: 'กรุณารอสักครู่ ระบบกำลังสร้างบัญชีและส่งอีเมล',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
      });

      const response = await fetch(API_URL + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fullname: formData.fullname, 
                email: formData.email, 
                password: formData.password, 
                phone: formData.phone,
                gender: formData.gender,
                birthdate: formData.birthdate
            }),
        });

        const data = await response.json();
        
        // ปิดหน้าจอโหลด
        Swal.close();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'ส่งรหัส OTP สำเร็จ!',
                text: 'กรุณาตรวจสอบรหัส 6 หลักในอีเมลของคุณ',
                confirmButtonColor: '#4CAF50'
            });
            // ✅ บันทึกอีเมลไว้ และสลับไปหน้าจอ OTP
            setRegisteredEmail(formData.email);
            setShowOtp(true); 
        } else {
            Swal.fire('แจ้งเตือน', data.message || 'การสมัครสมาชิกผิดพลาด', 'warning');
        }

    } catch (err) {
        console.error(err);
        Swal.close();
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    }
  };

  // ✅ ฟังก์ชันใหม่ตอนกดปุ่ม "ยืนยัน OTP"
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก', 'warning');
        return;
    }

    try {
        Swal.fire({ title: 'กำลังตรวจสอบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const response = await fetch(API_URL + '/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: registeredEmail, otpCode: otpCode }),
        });

        const data = await response.json();
        Swal.close();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'ยืนยันอีเมลสำเร็จ!',
                text: 'คุณสามารถเข้าสู่ระบบได้แล้ว',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                navigate('/'); // พากลับไปหน้า Login เมื่อยืนยันเสร็จ
            });
        } else {
            Swal.fire('ข้อผิดพลาด', data.message || 'รหัส OTP ไม่ถูกต้อง', 'error');
        }
    } catch (err) {
        Swal.close();
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col relative overflow-hidden" style={{ 
        backgroundImage: 'url("")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    }}>
      <div className="flex justify-center items-center mb-6 mt-6">
        <img 
            src="/src/assets/logo.png"  
            alt="Logo" 
            className="w-12 h-12 object-contain mr-3 filter drop-shadow-md" 
        />
        <h1 className="text-2xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>RCBAT Hotel</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 mt-8">
        <div className="bg-blue-300/80 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl w-full max-w-2xl border-4 border-blue-200/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white bg-blue-500/80 inline-block px-8 py-3 rounded-full shadow-md">
              {showOtp ? 'ยืนยันรหัส OTP' : 'สมัครสมาชิก/Create an Account'}
            </h2>
          </div>
          
          {/* ✅ สลับการแสดงผล ถ้า showOtp เป็น true ให้โชว์ฟอร์มกรอกรหัส แต่ถ้า false ให้โชว์ฟอร์มสมัคร */}
          {!showOtp ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-blue-900 font-bold mb-2 text-lg">ชื่อ - นามสกุล</label>
                  <input type="text" name="fullname" onChange={handleChange} value={formData.fullname} placeholder="Full Name" required className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner" />
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">เพศ</label>
                  <select name="gender" onChange={handleChange} value={formData.gender} className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg shadow-inner appearance-none">
                    <option value="">Gender</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">วัน/เดือน/ปีเกิด</label>
                  <input type="date" name="birthdate" onChange={handleChange} value={formData.birthdate} className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg shadow-inner" />
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">เบอร์โทรศัพท์ (10 หลัก)</label>
                  <input type="text" inputMode="numeric" maxLength={10} name="phone" onChange={handleChange} value={formData.phone} placeholder="08xxxxxxxx" className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner" />
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">อีเมล</label>
                  <input type="email" name="email" onChange={handleChange} value={formData.email} placeholder="Email Address" required className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner" />
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">รหัสผ่าน</label>
                  <input type="password" name="password" onChange={handleChange} value={formData.password} placeholder="Password" required className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner" />
                </div>
                <div>
                  <label className="block text-blue-900 font-bold mb-2 text-lg">ยืนยันรหัสผ่าน</label>
                  <input type="password" name="confirmPassword" onChange={handleChange} value={formData.confirmPassword} placeholder="Confirm Password" required className="w-full p-4 rounded-2xl bg-gray-100/80 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-700 text-lg placeholder-gray-400 shadow-inner" />
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
          ) : (
            // ✅ หน้าต่างฟอร์มกรอกรหัส OTP
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div className="text-center bg-blue-100/50 p-6 rounded-2xl border-2 border-blue-200">
                <p className="text-xl text-blue-900 mb-2 font-bold">ระบบได้ส่งรหัส 6 หลักไปที่อีเมล:</p>
                <p className="text-2xl text-blue-700 font-black">{registeredEmail}</p>
                <p className="text-md text-red-500 mt-3">*หากไม่พบอีเมล กรุณาตรวจสอบในโฟลเดอร์จดหมายขยะ (Spam)</p>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="w-full max-w-sm">
                    <label className="block text-blue-900 font-bold mb-4 text-xl text-center">กรอกรหัส OTP ที่นี่</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))} // รับเฉพาะตัวเลข
                      placeholder="------" 
                      required 
                      className="w-full p-4 text-center tracking-[0.5em] text-4xl rounded-2xl bg-gray-100/90 border-4 border-white focus:border-green-400 focus:outline-none text-gray-800 shadow-inner font-bold placeholder-gray-300"
                    />
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-12">
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-4 px-16 rounded-full shadow-lg transition-transform active:scale-95">
                  ยืนยันบัญชี
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Register;