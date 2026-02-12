// client/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { ImageIcon, Search, FileText, XCircle, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API_URL from "/src/config";

const AdminDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [rescheduleRequests, setRescheduleRequests] = useState([]);
    
    const navigate = useNavigate();
    const location = useLocation(); 
    const reportRef = useRef(null);

    const getTabFromUrl = () => {
        const params = new URLSearchParams(location.search);
        return params.get('tab') || 'dashboard';
    };
    
    const activeTab = getTabFromUrl();

    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const months = [
        { value: '1', label: 'มกราคม' }, { value: '2', label: 'กุมภาพันธ์' }, { value: '3', label: 'มีนาคม' },
        { value: '4', label: 'เมษายน' }, { value: '5', label: 'พฤษภาคม' }, { value: '6', label: 'มิถุนายน' },
        { value: '7', label: 'กรกฎาคม' }, { value: '8', label: 'สิงหาคม' }, { value: '9', label: 'กันยายน' },
        { value: '10', label: 'ตุลาคม' }, { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' }
    ];

    const handleTabChange = (tabName) => {
        if (activeTab !== tabName) {
            navigate(`?tab=${tabName}`); 
            window.scrollTo(0, 0); 
        }
    };

    const fetchBookings = useCallback(() => {
        fetch(`${API_URL}/bookings`)
            .then(res => res.json())
            .then(data => setBookings(data))
            .catch(err => console.error(err));
    }, []);

    const fetchRescheduleRequests = useCallback(() => {
        fetch(`${API_URL}/admin/reschedule-requests`)
            .then(res => res.json())
            .then(data => setRescheduleRequests(data))
            .catch(err => console.error("Error fetching requests:", err));
    }, []);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { 
            navigate('/login', { replace: true }); 
            return; 
        }
        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'admin') {
                Swal.fire({ icon: 'error', title: 'เข้าถึงไม่ได้', text: 'สำหรับ Admin เท่านั้น', timer: 1500, showConfirmButton: false })
                    .then(() => navigate('/', { replace: true }));
            }
        } catch (e) {
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (activeTab === 'bookings' || activeTab === 'dashboard' || activeTab === 'report') {
            fetchBookings();
        }
        if (activeTab === 'requests' || activeTab === 'dashboard') {
            fetchRescheduleRequests();
        }
        if (activeTab === 'cancel_requests') {
            fetchBookings(); 
        }
    }, [activeTab, fetchBookings, fetchRescheduleRequests]);

    const handleRescheduleAction = async (requestId, action) => {
        const actionText = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
        const result = await Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: action === 'approve' ? 'วันเข้าพักจะถูกเปลี่ยนทันที' : 'คำขอจะถูกยกเลิกและกลับเป็นวันเดิม',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: action === 'approve' ? '#10B981' : '#d33'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}/admin/approve-reschedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking_id: requestId, action: action })
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('สำเร็จ', data.message, 'success');
                    fetchRescheduleRequests();
                    fetchBookings();
                } else {
                    Swal.fire('ผิดพลาด', data.message, 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            }
        }
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'ออกจากระบบผู้ดูแล?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ออกเลย', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('user');
                navigate('/', { replace: true });
                window.location.reload();
            }
        });
    };

    const handleUpdateStatus = (id, newStatus) => {
        const statusMap = {
            'approved': 'อนุมัติการจอง',
            'rejected': 'ปฏิเสธการจอง',
            'cancelled': 'ยืนยันการยกเลิก (คืนเงินแล้ว)',
            'upcoming': 'เปลี่ยนเป็นสถานะปกติ'
        };

        Swal.fire({ 
            title: `ยืนยันการ${statusMap[newStatus] || newStatus}?`, 
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonText: 'ยืนยัน' 
        }).then((result) => {
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
            title: 'หลักฐาน',
            imageUrl: imgUrl,
            imageAlt: 'Evidence',
            showCloseButton: true,
            showConfirmButton: false,
            width: 'auto',
            customClass: {
                image: 'max-h-[70vh] object-contain rounded-lg shadow-sm',
                popup: 'max-w-3xl'
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
    const cancelRequests = bookings.filter(b => b.status === 'pending_cancel');

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
                <div className="flex gap-2 items-center flex-wrap">
                    <button onClick={() => handleTabChange('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📈 ภาพรวม</button>
                    <button onClick={() => handleTabChange('bookings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'bookings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📝 จัดการการจอง</button>
                    <button onClick={() => handleTabChange('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'requests' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                        📅 เลื่อนวัน {rescheduleRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{rescheduleRequests.length}</span>}
                    </button>
                    <button onClick={() => handleTabChange('cancel_requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'cancel_requests' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                        ❌ คำขอยกเลิก {cancelRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{cancelRequests.length}</span>}
                    </button>
                    <button onClick={() => handleTabChange('report')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'report' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>📄 รายงาน</button>
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
                                <h2 className="text-3xl font-bold text-blue-600 mt-2">{dashboardChartData.reduce((a, b) => a + b.bookings, 0)} ครั้ง</h2>
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
                                        <LineChart data={dashboardChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
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
                                    <th className="p-3">ID</th><th className="p-3">ลูกค้า (User ID)</th><th className="p-3">ห้องพัก</th><th className="p-3">วันเข้า-ออก</th><th className="p-3">ราคา</th><th className="p-3 text-center">หลักฐาน</th><th className="p-3 text-center">ใบเสร็จ</th><th className="p-3">สถานะ</th><th className="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings
                                    .filter(b => b.user_id.toString().includes(searchTerm))
                                    .sort((a, b) => {
                                        const priority = {
                                            'pending': 1, 'pending_reschedule': 1, 'pending_cancel': 1,
                                            'approved': 2, 'upcoming': 2, 'completed': 2, 'cancelled': 2, 'rejected': 2
                                        };
                                        const priorityA = priority[a.status] || 2;
                                        const priorityB = priority[b.status] || 2;
                                        if (priorityA !== priorityB) return priorityA - priorityB;
                                        return b.id - a.id;
                                    })
                                    .map((item) => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        {/* ✅ แก้ไข: แสดง ID 3 หลัก */}
                                        <td className="p-3 text-gray-500">#{String(item.id).padStart(3, '0')}</td>
                                        <td className="p-3 font-bold text-blue-900">{item.user_id}</td>
                                        <td className="p-3">{item.room_name} <br/><span className="text-xs text-gray-500">({item.room_count || 1} ห้อง)</span></td>
                                        <td className="p-3 text-sm">{new Date(item.check_in_date).toLocaleDateString('th-TH')} <br /> ถึง {new Date(item.check_out_date).toLocaleDateString('th-TH')}</td>
                                        <td className="p-3 font-bold">{Number(item.price).toLocaleString()}</td>
                                        
                                        <td className="p-3">
                                            <div className="flex flex-col gap-2 items-center">
                                                {(item.slip_image || item.payment_slip) && (
                                                    <button onClick={() => handleViewImage(item.slip_image || item.payment_slip)} className="w-full text-blue-600 hover:text-blue-900 text-[10px] font-bold border border-blue-200 px-2 py-1 rounded bg-blue-50 transition-colors flex items-center justify-center gap-1">
                                                        <ImageIcon size={10} /> สลิปชำระ
                                                    </button>
                                                )}
                                                {item.user_type === 'official' && item.gov_card_image && (
                                                    <button onClick={() => handleViewImage(item.gov_card_image)} className="w-full text-red-600 hover:text-red-900 text-[10px] font-bold border border-red-200 px-2 py-1 rounded bg-red-50 transition-colors flex items-center justify-center gap-1">
                                                        <ShieldCheck size={10} /> บัตรข้าราชการ
                                                    </button>
                                                )}
                                                {item.refund_image && (
                                                    <button onClick={() => handleViewImage(item.refund_image)} className="w-full text-red-600 hover:text-red-900 text-[10px] font-bold border border-red-200 px-2 py-1 rounded bg-red-50 transition-colors flex items-center justify-center gap-1">
                                                        <ImageIcon size={10} /> QR คืนเงิน
                                                    </button>
                                                )}
                                                {!item.slip_image && !item.payment_slip && !item.refund_image && !item.gov_card_image && <span className="text-gray-400 text-xs">-</span>}
                                            </div>
                                        </td>

                                        <td className="p-3 text-center">
                                            <button onClick={() => navigate('/receipt', { state: { booking: item } })} className="text-blue-600 hover:text-purple-900 text-xs font-bold border border-purple-200 px-2 py-1 rounded bg-blue-50 hover:bg-purple-100 transition-colors">📄 ใบเสร็จ</button>
                                        </td>

                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                                item.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-50 text-green-700 border-green-200' :
                                                item.status === 'pending_reschedule' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                item.status === 'pending_cancel' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {item.status === 'pending' ? '⏳ รอตรวจสอบ' : item.status === 'approved' || item.status === 'upcoming' ? '✅ ยืนยันแล้ว' : item.status === 'pending_reschedule' ? '📅 รออนุมัติเลื่อน' : item.status === 'pending_cancel' ? '🚫 รอยืนยันยกเลิก' : item.status === 'cancelled' ? '❌ ยกเลิกแล้ว' : item.status === 'rejected' ? '❌ ปฏิเสธ' : item.status.toUpperCase()}
                                            </span>
                                        </td>

                                        <td className="p-3 text-center">
                                            <div className="flex flex-col gap-2 justify-center items-center">
                                                {item.status === 'pending' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">อนุมัติ</button>
                                                        <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">ปฏิเสธ</button>
                                                    </div>
                                                )}
                                                {item.status === 'pending_cancel' && (
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <button onClick={() => handleUpdateStatus(item.id, 'cancelled')} className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-gray-700">ยืนยันคืนเงินแล้ว</button>
                                                        <button onClick={() => handleUpdateStatus(item.id, 'upcoming')} className="bg-red-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500">ปฏิเสธยกเลิก</button>
                                                    </div>
                                                )}
                                                {(item.status === 'approved' || item.status === 'upcoming') && (
                                                    <button onClick={() => handleUpdateStatus(item.id, 'cancelled')} className="bg-red-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500">ยกเลิกการจอง</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4 text-orange-700 flex items-center gap-2">📅 รายการขอเลื่อนวันเข้าพัก</h2>
                        {rescheduleRequests.length === 0 ? (
                            <div className="text-center p-10 text-gray-400 border-2 border-dashed rounded-lg">✅ ไม่มีคำขอเลื่อนวันใหม่ในขณะนี้</div>
                        ) : (
                            <div className="grid gap-4">
                                {rescheduleRequests.map((req) => (
                                    <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                {/* ✅ แก้ไข: แสดง ID 3 หลัก */}
                                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded">ID: #{String(req.id).padStart(3, '0')}</span>
                                                <h3 className="font-bold text-gray-800">{req.room_name}</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="text-gray-500"><p>วันเดิม: <span className="text-gray-900 font-medium">{new Date(req.check_in_date).toLocaleDateString('th-TH')}</span></p><p>วันใหม่: <span className="text-blue-600 font-bold">{new Date(req.request_check_in).toLocaleDateString('th-TH')}</span></p></div>
                                                <div className="text-gray-500"><p>ราคา: <span className="text-gray-900 font-medium">{Number(req.price).toLocaleString()} ฿</span></p></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 min-w-[250px] bg-amber-50 p-4 rounded-xl border border-amber-100">
                                            <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><FileText size={14} /> เหตุผลจากลูกค้า</p>
                                            <p className="text-sm text-amber-900 italic">"{req.reschedule_reason || req.reason || 'ไม่ได้ระบุเหตุผล'}"</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => handleRescheduleAction(req.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">อนุมัติ</button>
                                            <button onClick={() => handleRescheduleAction(req.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">ปฏิเสธ</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cancel_requests' && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">❌ รายการขอแจ้งยกเลิกและคืนเงิน (คืน 20%)</h2>
                        {cancelRequests.length === 0 ? (
                            <div className="text-center p-10 text-gray-400 border-2 border-dashed rounded-lg">✅ ไม่มีคำขอยกเลิกในขณะนี้</div>
                        ) : (
                            <div className="grid gap-4">
                                {cancelRequests.map((req) => {
                                    const refundAmount = Number(req.price) * 0.20; 
                                    return (
                                        <div key={req.id} className="bg-white border-l-4 border-red-500 shadow p-6 rounded-lg flex flex-col md:flex-row items-start justify-between gap-6">
                                            <div className="flex-1">
                                                {/* ✅ แก้ไข: แสดง ID 3 หลัก */}
                                                <h3 className="font-bold text-lg text-gray-800">{req.room_name} <span className="text-sm font-normal text-gray-500">(Booking #{String(req.id).padStart(3, '0')})</span></h3>
                                                <p className="text-sm text-gray-600 font-bold text-blue-900">ผู้จอง (User ID): {req.user_id}</p>
                                                <div className="mt-3"><button onClick={() => handleViewImage(req.slip_image || req.payment_slip)} className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"><ImageIcon size={14} /> ดูใบเสร็จที่ลูกค้าจ่ายมา</button></div>
                                            </div>
                                            <div className="flex-1 bg-red-50 p-3 rounded-lg border border-red-100">
                                                <p className="text-xs font-bold text-red-500 uppercase mb-1">สาเหตุการยกเลิก</p><p className="text-sm text-gray-800 mb-3 italic">"{req.cancel_reason || req.reason || '-'}"</p>
                                                <div className="border-t border-red-200 pt-2"><p className="text-xs font-bold text-gray-500 uppercase mb-1">รายละเอียดบัญชีรับเงินคืน</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{req.refund_details || 'ไม่ได้ระบุ'}</p></div>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 min-w-[100px]"><p className="text-xs font-bold text-gray-400 uppercase">QR รับเงิน</p>{req.refund_image ? (<img src={`${API_URL}/uploads/${req.refund_image}`} alt="Refund QR" className="w-20 h-20 object-cover rounded border cursor-pointer hover:scale-110 transition-transform bg-white" onClick={() => handleViewImage(req.refund_image)} />) : <span className="text-gray-300 text-xs italic">ไม่มีรูปภาพ</span>}</div>
                                            <div className="flex flex-col items-end gap-2 min-w-[200px]"><div className="text-right"><p className="text-xs text-gray-500">ยอดชำระเต็ม: <span className="line-through">{Number(req.price).toLocaleString()}</span> ฿</p><p className="font-bold text-red-600 text-xl">ยอดคืน (20%): {refundAmount.toLocaleString()} ฿</p></div><div className="flex gap-2 mt-2"><button onClick={() => handleUpdateStatus(req.id, 'cancelled')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow">💰 ยืนยันคืนเงินแล้ว</button><button onClick={() => handleUpdateStatus(req.id, 'upcoming')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold">ปฏิเสธ</button></div></div>
                                        </div>
                                    );
                                })}
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
                            <div className="mt-8 mb-8">
                                <h3 className="text-lg font-bold mb-2 bg-slate-100 p-2 border-l-4 border-blue-500">รายละเอียดผู้จอง {selectedMonthLabel} ({filteredBookingsForReport.length} รายการ)</h3>
                                <table className="w-full text-sm text-left text-gray-500 border">
                                    <thead className="text-xs text-white uppercase bg-slate-600"><tr><th className="px-4 py-3">วันที่เช็คอิน</th><th className="px-4 py-3">ชื่อผู้จอง</th><th className="px-4 py-3 text-center">ประเภท</th><th className="px-4 py-3">ห้องพัก</th><th className="px-4 py-3 text-right">ราคา</th><th className="px-4 py-3 text-center">สถานะ</th></tr></thead>
                                    <tbody>
                                        {filteredBookingsForReport.map((b, index) => (
                                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td>
                                                <td className="px-4 py-2 font-semibold text-gray-900">{b.fullname || b.name || `User ID: ${b.user_id}`}</td>
                                                <td className="px-4 py-2 text-center">{b.user_type === 'official' ? <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded">ข้าราชการ</span> : <span className="text-gray-400 text-[10px]">ทั่วไป</span>}</td>
                                                <td className="px-4 py-2">{b.room_name}</td>
                                                <td className="px-4 py-2 text-right font-bold">{Number(b.price).toLocaleString()}</td>
                                                <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs text-white ${b.status === 'approved' ? 'bg-green-500' : b.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'}`}>{b.status}</span></td>
                                            </tr>
                                        ))}
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