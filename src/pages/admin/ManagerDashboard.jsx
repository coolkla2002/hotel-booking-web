// client/src/pages/admin/ManagerDashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Search } from 'lucide-react'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import API_URL from "/src/config";

const ManagerDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('all'); 
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();
    const reportRef = useRef(null); 

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const months = [{ value: '1', label: 'มกราคม' }, { value: '2', label: 'กุมภาพันธ์' }, { value: '3', label: 'มีนาคม' }, { value: '4', label: 'เมษายน' }, { value: '5', label: 'พฤษภาคม' }, { value: '6', label: 'มิถุนายน' }, { value: '7', label: 'กรกฎาคม' }, { value: '8', label: 'สิงหาคม' }, { value: '9', label: 'กันยายน' }, { value: '10', label: 'ตุลาคม' }, { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' }];

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/admin-login'); return; }
        try {
            const user = JSON.parse(userStr);
            const role = user.role ? user.role.toLowerCase() : '';
            if (role !== 'manager' && role !== 'admin') { 
                Swal.fire({ icon: 'error', title: 'Access Denied', text: 'ไม่มีสิทธิ์เข้าถึงหน้านี้', timer: 3000 });
                navigate('/admin'); return;
            }
            fetchBookings();
        } catch (error) {
            localStorage.removeItem('user'); navigate('/admin-login');
        }
    }, [navigate]);

    const fetchBookings = () => {
        fetch(`${API_URL}/bookings`)
            .then(res => res.json())
            .then(data => {
                const validBookings = data.filter(b => b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed');
                setBookings(validBookings);
            })
            .catch(err => console.error(err));
    };

    const handleLogout = () => { localStorage.removeItem('user'); navigate('/admin-login'); };

    const getMonthlyData = () => {
        const data = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }), income: 0, count: 0 }));
        bookings.forEach(b => {
            const d = new Date(b.check_in_date);
            if (b.user_id.toString().includes(searchTerm)) {
                if (d.getFullYear() === parseInt(year)) {
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
            if (b.user_id.toString().includes(searchTerm)) {
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
            pdf.save(`รายงานผู้บริหาร_${year}.pdf`);
            Swal.close();
            Swal.fire('สำเร็จ', 'ดาวน์โหลดรายงานเรียบร้อยแล้ว', 'success');
        });
    };

    const filteredBookings = bookings.filter(b => {
        const date = new Date(b.check_in_date);
        const isYearMatch = date.getFullYear() === parseInt(year);
        const isMonthMatch = selectedMonth === 'all' ? true : (date.getMonth() + 1) === parseInt(selectedMonth);
        const isUserMatch = b.user_id.toString().includes(searchTerm); 
        
        return isYearMatch && isMonthMatch && isUserMatch;
    });

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.price), 0);
    const totalBookingsCount = filteredBookings.length;
    const averagePrice = totalBookingsCount > 0 ? totalRevenue / totalBookingsCount : 0;
    const selectedMonthLabel = selectedMonth === 'all' ? '' : `เดือน${months.find(m => m.value === selectedMonth)?.label} `;

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-3"><div className="bg-yellow-500 text-slate-900 p-2 rounded font-bold">GM</div><h1 className="text-xl font-bold">Executive Dashboard</h1></div>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded shadow">Logout</button>
            </nav>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div><h2 className="text-2xl font-bold text-gray-800">จัดการรายงาน</h2></div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="ค้นหา User ID..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black w-48"
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>

                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500">
                            <option value="all">ดูภาพรวมทั้งปี</option>
                            {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                        </select>
                        <select value={year} onChange={(e) => setYear(e.target.value)} className="border p-2 rounded-lg font-bold text-gray-700">
                            <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                        </select>
                        <button onClick={exportPDF} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow flex items-center gap-2">Download PDF</button>
                    </div>
                </div>

                <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="text-center mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold text-slate-800">รายงานสรุปผลประกอบการ {selectedMonthLabel}ประจำปี {year}</h1>
                        <p className="text-gray-500">RCBAT Hotel</p>
                        <p className="text-sm text-gray-400 mt-2">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
                        {searchTerm && <p className="text-blue-600 mt-2 font-bold">ผลการค้นหา User ID: {searchTerm}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center"><p className="text-blue-600 font-bold mb-2">รายได้รวม</p><h3 className="text-3xl font-bold text-slate-800">{totalRevenue.toLocaleString()} ฿</h3></div>
                        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100 text-center"><p className="text-orange-600 font-bold mb-2">จำนวนการจอง</p><h3 className="text-3xl font-bold text-slate-800">{totalBookingsCount} ครั้ง</h3></div>
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center"><p className="text-purple-600 font-bold mb-2">ราคาเฉลี่ย/ห้อง</p><h3 className="text-3xl font-bold text-slate-800">{averagePrice.toFixed(0).toLocaleString()} ฿</h3></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                            <h3 className="text-lg font-bold mb-4 text-center">แนวโน้มรายได้รายเดือน (ภาพรวมรายปี)</h3>
                            <div style={{ width: '100%', height: '350px', minHeight: '350px', position: 'relative' }}>
                                <ResponsiveContainer width="99%" height="100%"><BarChart data={getMonthlyData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
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
                        <h3 className="text-lg font-bold mb-2 bg-slate-100 p-2 border-l-4 border-blue-500">รายละเอียดผู้จอง {selectedMonthLabel} ({filteredBookings.length} รายการ)</h3>
                        <table className="w-full text-sm text-left text-gray-500 border">
                            <thead className="text-xs text-white uppercase bg-slate-600">
                                <tr><th className="px-4 py-3">วันที่เช็คอิน</th><th className="px-4 py-3">ชื่อผู้จอง</th><th className="px-4 py-3">ประเภทห้อง</th><th className="px-4 py-3 text-right">ราคา</th><th className="px-4 py-3 text-center">หลักฐาน</th><th className="px-4 py-3 text-center">สถานะ</th></tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map((b, index) => {
                                    const hasProof = b.payment_image || b.slip_image || b.image;
                                    return (
                                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-4 py-2 font-semibold text-gray-900">{b.fullname || b.name || `User ID: ${b.user_id}`}</td>
                                            <td className="px-4 py-2">{b.room_name}</td>
                                            <td className="px-4 py-2 text-right">{Number(b.price).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-center">
                                                {hasProof ? (
                                                    <button 
                                                        onClick={() => navigate('/receipt', { state: { booking: b } })} 
                                                        className="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700 transition-colors flex items-center gap-1 mx-auto"
                                                    >
                                                        📄 ใบเสร็จ
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs text-white ${b.status === 'approved' ? 'bg-green-500' : b.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'}`}>{b.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-2">ตารางสรุปรายได้ (รายปี)</h3>
                        <table className="w-full text-sm text-left text-gray-500 border">
                            <thead className="text-xs text-white uppercase bg-slate-700"><tr><th className="px-6 py-3">เดือน</th><th className="px-6 py-3 text-center">จำนวนที่จอง (ห้อง)</th><th className="px-6 py-3 text-right">รายได้ (บาท)</th></tr></thead>
                            <tbody>
                                {(selectedMonth === 'all' ? getMonthlyData() : [getMonthlyData()[parseInt(selectedMonth) - 1]]).map((m, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-2 font-medium text-gray-900">{m.name}</td><td className="px-6 py-2 text-center">{m.count}</td><td className="px-6 py-2 text-right">{m.income.toLocaleString()}</td></tr>
                                ))}
                                <tr className="bg-gray-100 font-bold"><td className="px-6 py-2 text-gray-900">รวมทั้งหมด</td><td className="px-6 py-2 text-center">{filteredBookings.length}</td><td className="px-6 py-2 text-right">{totalRevenue.toLocaleString()}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;