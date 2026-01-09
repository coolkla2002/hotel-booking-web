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

// --- ส่วนที่ 1: Protected Routes (แก้ใหม่: ตัดวงจรการเด้ง) ---

// 1.1 สำหรับ Admin เท่านั้น
const AdminRoute = ({ children }) => {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return <Navigate to="/admin-login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      // ❌ เดิม: return <Navigate to="/" replace />; (นี่คือตัวทำเด้งวน)
      // ✅ ใหม่: ถ้าไม่ใช่ Admin อย่าส่งไปหน้า Home ให้ส่งไปหน้า Login หรือแจ้งเตือนแทน
      localStorage.removeItem('user'); // ลบ User ผีออก
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
    // อนุญาตทั้ง manager และ admin
    if (user.role !== 'manager' && user.role !== 'admin') {
      // ❌ เดิม: return <Navigate to="/" replace />;
      // ✅ ใหม่: ตัดวงจรเช่นกัน
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
// (ส่วนนี้เหมือนเดิม ไม่ต้องแก้)
const AppLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-gray-50";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <nav className="hidden md:flex bg-white shadow-sm px-8 py-4 justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <div className="bg-blue-600 p-2 rounded-lg"><Home className="text-white w-6 h-6" /></div>
           <span className="text-xl font-bold text-gray-800 tracking-tight">My Hotel</span>
        </div>
        <div className="flex items-center gap-6">
           <Link to="/" className={`flex items-center gap-2 font-medium transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>หน้าหลัก</Link>
           {user && <Link to="/history" className={`flex items-center gap-2 font-medium transition-colors ${location.pathname === '/history' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>ประวัติการจอง</Link>}
           <Link to="/contact" className={`flex items-center gap-2 font-medium transition-colors ${location.pathname === '/contact' ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>ติดต่อเรา</Link>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
               <div className="text-right hidden lg:block"><p className="text-sm font-bold text-gray-800">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
               <Link to="/profile" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><UserCog className="w-5 h-5 text-gray-600" /></Link>
               <button onClick={onLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors"><LogOut className="w-4 h-4" /><span className="text-sm">ออกระบบ</span></button>
            </div>
          ) : (
             <Link to="/login" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"><LogIn className="w-4 h-4" />เข้าสู่ระบบ</Link>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe z-50">
        <Link to="/" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/')}`}><Home className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">หน้าหลัก</span></Link>
        {user && <Link to="/history" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/history')}`}><FileText className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">ประวัติ</span></Link>}
        <Link to="/contact" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/contact')}`}><Phone className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">ติดต่อ</span></Link>
        {user ? <Link to="/profile" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/profile')}`}><UserCog className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">โปรไฟล์</span></Link> : <Link to="/login" className={`flex flex-col items-center p-2 rounded-lg w-16 ${isActive('/login')}`}><LogIn className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">เข้าสู่ระบบ</span></Link>}
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  // ✅ ใช้ Logic เดิมที่ผมให้ไป (ถูกต้องแล้ว)
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
      title: 'ยืนยันการออกจากระบบ?', icon: 'question', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกจากระบบ', cancelButtonText: 'ยกเลิก'
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

        <Route path="/contact" element={<AppLayout user={user} onLogout={handleLogout}><ContactPage /></AppLayout>} />
      </Routes>
    </Router>
  );
}

const ContactPage = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Phone className="w-8 h-8 text-blue-600" /></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ติดต่อเรา</h2>
        <p className="text-gray-600 mb-6">มีข้อสงสัยหรือต้องการความช่วยเหลือ? ติดต่อเราได้ตลอด 24 ชม.</p>
        <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-lg font-medium text-gray-700"><MapPin className="w-5 h-5 text-red-500" /> 888 ถ.มิตรภาพ อ.เมือง จ.นครราชสีมา</div>
            <div className="flex items-center justify-center gap-3 text-lg font-medium text-gray-700"><Phone className="w-5 h-5 text-green-500" /> 098-765-4321</div>
        </div>
    </div>
);

export default App;