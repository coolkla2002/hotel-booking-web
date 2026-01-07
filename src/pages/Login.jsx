import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    // --- ลบ Logic Admin เดิมออก (ย้ายไป AdminLogin) ---

    try {
      const response = await fetch('https://hotel-booking-web-kfks.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        console.log("Login สำเร็จ ข้อมูลที่ได้:", data.user); 
        onLogin(data.user);
        navigate('/'); // ลูกค้าไปหน้า Home
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
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">RC</div>
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
          
          {/* ลิงก์แอบไปหน้า Admin Login */}
          <div className="mt-6 text-center border-t pt-4">
             <Link to="/admin-login" className="text-gray-400 text-xs hover:text-gray-600">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;