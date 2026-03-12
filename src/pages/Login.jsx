import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import Swal from 'sweetalert2'; // ✅ นำเข้า Swal เพื่อใช้ทำป็อปอัปแจ้งเตือน
import API_URL from "/src/config";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const response = await fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        
        // ✅ เพิ่มระบบดักจับ Role: ถ้าเป็น admin หรือ manager ให้เด้งออกทันที
        if (data.user.role === 'admin' || data.user.role === 'manager') {
          Swal.fire({
            icon: 'error',
            title: 'ไม่อนุญาตให้เข้าใช้งาน',
            text: 'บัญชีนี้เป็นของผู้ดูแลระบบ กรุณาเข้าสู่ระบบที่หน้า Admin Login',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'ตกลง'
          });
          return; // สั่ง return เพื่อหยุดการทำงาน ไม่ให้บันทึกข้อมูลและไม่ให้เข้าหน้าแรก
        }

        // ถ้าเป็นลูกค้าทั่วไป ให้เข้าสู่ระบบตามปกติ
        console.log("Login สำเร็จ ข้อมูลที่ได้:", data.user); 
        onLogin(data.user);
        navigate('/'); 
      } else {
        setError(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

    } catch (err) {
      console.error(err);
      setError('เชื่อมต่อ Server ไม่ได้');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-blue-100">
        <div className="text-center mb-8">
          
          {/* --- ส่วนที่แก้ไข: เปลี่ยนจากวงกลม RC เป็น Logo --- */}
          <div className="w-24 h-24 mx-auto mb-4 overflow-hidden rounded-2xl shadow-sm">
            <img 
              src="images/ChatGPT Image 7 ม.ค. 2569 13_09_46.png" 
              alt="Hotel Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {/* ------------------------------------------- */}

          <h1 className="text-3xl font-bold text-blue-900">เข้าสู่ระบบ</h1>
          <p className="text-gray-500">สำหรับลูกค้า</p>
        </div>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <div className="space-y-5">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">อีเมล / ชื่อผู้ใช้</label>
            <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" 
                  placeholder="Username / Email" 
                />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">รหัสผ่าน</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" 
                  placeholder="Password" 
                />
            </div>
          </div>

          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 font-bold hover:underline">
              ลืมรหัสผ่าน?
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-gray-100">
             <button onClick={() => navigate('/')} className="bg-red-400 hover:bg-red-500 text-white py-3 rounded-full font-bold shadow-md transition-transform active:scale-95">ยกเลิก</button>
             <button onClick={handleSubmit} className="bg-green-400 hover:bg-green-500 text-white py-3 rounded-full font-bold shadow-md transition-transform active:scale-95">เข้าสู่ระบบ</button>        
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">ยังไม่มีบัญชี?</p>
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              สมัครสมาชิกใหม่
            </Link>
          </div>
          
          <div className="mt-6 text-center border-t pt-4">
             <Link to="/admin-login" className="text-gray-400 text-xs hover:text-gray-600">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;