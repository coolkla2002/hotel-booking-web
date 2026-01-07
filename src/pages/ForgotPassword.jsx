import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
// Import ไอคอนเพิ่ม (Lock)
import { Lock } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // 1 = กรอกอีเมล, 2 = กรอก PIN, 3 = ตั้งรหัสใหม่
  const [step, setStep] = useState(1); 
  
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  
  // เพิ่มตัวแปรเก็บรหัสผ่านใหม่
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleConfirm = async (e) => { // ใส่ async เพื่อรอผลจาก database
    e.preventDefault();

    // STEP 1: ตรวจสอบอีเมล
    if (step === 1) {
      if (!email) {
        Swal.fire('แจ้งเตือน', 'กรุณากรอกอีเมลของคุณ', 'warning');
        return;
      }
      // จำลองส่ง PIN
      Swal.fire({
        icon: 'success',
        title: 'ส่งรหัสสำเร็จ',
        text: 'กรุณาตรวจสอบรหัส PIN ในอีเมลของคุณ',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        setStep(2); // ไปหน้ากรอก PIN
      });

    // STEP 2: ตรวจสอบ PIN 
    } else if (step === 2) {
      if (!pinCode) {
        Swal.fire('แจ้งเตือน', 'กรุณากรอกรหัส PIN', 'warning');
        return;
      }
      
      // จำลองว่า PIN ถูกต้อง -> ไปหน้าตั้งรหัสใหม่
      Swal.fire({
        icon: 'success',
        title: 'ยืนยันตัวตนสำเร็จ',
        text: 'กรุณาตั้งรหัสผ่านใหม่',
        timer: 1000,
        showConfirmButton: false
      }).then(() => {
        setStep(3); // ไปหน้าตั้งรหัสผ่านใหม่
      });

    // STEP 3: ตั้งรหัสผ่านใหม่ (เชื่อมต่อ Database) 
    } else if (step === 3) {
      if (!newPassword || !confirmPassword) {
        Swal.fire('แจ้งเตือน', 'กรุณากรอกรหัสผ่านให้ครบถ้วน', 'warning');
        return;
      }

      if (newPassword !== confirmPassword) {
        Swal.fire('ข้อผิดพลาด', 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'error');
        return;
      }

      // ส่งข้อมูลไปบันทึกที่ Database
      try {
        const response = await fetch('https://hotel-booking-web-kfks.onrender.com/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, // ใช้อีเมลจาก Step 1
                newPassword: newPassword 
            })
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'เปลี่ยนรหัสผ่านสำเร็จ!',
                text: 'คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
                confirmButtonText: 'ไปหน้าเข้าสู่ระบบ'
            }).then(() => {
                navigate('/'); // กลับไปหน้า Login
            });
        } else {
            Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
        }
      } catch (err) {
          console.error(err);
          Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-blue-200 flex flex-col relative overflow-hidden font-sans">
      
      {/* --- Header --- */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <span className="text-blue-600 font-bold text-xs">LOGO</span>
         </div>
         <span className="text-white text-2xl font-bold drop-shadow-md">RCBAT HOTEL</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-0 mt-10">
        
        {/* Title Badge */}
        <div className="bg-blue-400/90 backdrop-blur-sm px-8 py-3 rounded-full shadow-lg border-2 border-blue-300 mb-8 transform -translate-y-4">
            <h1 className="text-2xl font-bold text-white drop-shadow-md">
                {step === 3 ? 'ตั้งรหัสผ่านใหม่/New Password' : 'ลืมรหัสผ่าน/Reset Password'}
            </h1>
        </div>

        {/* Card */}
        <div className="bg-blue-300/80 backdrop-blur-md p-8 pt-12 rounded-[40px] shadow-2xl w-full max-w-lg border-4 border-blue-200/50 relative">
            
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 w-28 h-28 bg-white rounded-full border-4 border-blue-200 shadow-xl flex items-center justify-center">
                 <div className="text-center">
                    <div className="text-blue-600 text-4xl mb-1">
                        {step === 3 ? '🔐' : '🏠'}
                    </div>
                 </div>
            </div>

            <form onSubmit={handleConfirm} className="mt-8 text-center space-y-6">
                
                {/* --- Step 1: Email --- */}
                {step === 1 && (
                    <div className="animate-fade-in-up">
                        <label className="block text-blue-900 font-bold text-xl mb-4">อีเมล</label>
                        <input 
                            type="email" 
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-xl bg-gray-200/80 border-2 border-transparent focus:border-blue-500 focus:outline-none text-gray-700 text-lg text-center shadow-inner"
                        />
                        <p className="text-white text-sm mt-4">กรอกอีเมลเพื่อรับรหัส PIN</p>
                    </div>
                )}

                {/* --- Step 2: PIN --- */}
                {step === 2 && (
                    <div className="animate-fade-in-up">
                        <label className="block text-blue-900 font-bold text-xl mb-4">รหัส PIN 6 หลัก</label>
                        <input 
                            type="text" 
                            placeholder="______"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value)}
                            className="w-full p-4 rounded-xl bg-gray-200/80 border-2 border-transparent focus:border-blue-500 focus:outline-none text-gray-700 text-2xl tracking-[0.5em] text-center shadow-inner font-bold"
                            maxLength={6}
                        />
                        <p className="text-white text-sm mt-4">ตรวจสอบรหัสในอีเมล: {email}</p>
                    </div>
                )}

                {/* --- Step 3: New Password --- */}
                {step === 3 && (
                    <div className="animate-fade-in-up space-y-4">
                        <div>
                            <label className="block text-blue-900 font-bold text-xl mb-2">รหัสผ่านใหม่</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-4 text-gray-500" size={20} />
                                <input 
                                    type="password" 
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-4 pl-12 rounded-xl bg-gray-200/80 border-2 border-transparent focus:border-blue-500 focus:outline-none text-gray-700 text-lg shadow-inner"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-blue-900 font-bold text-xl mb-2">ยืนยันรหัสผ่านใหม่</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-4 text-gray-500" size={20} />
                                <input 
                                    type="password" 
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-4 pl-12 rounded-xl bg-gray-200/80 border-2 border-transparent focus:border-blue-500 focus:outline-none text-gray-700 text-lg shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex justify-center gap-6 mt-8">
                    <button 
                        type="submit"
                        className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-3 px-10 rounded-full shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                    >
                        {step === 3 ? 'บันทึก' : 'ยืนยัน'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => {
                            if (step === 1) navigate('/');
                            else setStep(step - 1);
                        }}
                        className="bg-red-400 hover:bg-red-500 text-white text-lg font-bold py-3 px-10 rounded-full shadow-[0_4px_0_rgb(185,28,28)] active:translate-y-1 active:shadow-none transition-all"
                    >
                        {step === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
                    </button>
                </div>

            </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;