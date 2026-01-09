// client/src/pages/admin/AdminLogin.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2'; // ✅ 1. เพิ่ม import Swal เพื่อความสวยงามตอนแจ้งเตือน

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      // ยิงไปที่ /admin-login (API ใหม่สำหรับ Admin โดยเฉพาะ)
      const response = await fetch('http://localhost:3000/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });

      const data = await response.json();

      if (data.success) {
           console.log("Admin Login สำเร็จ:", data.user);
           
           // บันทึกลง LocalStorage
           localStorage.setItem('user', JSON.stringify(data.user));
           onLogin(data.user);
           
           // ✅ 2. ส่วนที่แก้ไข: เพิ่ม Popup และการเช็ค Role เพื่อแยกหน้า
           Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับ ${data.user.name} (${data.user.role || 'Admin'})`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
           }).then(() => {
                // เช็ค Role ตรงนี้
                if (data.user.role === 'manager') {
                    navigate('/manager'); // ถ้าเป็นผู้บริหาร ไปหน้า Dashboard ใหม่
                } else {
                    navigate('/admin');   // ถ้าเป็นแอดมินทั่วไป ไปหน้าเดิม
                }
           });

      } else {
        setError(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

    } catch (err) {
      console.error(err);
      setError('เชื่อมต่อ Server ไม่ได้');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm border-t-4 border-red-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Portal</h1>
          <p className="text-gray-500 text-sm">ระบบจัดการหลังบ้าน</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 mb-4 text-sm text-center">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 text-sm font-bold">Email</label>
            <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500" 
                placeholder="admin@gmail.com" 
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 text-sm font-bold">Password</label>
            <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500" 
                placeholder="••••" 
            />
          </div>

          <button onClick={handleSubmit} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded font-bold mt-4 transition-colors">
            เข้าสู่ระบบจัดการ
          </button>
          
          <button onClick={() => navigate('/login')} className="w-full text-gray-500 text-sm py-2 hover:underline mt-2">
            กลับไปหน้าลูกค้าทั่วไป
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;