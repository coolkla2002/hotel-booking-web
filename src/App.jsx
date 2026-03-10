import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, FileText, UserCog, Phone, MapPin, LogOut, LogIn } from 'lucide-react'; 
import Swal from 'sweetalert2';

// Import Pages
import AdminManagement from './pages/admin/AdminManagement';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import Receipt from './pages/Receipt';
import ManagerDashboard from "./pages/admin/ManagerDashboard";
import HomePage from './pages/client/HomePage';
import BookingHistory from './pages/client/BookingHistory';
import EditProfile from './pages/client/EditProfile';
import Register from './pages/Register';
import Login from './pages/Login'; 

// --- ส่วนที่ 1: Protected Routes ---

// 1.1 สำหรับ Admin เท่านั้น
const AdminRoute = ({ children }) => {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return <Navigate to="/admin-login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      localStorage.removeItem('user'); 
      return <Navigate to="/admin-login" replace />;
    }
    return children;
  } catch (err) {
    localStorage.removeItem('user');
    return <Navigate to="/admin-login" replace />;
  }
};

// 1.2 สำหรับ Manager (และ Admin เข้าได้ด้วย)
const ManagerRoute = ({ children }) => {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return <Navigate to="/admin-login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'manager' && user.role !== 'admin') {
      localStorage.removeItem('user');
      return <Navigate to="/admin-login" replace />;
    }
    return children;
  } catch (err) {
    localStorage.removeItem('user');
    return <Navigate to="/admin-login" replace />;
  }
};

// --- ส่วน Layout หลัก (Navbar) ---
const AppLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  // ปรับสี active ให้เข้มขึ้นนิดนึง
  const isActive = (path) => location.pathname === path ? "text-blue-700 bg-blue-100" : "text-gray-600 hover:text-blue-700 hover:bg-blue-100";

  return (
    // ✅ เปลี่ยนจาก bg-blue-50 เป็น bg-blue-100 (สีฟ้าชัดขึ้น)
    <div className="min-h-screen bg-blue-100 pb-20 md:pb-0" style={{ backgroundColor: '#dbeafe' }}>
      
      {/* ✅ ปรับ Navbar ให้เป็นสีฟ้าโปร่งแสง หรือฟ้าอ่อนเข้ากับพื้นหลัง */}
      <nav className="hidden md:flex bg-blue-100/90 backdrop-blur-md shadow-sm px-8 py-4 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
        <img 
                src="images/ChatGPT Image 7 ม.ค. 2569 13_09_46.png" 
                alt="Logo" 
                className="h-12 w-auto object-contain transition-transform group-hover:scale-110" 
              />
           <span className="text-xl font-bold text-gray-800 tracking-tight">RCBAT HOTEL</span>
        </div>
        <div className="flex items-center gap-6">
           <Link to="/" className={`flex items-center gap-2 font-medium transition-colors ${location.pathname === '/' ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'}`}>หน้าหลัก</Link>
           {user && <Link to="/history" className={`flex items-center gap-2 font-medium transition-colors ${location.pathname === '/history' ? 'text-blue-700' : 'text-gray-600 hover:text-blue-700'}`}>ประวัติการจอง</Link>}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
               <div className="text-right hidden lg:block"><p className="text-sm font-bold text-gray-800">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
               <Link to="/profile" className="p-2 bg-blue-200/50 rounded-full hover:bg-blue-200 transition-colors"><UserCog className="w-5 h-5 text-gray-700" /></Link>
               <button onClick={onLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors"><LogOut className="w-4 h-4" /><span className="text-sm">ออกระบบ</span></button>
            </div>
          ) : (
             <Link to="/login" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"><LogIn className="w-4 h-4" />เข้าสู่ระบบ</Link>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>

      {/* เมนูด้านล่างสำหรับมือถือ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 flex justify-around p-2 pb-safe z-50">
        <Link to="/" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/')}`}><Home className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">หน้าหลัก</span></Link>
        {user && <Link to="/history" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/history')}`}><FileText className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">ประวัติ</span></Link>}
        {user ? <Link to="/profile" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/profile')}`}><UserCog className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">โปรไฟล์</span></Link> : <Link to="/login" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/login')}`}><LogIn className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">เข้าสู่ระบบ</span></Link>}
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (error) { localStorage.removeItem('user'); return null; }
    }
    return null;
  });

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ยืนยันการออกจากระบบ?', icon: 'question', showCancelButton: true, confirmButtonColor: '#22c55e', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกจากระบบ', cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/'; 
      }
    });
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/receipt" element={<Receipt />} />

        {/* ✅ Routes สำหรับ Admin */}
        <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
        } />

        {/* ✅ Routes สำหรับ Manager */}
        <Route path="/manager" element={
            <ManagerRoute>
              <ManagerDashboard />
            </ManagerRoute>
        } />

        {/* Routes สำหรับ User ทั่วไป */}
        <Route path="/" element={<AppLayout user={user} onLogout={handleLogout}><HomePage user={user} /></AppLayout>} />
        
        <Route path="/history" element={
            user ? (
              <AppLayout user={user} onLogout={handleLogout}><BookingHistory user={user} /></AppLayout>
            ) : <Navigate to="/login" />
        } />

        <Route path="/admin-management" element={<AdminManagement />} />

        <Route path="/profile" element={
            user ? (
              <AppLayout user={user} onLogout={handleLogout}><EditProfile user={user} onUpdateUser={handleLogin} /></AppLayout>
            ) : <Navigate to="/login" />
        } />

        {/* ✅ เพิ่มตัวดักจับหน้าเว็บที่ไม่เจอ (Error 404) ให้เด้งกลับหน้าแรกเสมอ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;