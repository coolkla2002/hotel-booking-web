import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' หรือ 'report'
  
  // State สำหรับตัวกรองรายงาน
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  // ดึงข้อมูลทั้งหมดเมื่อโหลดหน้า
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    fetch('http://127.0.0.1:3001/bookings')
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error(err));
  };

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบผู้ดูแล?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ออกเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user'); // หรือ key ที่เก็บ admin token
        navigate('/'); 
        window.location.reload();
      }
    });
  };

  // ฟังก์ชันเปลี่ยนสถานะ (อนุมัติ/ปฏิเสธ)
  const handleUpdateStatus = (id, newStatus) => {
    Swal.fire({
        title: `ยืนยันเปลี่ยนสถานะเป็น "${newStatus}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('http://127.0.0.1:3001/updateBookingStatus', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })
            .then(res => res.json())
            .then(() => {
                fetchBookings(); // โหลดข้อมูลใหม่
                Swal.fire('สำเร็จ', 'อัปเดตสถานะเรียบร้อย', 'success');
            });
        }
    });
  };

  // ฟังก์ชันเปิดดูรูปสลิป
  const openSlip = (filename) => {
    if (!filename) return;
    Swal.fire({
        imageUrl: `http://127.0.0.1:3001/uploads/${filename}`,
        imageAlt: 'Slip',
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto'
    });
  };

  // --- ส่วนคำนวณสถิติ (Report Logic) ---
  const getFilteredBookings = () => {
    return bookings.filter(b => {
        const date = new Date(b.check_in_date || b.booking_date);
        return date.getMonth() === parseInt(selectedMonth) && 
               date.getFullYear() === parseInt(selectedYear) &&
               (b.status === 'approved' || b.status === 'upcoming'); // นับเฉพาะที่จ่ายเงินแล้ว
    });
  };

  const calculateTotalRevenue = () => {
    const filtered = getFilteredBookings();
    return filtered.reduce((sum, item) => sum + Number(item.price), 0);
  };

  // -----------------------------------

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* Top Bar */}
      <nav className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <div>
            <h1 className="text-2xl font-bold">🛡️ Admin Panel</h1>
            <p className="text-xs text-blue-200">ระบบจัดการหลังบ้าน</p>
        </div>
        <div className="flex gap-4 items-center">
             <button 
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2 rounded transition ${activeTab === 'bookings' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-800'}`}
             >
                📝 จัดการการจอง
             </button>
             <button 
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded transition ${activeTab === 'report' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-800'}`}
             >
                📊 รายงานประจำเดือน
             </button>
             <div className="h-6 w-px bg-blue-500 mx-2"></div>
             <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-bold shadow"
             >
                Logout
             </button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        
        {/* ================= TAB 1: Manage Bookings ================= */}
        {activeTab === 'bookings' && (
            <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-700">รายการจองล่าสุด</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 border-b">
                            <th className="p-3">ID</th>
                            <th className="p-3">ลูกค้า</th>
                            <th className="p-3">ห้องพัก</th>
                            <th className="p-3">วันเข้า-ออก</th>
                            <th className="p-3">ราคา</th>
                            <th className="p-3">หลักฐาน</th>
                            <th className="p-3">สถานะ</th>
                            <th className="p-3 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500">#{item.id}</td>
                                <td className="p-3 font-bold text-blue-900">User ID: {item.user_id}</td>
                                <td className="p-3">{item.room_name}</td>
                                <td className="p-3 text-sm">
                                    {new Date(item.check_in_date).toLocaleDateString('th-TH')} <br/>
                                    ถึง {new Date(item.check_out_date).toLocaleDateString('th-TH')}
                                </td>
                                <td className="p-3 font-bold">{Number(item.price).toLocaleString()}</td>
                                <td className="p-3">
                                    {item.payment_slip ? (
                                        <button onClick={() => openSlip(item.payment_slip)} className="text-blue-500 underline text-sm">
                                            ดูสลิป
                                        </button>
                                    ) : <span className="text-gray-400 text-sm">-</span>}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {item.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-center flex gap-2 justify-center">
                                    {item.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">
                                                อนุมัติ
                                            </button>
                                            <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">
                                                ปฏิเสธ
                                            </button>
                                        </>
                                    )}
                                    {item.status === 'approved' && (
                                         <button onClick={() => handleUpdateStatus(item.id, 'cancelled')} className="bg-gray-400 text-white px-2 py-1 rounded text-sm hover:bg-gray-500">
                                            ยกเลิก
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* ================= TAB 2: Monthly Report ================= */}
        {activeTab === 'report' && (
            <div className="space-y-6">
                
                {/* 1. Controller เลือกเดือน/ปี */}
                <div className="bg-white p-4 rounded-lg shadow flex gap-4 items-center print:hidden">
                    <label className="font-bold">เลือกเดือน:</label>
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border p-2 rounded"
                    >
                        {Array.from({length: 12}, (_, i) => (
                            <option key={i} value={i}>
                                {new Date(0, i).toLocaleDateString('th-TH', { month: 'long' })}
                            </option>
                        ))}
                    </select>

                    <label className="font-bold">ปี:</label>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="border p-2 rounded"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button onClick={() => window.print()} className="ml-auto bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-800">
                        🖨️ พิมพ์รายงาน
                    </button>
                </div>

                {/* 2. Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg opacity-80">ยอดขายรวม (Total Revenue)</h3>
                        <p className="text-4xl font-bold mt-2">{calculateTotalRevenue().toLocaleString()} ฿</p>
                        <p className="text-sm mt-2 opacity-70">ประจำเดือน {new Date(0, selectedMonth).toLocaleDateString('th-TH', { month: 'long' })} {selectedYear}</p>
                    </div>

                    <div className="bg-green-500 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg opacity-80">การจองสำเร็จ (Bookings)</h3>
                        <p className="text-4xl font-bold mt-2">{getFilteredBookings().length} รายการ</p>
                        <p className="text-sm mt-2 opacity-70">เฉพาะสถานะ Approved/Upcoming</p>
                    </div>

                    <div className="bg-yellow-500 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg opacity-80">รอตรวจสอบ (Pending)</h3>
                        <p className="text-4xl font-bold mt-2">
                            {bookings.filter(b => b.status === 'pending').length} รายการ
                        </p>
                        <p className="text-sm mt-2 opacity-70">ยอดคงค้างทั้งหมดในระบบ</p>
                    </div>
                </div>

                {/* 3. Report Table */}
                <div className="bg-white p-8 rounded-xl shadow-lg min-h-[500px]">
                    <div className="text-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold text-gray-800">รายงานสรุปยอดประจำเดือน</h2>
                        <p className="text-gray-500">
                            เดือน {new Date(0, selectedMonth).toLocaleDateString('th-TH', { month: 'long' })} พ.ศ. {parseInt(selectedYear) + 543}
                        </p>
                    </div>

                    <table className="w-full text-left border border-collapse">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border p-2">วันที่เข้าพัก</th>
                                <th className="border p-2">รหัสการจอง</th>
                                <th className="border p-2">ห้องพัก</th>
                                <th className="border p-2 text-right">ราคา (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredBookings().length > 0 ? (
                                getFilteredBookings().map((b) => (
                                    <tr key={b.id}>
                                        <td className="border p-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td>
                                        <td className="border p-2">#{b.id}</td>
                                        <td className="border p-2">{b.room_name}</td>
                                        <td className="border p-2 text-right">{Number(b.price).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center p-10 text-gray-400">
                                        ไม่มีข้อมูลการจองที่สำเร็จในเดือนนี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold">
                            <tr>
                                <td colSpan="3" className="border p-3 text-right">รวมรายได้สุทธิ</td>
                                <td className="border p-3 text-right text-blue-700 text-lg">
                                    {calculateTotalRevenue().toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div className="mt-10 text-right text-sm text-gray-500 hidden print:block">
                        <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
                        <p>ผู้พิมพ์: Admin</p>
                    </div>
                </div>

            </div>
        )}

      </div>

      {/* CSS สำหรับซ่อนส่วนที่ไม่ต้องการพิมพ์ */}
      <style>{`
        @media print {
            .print\\:hidden { display: none !important; }
            body { background-color: white; }
            .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Admin;