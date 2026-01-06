import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ออกเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user'); // ลบข้อมูล User
        navigate('/'); // กลับหน้าแรก
        window.location.reload(); // รีโหลดหน้าหนึ่งทีให้สะอาด
      }
    });
  };

  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-blue-600">Hotel Booking</Link>
      
      <div className="flex gap-4 items-center">
        {user ? (
            <>
                <span className="text-gray-600">สวัสดี, {user.firstname || user.name}</span>
                <Link to="/my-bookings" className="text-blue-600 hover:underline">ประวัติการจอง</Link>
                <button 
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                    Logout
                </button>
            </>
        ) : (
            <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600">เข้าสู่ระบบ</Link>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">สมัครสมาชิก</Link>
            </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;