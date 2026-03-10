import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, UserCog, Phone, MapPin } from 'lucide-react'; // ใช้ไอคอนแทนรูป

const SidebarItem = ({ icon: Icon, text, to, active }) => (
  <Link to={to} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${active ? 'bg-blue-200 text-hotel-text font-semibold' : 'text-gray-600 hover:bg-blue-100'}`}>
    <Icon size={24} />
    <span>{text}</span>
  </Link>
);

const AppLayout = ({ children, user }) => {
  const location = useLocation();

  return (
    // ✅ เปลี่ยนพื้นหลังสุดเป็น bg-blue-50 ให้ครอบคลุมทั้งหน้าจอ
    <div className="flex min-h-screen bg-blue-50">
      {/* --- Sidebar ด้านซ้าย --- */}
      <aside className="w-72 bg-blue-50 p-6 flex flex-col shadow-xl z-10">
        {/* โลโก้ */}
        <div className="mb-10 flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">RC</div>
            <span className="text-2xl font-bold text-hotel-text">RCBAT Hotel</span>
        </div>

        {/* เมนูนำทาง */}
        <nav className="space-y-2 flex-1">
          <SidebarItem icon={Home} text="หน้าหลัก/HOME" to="/" active={location.pathname === '/'} />
          <SidebarItem icon={FileText} text="ประวัติการจอง" to="/history" active={location.pathname === '/history'} />
          <SidebarItem icon={UserCog} text="แก้ไขข้อมูลผู้ใช้" to="/profile" active={location.pathname === '/profile'} />
          <SidebarItem icon={Phone} text="ติดต่อ/contact" to="/contact" active={location.pathname === '/contact'} />
        </nav>
        
        {/* ส่วนแผนที่ */}
        <div className="mt-10">
            <div className="flex items-center space-x-2 mb-4 text-hotel-text font-semibold">
                <MapPin /> <span>ตำแหน่งที่ตั้ง/location</span>
            </div>
            {/* ใส่รูปแผนที่จำลอง หรือ Google Maps iframe ตรงนี้ */}
            <div className="w-full h-64 bg-gray-300 rounded-xl overflow-hidden shadow-md border-2 border-white">
                <img src="https://via.placeholder.com/300x250.png?text=Map+Placeholder" alt="Map" className="w-full h-full object-cover" />
            </div>
        </div>
      </aside>

      {/* --- เนื้อหาหลักด้านขวา --- */}
      {/* ✅ บังคับให้พื้นที่ด้านขวาทั้งหมดเป็นสีฟ้า bg-blue-50 */}
      <main className="flex-1 flex flex-col bg-blue-50">
        {/* Header */}
        <header className="bg-white/30 backdrop-blur-md p-4 flex justify-between items-center shadow-sm px-8">
             <h1 className="text-xl font-semibold text-hotel-text">
                {/* แสดงชื่อหน้าตาม Route ปัจจุบัน */}
                {location.pathname === '/' ? 'หน้าหลัก/HOME' : 
                 location.pathname === '/history' ? 'ประวัติการจอง/Booking history' :
                 location.pathname === '/profile' ? 'แก้ไขข้อมูลผู้ใช้/Edit user information' : ''}
             </h1>
             
             {/* ส่วนแสดงผู้ใช้ */}
             <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden border-2 border-white shadow-sm">
                     <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" />
                 </div>
                 <span className="font-medium text-hotel-text">{user?.name || 'Guest'}</span>
             </div>
        </header>

        {/* พื้นที่แสดงเนื้อหาของแต่ละหน้า */}
        {/* ✅ เติม bg-blue-50 ตรงนี้ด้วยเพื่อให้ชัวร์ว่าเนื้อหาข้างในไม่โดนสีขาวทับ */}
        <div className="p-8 overflow-y-auto flex-1 bg-blue-50">
            {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;