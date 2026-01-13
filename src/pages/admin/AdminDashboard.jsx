// client/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { ImageIcon, Search, FileText } from 'lucide-react'; // เพิ่ม FileText icon
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API_URL from "/src/config";

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('all'); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();
  const reportRef = useRef(null); 

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
  const months = [
    { value: '1', label: 'มกราคม' }, { value: '2', label: 'กุมภาพันธ์' }, { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' }, { value: '5', label: 'พฤษภาคม' }, { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' }, { value: '8', label: 'สิงหาคม' }, { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' }, { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' }
  ];

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
    fetchRescheduleRequests(); 
  }, [navigate]);

  const fetchBookings = () => {
    fetch(`${API_URL}/bookings`)
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error(err));
  };

  const fetchRescheduleRequests = () => {
    fetch(`${API_URL}/admin/reschedule-requests`)
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
            fetch(`${API_URL}/updateBookingStatus`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            }).then(res => res.json()).then(() => {
                fetchBookings();
                Swal.fire('สำเร็จ', 'อัปเดตสถานะเรียบร้อย', 'success');
            });
        }
    });
  };

  const handleViewImage = (imgName) => {
    if (!imgName) {
        Swal.fire('ไม่พบรูปภาพ', 'รายการนี้ไม่มีรูปภาพแนบมา', 'info');
        return;
    }
    let cleanPath = imgName;
    if (!imgName.startsWith('uploads/')) {
        cleanPath = `uploads/${imgName}`;
    }
    const imgUrl = `${API_URL}/${cleanPath}`;

    Swal.fire({
        title: 'หลักฐานการโอนเงิน',
        imageUrl: imgUrl,
        imageAlt: 'Slip Evidence',
        showCloseButton: true,
        showConfirmButton: false,
        width: 'auto',
        customClass: {
            image: 'max-h-[70vh] object-contain rounded-lg shadow-sm',
            popup: 'max-w-3xl'
        }
    });
  };

  const handleRescheduleAction = (bookingId, action) => {
    const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
    Swal.fire({
        title: `ยืนยันการ${actionText}?`,
        text: action === 'approve' ? 'วันเข้าพักจะถูกเปลี่ยนทันที' : 'คำขอจะถูกยกเลิกและกลับเป็นวันเดิม',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
        confirmButtonColor: action === 'approve' ? '#28a745' : '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_URL}/admin/approve-reschedule`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, action })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    Swal.fire('สำเร็จ', data.message, 'success');
                    fetchRescheduleRequests(); 
                    fetchBookings(); 
                } else {
                    Swal.fire('ผิดพลาด', data.message, 'error');
                }
            }).catch(err => console.error(err));
        }
    });
  };

  const getChartData = () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }), income: 0, bookings: 0 }));
    bookings.forEach(b => {
        if (b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed') {
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

  const dashboardChartData = getChartData();
  const totalIncomeYear = dashboardChartData.reduce((acc, curr) => acc + curr.income, 0);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  const getMonthlyData = () => {
    const data = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }), income: 0, count: 0 
    }));
    bookings.forEach(b => {
        if (b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed') {
            const d = new Date(b.check_in_date);
            if (d.getFullYear() === parseInt(selectedYear)) {
                data[d.getMonth()].income += Number(b.price);
                data[d.getMonth()].count += 1; 
            }
        }
    });
    return data;
  };

  const getRoomTypeData = () => {
    const types = {};
    bookings.forEach(b => {
        if (b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed') {
            if (types[b.room_name]) types[b.room_name] += 1;
            else types[b.room_name] = 1;
        }
    });
    return Object.keys(types).map(key => ({ name: key, value: types[key] }));
  };

  const exportPDF = () => {
    const input = reportRef.current;
    Swal.fire({ title: 'กำลังสร้างไฟล์ PDF...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`รายงานผู้ดูแล_${selectedYear}.pdf`);
        Swal.close();
        Swal.fire('สำเร็จ', 'ดาวน์โหลดรายงานเรียบร้อยแล้ว', 'success');
    });
  };

  const filteredBookingsForReport = bookings.filter(b => {
    if (b.status !== 'approved' && b.status !== 'upcoming' && b.status !== 'completed') return false;
    const date = new Date(b.check_in_date);
    const isYearMatch = date.getFullYear() === parseInt(selectedYear);
    const isMonthMatch = selectedMonth === 'all' ? true : (date.getMonth() + 1) === parseInt(selectedMonth);
    return isYearMatch && isMonthMatch;
  });

  const totalRevenueReport = filteredBookingsForReport.reduce((sum, b) => sum + Number(b.price), 0);
  const totalBookingsCountReport = filteredBookingsForReport.length;
  const averagePriceReport = totalBookingsCountReport > 0 ? totalRevenueReport / totalBookingsCountReport : 0;
  const selectedMonthLabel = selectedMonth === 'all' ? '' : `เดือน${months.find(m => m.value === selectedMonth)?.label} `;

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
             <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                📅 คำขอเลื่อนวัน {rescheduleRequests.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{rescheduleRequests.length}</span>}
             </button>
             <button onClick={() => setActiveTab('report')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'report' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📄 รายงาน</button>
             <button onClick={() => navigate('/admin-management')} className="px-4 py-2 rounded-lg text-sm font-bold transition text-gray-600 hover:bg-gray-100 flex items-center gap-2">⚙️ จัดการข้อมูล</button>
             <div className="h-6 w-px bg-gray-300 mx-2"></div>
             <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold">Logout</button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === 'dashboard' && (
            <div className="space-y-6 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">รายได้รวม (ปีนี้)</p>
                        <h2 className="text-3xl font-bold text-green-600 mt-2">{totalIncomeYear.toLocaleString()} ฿</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">การจองทั้งหมด (ปีนี้)</p>
                        <h2 className="text-3xl font-bold text-blue-600 mt-2">{dashboardChartData.reduce((a,b)=>a+b.bookings,0)} ครั้ง</h2>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">รอตรวจสอบ</p>
                        <h2 className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount} รายการ</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-700 mb-6">รายได้รายเดือน</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dashboardChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} /></BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-700 mb-6">จำนวนลูกค้า</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={dashboardChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={3} dot={{r:4}} /></LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'bookings' && (
            <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-700">รายการจองล่าสุด</h2>
                    <div className="relative">
                        <input type="text" placeholder="ค้นหา User ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 border-b">
                      <th className="p-3">ID</th><th className="p-3">ลูกค้า (User ID)</th><th className="p-3">ห้องพัก</th><th className="p-3">วันเข้า-ออก</th><th className="p-3">ราคา</th><th className="p-3">หลักฐานโอน</th><th className="p-3 text-center">ใบเสร็จ</th><th className="p-3">สถานะ</th><th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                      {bookings.filter(b => b.user_id.toString().includes(searchTerm)).map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-gray-500">#{item.id}</td>
                          <td className="p-3 font-bold text-blue-900">{item.user_id}</td>
                          <td className="p-3">{item.room_name}</td>
                          <td className="p-3 text-sm">{new Date(item.check_in_date).toLocaleDateString('th-TH')} <br/> ถึง {new Date(item.check_out_date).toLocaleDateString('th-TH')}</td>
                          <td className="p-3 font-bold">{Number(item.price).toLocaleString()}</td>
                          <td className="p-3 text-center">
                              {item.slip_image ? (
                                  <button onClick={() => handleViewImage(item.slip_image)} className="flex items-center gap-1 text-blue-600 hover:text-blue-900 text-xs font-bold border border-blue-200 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors mx-auto">ดูสลิป</button>
                              ) : <span className="text-gray-400 text-xs">-</span>}
                          </td>
                          {/* --- ส่วนที่เพิ่มปุ่มใบเสร็จในหน้า Bookings --- */}
                          <td className="p-3 text-center">
                              <button 
                                onClick={() => navigate('/receipt', { state: { booking: item } })}
                                className="text-purple-600 hover:text-purple-900 text-xs font-bold border border-purple-200 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                              >
                                📄 ใบเสร็จ
                              </button>
                          </td>
                          {/* ------------------------------------------ */}
                          <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'pending_reschedule' ? 'bg-orange-100 text-orange-800' : item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status.toUpperCase()}</span>
                          </td>
                          <td className="p-3 text-center flex gap-2 justify-center">
                              {item.status === 'pending' && (
                                  <>
                                      <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">อนุมัติ</button>
                                      <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">ปฏิเสธ</button>
                                  </>
                              )}
                              {(item.status === 'approved' || item.status === 'upcoming') && <button onClick={() => handleUpdateStatus(item.id, 'cancelled')} className="bg-gray-400 text-white px-2 py-1 rounded text-sm hover:bg-gray-500">ยกเลิก</button>}
                          </td>
                      </tr>
                      ))}
                  </tbody>
                </table>
            </div>
        )}

        {activeTab === 'requests' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
                 <h2 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">📅 รายการขอเลื่อนวันเข้าพัก <button onClick={fetchRescheduleRequests} className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">↻ รีโหลด</button></h2>
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
                                    <div className="text-center"><p className="text-xs font-bold text-gray-400 uppercase">วันเดิม</p><p className="text-sm line-through text-red-400">{new Date(req.check_in_date).toLocaleDateString('th-TH')}</p><p className="text-xs text-gray-400">ถึง {new Date(req.check_out_date).toLocaleDateString('th-TH')}</p></div>
                                    <div className="text-gray-400">➡️</div>
                                    <div className="text-center"><p className="text-xs font-bold text-green-600 uppercase">วันใหม่ที่ขอ</p><p className="font-bold text-green-700">{new Date(req.request_check_in).toLocaleDateString('th-TH')}</p><p className="text-xs text-green-600">ถึง {new Date(req.request_check_out).toLocaleDateString('th-TH')}</p></div>
                                </div>
                                <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                    <div className="text-right text-sm"><p className="text-gray-500">ราคาเดิม: {Number(req.price).toLocaleString()}</p><p className="font-bold text-blue-600">ใหม่: {Number(req.request_price || req.price).toLocaleString()} ฿</p></div>
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

        {activeTab === 'report' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">จัดการรายงาน</h2>
                    <div className="flex gap-4">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 rounded-lg font-bold text-gray-700">
                            <option value="all">ดูภาพรวมทั้งปี</option>
                            {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border p-2 rounded-lg font-bold text-gray-700">
                            <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                        </select>
                        <button onClick={exportPDF} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow flex items-center gap-2">Download PDF</button>
                    </div>
                </div>

                <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="text-center mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold text-slate-800">รายงานสรุปผลประกอบการ {selectedMonthLabel}ประจำปี {selectedYear}</h1>
                        <p className="text-gray-500">RCBAT Hotel</p>
                        <p className="text-sm text-gray-400 mt-2">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center"><p className="text-blue-600 font-bold mb-2">รายได้รวม</p><h3 className="text-3xl font-bold text-slate-800">{totalRevenueReport.toLocaleString()} ฿</h3></div>
                        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100 text-center"><p className="text-orange-600 font-bold mb-2">จำนวนการจอง</p><h3 className="text-3xl font-bold text-slate-800">{totalBookingsCountReport} ครั้ง</h3></div>
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center"><p className="text-purple-600 font-bold mb-2">ราคาเฉลี่ย/ห้อง</p><h3 className="text-3xl font-bold text-slate-800">{averagePriceReport.toFixed(0).toLocaleString()} ฿</h3></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h3 className="text-lg font-bold mb-4 text-center">แนวโน้มรายได้รายเดือน</h3>
                            <div style={{ width: '100%', height: '350px', minHeight: '350px', position: 'relative' }}>
                                <ResponsiveContainer width="99%" height="100%"><BarChart data={getMonthlyData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h3 className="text-lg font-bold mb-4 text-center">สัดส่วนห้องพัก</h3>
                            <div style={{ width: '100%', height: '350px', minHeight: '350px', position: 'relative' }}>
                                <ResponsiveContainer width="99%" height="100%"><PieChart><Pie data={getRoomTypeData()} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" label>{getRoomTypeData().map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 mb-8">
                        <h3 className="text-lg font-bold mb-2 bg-slate-100 p-2 border-l-4 border-blue-500">รายละเอียดผู้จอง {selectedMonthLabel} ({filteredBookingsForReport.length} รายการ)</h3>
                        <table className="w-full text-sm text-left text-gray-500 border">
                            <thead className="text-xs text-white uppercase bg-slate-600">
                                <tr>
                                  <th className="px-4 py-3">วันที่เช็คอิน</th><th className="px-4 py-3">ชื่อผู้จอง</th><th className="px-4 py-3">ประเภทห้อง</th><th className="px-4 py-3 text-right">ราคา</th><th className="px-4 py-3 text-center">หลักฐาน</th><th className="px-4 py-3 text-center">ใบเสร็จ</th><th className="px-4 py-3 text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookingsForReport.map((b, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-2 font-semibold text-gray-900">{b.fullname || b.name || `User ID: ${b.user_id}`}</td>
                                        <td className="px-4 py-2">{b.room_name}</td>
                                        <td className="px-4 py-2 text-right">{Number(b.price).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-center">
                                            { (b.slip_image || b.payment_image || b.image) ? (<button onClick={() => handleViewImage(b.slip_image || b.payment_image || b.image)} className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors"><ImageIcon size={18} /></button>) : (<span className="text-gray-300">-</span>)}
                                        </td>
                                        {/* --- ส่วนที่เพิ่มปุ่มใบเสร็จในหน้า Report --- */}
                                        <td className="px-4 py-2 text-center">
                                            <button 
                                              onClick={() => navigate('/receipt', { state: { booking: b } })}
                                              className="bg-purple-50 text-purple-600 p-2 rounded-full hover:bg-purple-100 transition-colors"
                                            >
                                              <FileText size={18} />
                                            </button>
                                        </td>
                                        {/* ------------------------------------------ */}
                                        <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs text-white ${b.status === 'approved' ? 'bg-green-500' : b.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'}`}>{b.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-2">ตารางสรุปรายได้ (รายปี)</h3>
                        <table className="w-full text-sm text-left text-gray-500 border">
                            <thead className="text-xs text-white uppercase bg-slate-700">
                              <tr>
                                <th className="px-6 py-3">เดือน</th><th className="px-6 py-3 text-center">จำนวนที่จอง (ห้อง)</th><th className="px-6 py-3 text-right">รายได้ (บาท)</th>
                              </tr>
                            </thead>
                            <tbody>
                                {(selectedMonth === 'all' ? getMonthlyData() : [getMonthlyData()[parseInt(selectedMonth) - 1]]).map((m, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-2 font-medium text-gray-900">{m.name}</td><td className="px-6 py-2 text-center">{m.count}</td><td className="px-6 py-2 text-right">{m.income.toLocaleString()}</td></tr>
                                ))}
                                <tr className="bg-gray-100 font-bold"><td className="px-6 py-2 text-gray-900">รวมทั้งหมด</td><td className="px-6 py-2 text-center">{filteredBookingsForReport.length}</td><td className="px-6 py-2 text-right">{totalRevenueReport.toLocaleString()}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;