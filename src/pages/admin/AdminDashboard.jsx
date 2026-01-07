// client/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]); // State สำหรับเก็บคำขอ
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login'); return; }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        Swal.fire('เข้าถึงไม่ได้', 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น', 'error');
        navigate('/');
        return;
    }

    fetchBookings();
    fetchRescheduleRequests(); //  เรียกฟังก์ชันดึงคำขอ
  }, [navigate]);

  const fetchBookings = () => {
    fetch('https://hotel-booking-web-kfks.onrender.com/bookings')
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error(err));
  };

  //  ฟังก์ชันดึงคำขอจาก API
  const fetchRescheduleRequests = () => {
    fetch('https://hotel-booking-web-kfks.onrender.com/admin/reschedule-requests')
      .then(res => res.json())
      .then(data => setRescheduleRequests(data))
      .catch(err => console.error("Error fetching requests:", err));
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบผู้ดูแล?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ออกเลย', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user'); 
        navigate('/'); 
        window.location.reload();
      }
    });
  };

  const handleUpdateStatus = (id, newStatus) => {
    Swal.fire({ title: `ยืนยันเปลี่ยนสถานะเป็น "${newStatus}"?`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน' }).then((result) => {
        if (result.isConfirmed) {
            fetch('https://hotel-booking-web-kfks.onrender.com/updateBookingStatus', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            }).then(res => res.json()).then(() => {
                fetchBookings();
                Swal.fire('สำเร็จ', 'อัปเดตสถานะเรียบร้อย', 'success');
            });
        }
    });
  };

  // ✅ ฟังก์ชันใหม่: สำหรับกดดูรูปสลิป
  const handleViewSlip = (slipImage) => {
    if (!slipImage) return;
    
    // URL ของรูปภาพ (ต้องตรงกับโฟลเดอร์ที่ backend เปิดไว้)
    const imageUrl = `https://hotel-booking-web-kfks.onrender.com/uploads/${slipImage}`;

    Swal.fire({
        title: 'หลักฐานการโอนเงิน',
        imageUrl: imageUrl,
        imageAlt: 'Payment Slip',
        imageWidth: 400,
        showCloseButton: true,
        showConfirmButton: false, // ไม่ต้องมีปุ่มยืนยัน แค่ปิดก็พอ
        background: '#f8f9fa'
    });
  };

  //  ฟังก์ชันจัดการอนุมัติ/ปฏิเสธการเลื่อนวัน
  const handleRescheduleAction = (bookingId, action) => {
    const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
    Swal.fire({
        title: `ยืนยันการ${actionText}?`,
        text: action === 'approve' ? 'วันเข้าพักจะถูกเปลี่ยนทันที' : 'คำขอจะถูกยกเลิกและกลับเป็นวันเดิม',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
        confirmButtonColor: action === 'approve' ? '#28a745' : '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('https://hotel-booking-web-kfks.onrender.com/admin/approve-reschedule', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, action })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    Swal.fire('สำเร็จ', data.message, 'success');
                    fetchRescheduleRequests(); // รีโหลดลิสต์คำขอ
                    fetchBookings(); // รีโหลดลิสต์การจองหลัก
                } else {
                    Swal.fire('ผิดพลาด', data.message, 'error');
                }
            }).catch(err => console.error(err));
        }
    });
  };

  // --- Logic คำนวณกราฟ และ Report ---
  const getFilteredBookings = () => bookings.filter(b => {
      const date = new Date(b.check_in_date || b.booking_date);
      return date.getMonth() === parseInt(selectedMonth) && date.getFullYear() === parseInt(selectedYear) && (b.status === 'approved' || b.status === 'upcoming');
  });
  const calculateTotalRevenue = () => getFilteredBookings().reduce((sum, item) => sum + Number(item.price), 0);
  const getChartData = () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }), income: 0, bookings: 0 }));
    bookings.forEach(b => {
        if (b.status === 'approved' || b.status === 'upcoming') {
            const date = new Date(b.check_in_date);
            if (date.getFullYear() === new Date().getFullYear()) {
                const month = date.getMonth();
                data[month].income += Number(b.price);
                data[month].bookings += 1;
            }
        }
    });
    return data;
  };
  const chartData = getChartData();
  const totalIncomeYear = chartData.reduce((acc, curr) => acc + curr.income, 0);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2 rounded-lg text-xl">📊</span>
            <div><h1 className="text-xl font-bold text-gray-800">Admin Panel</h1><p className="text-xs text-gray-500">ระบบจัดการหลังบ้าน</p></div>
        </div>
        <div className="flex gap-2 items-center">
             <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📈 ภาพรวม</button>
             <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'bookings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📝 จัดการการจอง</button>
             
             {/* ปุ่มเมนูใหม่: คำขอเลื่อนวัน */}
             <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                📅 คำขอเลื่อนวัน {rescheduleRequests.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{rescheduleRequests.length}</span>}
             </button>

             <button onClick={() => setActiveTab('report')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'report' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📄 รายงาน</button>
             <div className="h-6 w-px bg-gray-300 mx-2"></div>
             <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">

        {/* TAB: Dashboard */}
        {activeTab === 'dashboard' && (
            <div className="space-y-6 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">รายได้รวม (ปีนี้)</p>
                        <h2 className="text-3xl font-bold text-green-600 mt-2">{totalIncomeYear.toLocaleString()} ฿</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">การจองทั้งหมด (ปีนี้)</p>
                        <h2 className="text-3xl font-bold text-blue-600 mt-2">{chartData.reduce((a,b)=>a+b.bookings,0)} ครั้ง</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">รอตรวจสอบ</p>
                        <h2 className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount} รายการ</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                        <h3 className="text-lg font-bold text-gray-700 mb-6">รายได้รายเดือน</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} /></BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                        <h3 className="text-lg font-bold text-gray-700 mb-6">จำนวนลูกค้า</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={3} dot={{r:4}} /></LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}
        
        {/* TAB: Bookings */}
        {activeTab === 'bookings' && (
            <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-700">รายการจองล่าสุด</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        {/* ✅ เพิ่มคอลัมน์ หลักฐานโอน */}
                        <tr className="bg-gray-100 text-gray-600 border-b">
                            <th className="p-3">ID</th>
                            <th className="p-3">ลูกค้า</th>
                            <th className="p-3">ห้องพัก</th>
                            <th className="p-3">วันเข้า-ออก</th>
                            <th className="p-3">ราคา</th>
                            <th className="p-3">หลักฐานโอน</th>
                            <th className="p-3">สถานะ</th>
                            <th className="p-3 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-500">#{item.id}</td>
                                <td className="p-3 font-bold text-blue-900">{item.user_id}</td>
                                <td className="p-3">{item.room_name}</td>
                                <td className="p-3 text-sm">{new Date(item.check_in_date).toLocaleDateString('th-TH')} <br/> ถึง {new Date(item.check_out_date).toLocaleDateString('th-TH')}</td>
                                <td className="p-3 font-bold">{Number(item.price).toLocaleString()}</td>
                                
                                {/* ✅ ส่วนแสดงปุ่มดูสลิป */}
                                <td className="p-3">
                                    {item.slip_image ? (
                                        <button 
                                            onClick={() => handleViewSlip(item.slip_image)}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900 text-xs font-bold border border-blue-200 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                                        >
                                            ดูสลีป
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )}
                                </td>

                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'pending_reschedule' ? 'bg-orange-100 text-orange-800' : item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-center flex gap-2 justify-center">
                                    {item.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">อนุมัติ</button>
                                            <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">ปฏิเสธ</button>
                                        </>
                                    )}
                                    {item.status === 'approved' && <button onClick={() => handleUpdateStatus(item.id, 'cancelled')} className="bg-gray-400 text-white px-2 py-1 rounded text-sm hover:bg-gray-500">ยกเลิก</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* TAB: Reschedule Requests (แสดงรายการคำขอ) */}
        {activeTab === 'requests' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
                 <h2 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">
                    📅 รายการขอเลื่อนวันเข้าพัก 
                    <button onClick={fetchRescheduleRequests} className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">↻ รีโหลด</button>
                 </h2>
                 {rescheduleRequests.length === 0 ? (
                    <div className="text-center p-10 text-gray-400 border-2 border-dashed rounded-lg">✅ ไม่มีคำขอเลื่อนวันใหม่ในขณะนี้</div>
                 ) : (
                    <div className="grid gap-4">
                        {rescheduleRequests.map((req) => (
                            <div key={req.id} className="bg-white border-l-4 border-orange-400 shadow p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-800">{req.room_name} <span className="text-sm font-normal text-gray-500">(Booking #{req.id})</span></h3>
                                    <p className="text-sm text-gray-600">ผู้จอง: {req.username || req.user_id}</p>
                                </div>
                                <div className="flex-2 flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase">วันเดิม</p>
                                        <p className="text-sm line-through text-red-400">{new Date(req.check_in_date).toLocaleDateString('th-TH')}</p>
                                        <p className="text-xs text-gray-400">ถึง {new Date(req.check_out_date).toLocaleDateString('th-TH')}</p>
                                    </div>
                                    <div className="text-gray-400">➡️</div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-green-600 uppercase">วันใหม่ที่ขอ</p>
                                        <p className="font-bold text-green-700">{new Date(req.request_check_in).toLocaleDateString('th-TH')}</p>
                                        <p className="text-xs text-green-600">ถึง {new Date(req.request_check_out).toLocaleDateString('th-TH')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                    <div className="text-right text-sm">
                                        <p className="text-gray-500">ราคาเดิม: {Number(req.price).toLocaleString()}</p>
                                        <p className="font-bold text-blue-600">ใหม่: {Number(req.request_price || req.price).toLocaleString()} ฿</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRescheduleAction(req.id, 'approve')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold shadow">✅ อนุมัติ</button>
                                        <button onClick={() => handleRescheduleAction(req.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold shadow">❌ ปฏิเสธ</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        )}

        {/* TAB: Report */}
        {activeTab === 'report' && (
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow flex gap-4 items-center print:hidden">
                    <label className="font-bold">เลือกเดือน:</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 rounded">{Array.from({length: 12}, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleDateString('th-TH', { month: 'long' })}</option>))}</select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border p-2 rounded">{[2024, 2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}</select>
                    <button onClick={() => window.print()} className="ml-auto bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-800">🖨️ พิมพ์รายงาน</button>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg min-h-[500px]">
                    <div className="text-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold text-gray-800">รายงานสรุปยอดประจำเดือน</h2>
                        <p className="text-gray-500">เดือน {new Date(0, selectedMonth).toLocaleDateString('th-TH', { month: 'long' })} พ.ศ. {parseInt(selectedYear) + 543}</p>
                    </div>
                    <table className="w-full text-left border border-collapse">
                        <thead className="bg-gray-200"><tr><th className="border p-2">วันที่เข้าพัก</th><th className="border p-2">รหัสการจอง</th><th className="border p-2">ห้องพัก</th><th className="border p-2 text-right">ราคา (บาท)</th></tr></thead>
                        <tbody>{getFilteredBookings().length > 0 ? (getFilteredBookings().map((b) => (<tr key={b.id}><td className="border p-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td><td className="border p-2">#{b.id}</td><td className="border p-2">{b.room_name}</td><td className="border p-2 text-right">{Number(b.price).toLocaleString()}</td></tr>))) : (<tr><td colSpan="4" className="text-center p-10 text-gray-400">ไม่มีข้อมูลการจองที่สำเร็จในเดือนนี้</td></tr>)}</tbody>
                        <tfoot className="bg-gray-100 font-bold"><tr><td colSpan="3" className="border p-3 text-right">รวมรายได้สุทธิ</td><td className="border p-3 text-right text-blue-700 text-lg">{calculateTotalRevenue().toLocaleString()}</td></tr></tfoot>
                    </table>
                </div>
            </div>
        )}

      </div>
      <style>{`@media print { .print\\:hidden { display: none !important; } body { background-color: white; } .shadow-lg { box-shadow: none !important; } }`}</style>
    </div>
  );
};

export default AdminDashboard;