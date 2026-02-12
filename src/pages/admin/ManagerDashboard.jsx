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
        if (user.role !== 'manager') { 
            Swal.fire('Error', 'หน้านี้สำหรับผู้จัดการเท่านั้น', 'error');
            navigate('/');
            return;
        }

        fetch(`${API_URL}/bookings`)
            .then(res => res.json())
            .then(data => setBookings(data))
            .catch(err => console.error(err));
    }, [navigate]);

    const handleLogout = () => {
        Swal.fire({
            title: 'ออกจากระบบ?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        });
    };

    const getMonthlyData = () => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }), income: 0, count: 0
        }));

        bookings.forEach(b => {
            if (b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed') {
                const date = new Date(b.check_in_date);
                if (date.getFullYear() === parseInt(year)) {
                    data[date.getMonth()].income += Number(b.price);
                    data[date.getMonth()].count += 1;
                }
            }
        });
        return data;
    };

    const getRoomTypeData = () => {
        const types = {};
        bookings.forEach(b => {
            if ((b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed') && 
               (new Date(b.check_in_date).getFullYear() === parseInt(year))) {
                if (types[b.room_name]) types[b.room_name] += 1;
                else types[b.room_name] = 1;
            }
        });
        return Object.keys(types).map(key => ({ name: key, value: types[key] }));
    };

    const filteredBookings = bookings.filter(b => {
        if (b.status !== 'approved' && b.status !== 'upcoming' && b.status !== 'completed') return false;
        const date = new Date(b.check_in_date);
        const isYearMatch = date.getFullYear() === parseInt(year);
        const isMonthMatch = selectedMonth === 'all' ? true : (date.getMonth() + 1) === parseInt(selectedMonth);
        const isSearchMatch = searchTerm === '' || 
            b.user_id.toString().includes(searchTerm) || 
            (b.fullname && b.fullname.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return isYearMatch && isMonthMatch && isSearchMatch;
    });

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.price), 0);
    const selectedMonthLabel = selectedMonth === 'all' ? '' : `เดือน${months.find(m => m.value === selectedMonth)?.label} `;

    const exportPDF = () => {
        const input = reportRef.current;
        Swal.fire({ title: 'กำลังสร้างไฟล์ PDF...', didOpen: () => Swal.showLoading() });
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`รายงานผู้จัดการ_${year}.pdf`);
            Swal.close();
            Swal.fire('สำเร็จ', 'ดาวน์โหลดรายงานเรียบร้อยแล้ว', 'success');
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Manager Dashboard</h1>
                        <p className="text-gray-500 text-sm">รายงานผลประกอบการโรงแรม</p>
                    </div>
                    <div className="flex gap-4">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 rounded-lg font-bold">
                            <option value="all">ทุกเดือน</option>
                            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select value={year} onChange={(e) => setYear(e.target.value)} className="border p-2 rounded-lg font-bold">
                            <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                        </select>
                        <button onClick={exportPDF} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">Download Report</button>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 shadow">Logout</button>
                    </div>
                </div>

                <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                    <div className="text-center mb-8 border-b pb-4">
                        <h2 className="text-3xl font-bold text-slate-800">รายงานสรุปผลประกอบการ {selectedMonthLabel}ประจำปี {year}</h2>
                        <p className="text-gray-500">RCBAT Hotel Management Report</p>
                        <p className="text-sm text-gray-400 mt-2">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center"><p className="text-blue-600 font-bold mb-2">รายได้รวม</p><h3 className="text-4xl font-bold text-slate-800">{totalRevenue.toLocaleString()} ฿</h3></div>
                        <div className="bg-green-50 p-6 rounded-lg border border-green-100 text-center"><p className="text-green-600 font-bold mb-2">จำนวนการจอง</p><h3 className="text-4xl font-bold text-slate-800">{filteredBookings.length} ครั้ง</h3></div>
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center"><p className="text-purple-600 font-bold mb-2">เฉลี่ยต่อการจอง</p><h3 className="text-4xl font-bold text-slate-800">{filteredBookings.length > 0 ? (totalRevenue / filteredBookings.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} ฿</h3></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-center">กราฟรายได้รายเดือน</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%"><BarChart data={getMonthlyData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="income" fill="#2563EB" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-center">สัดส่วนประเภทห้องพัก</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getRoomTypeData()} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>{getRoomTypeData().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold bg-slate-100 p-2 border-l-4 border-blue-500 w-full">รายละเอียดผู้จอง ({filteredBookings.length} รายการ)</h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 border">
                                <thead className="text-xs text-white uppercase bg-slate-600">
                                    <tr>
                                        <th className="px-4 py-3">วันที่เช็คอิน</th>
                                        {/* ✅ เพิ่มหัวตาราง วันที่เช็คเอาท์ */}
                                        <th className="px-4 py-3">วันที่เช็คเอาท์</th>
                                        <th className="px-4 py-3">ชื่อผู้จอง</th>
                                        <th className="px-4 py-3 text-center">ประเภท</th>
                                        <th className="px-4 py-3">ห้องพัก</th>
                                        <th className="px-4 py-3 text-right">ราคา</th>
                                        <th className="px-4 py-3 text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map((b, index) => (
                                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{new Date(b.check_in_date).toLocaleDateString('th-TH')}</td>
                                            {/* ✅ เพิ่มข้อมูล วันที่เช็คเอาท์ */}
                                            <td className="px-4 py-2">{new Date(b.check_out_date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-4 py-2 font-semibold text-gray-900">{b.fullname || b.name || `User ID: ${b.user_id}`}</td>
                                            <td className="px-4 py-2 text-center">
                                                {b.user_type === 'official' ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">ข้าราชการ</span> : <span className="text-gray-400 text-xs">ทั่วไป</span>}
                                            </td>
                                            <td className="px-4 py-2">{b.room_name}</td>
                                            <td className="px-4 py-2 text-right font-bold">{Number(b.price).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">{b.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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