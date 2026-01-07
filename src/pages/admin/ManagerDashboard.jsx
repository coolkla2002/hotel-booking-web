// client/src/pages/admin/ManagerDashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ManagerDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const navigate = useNavigate();
    
    const reportRef = useRef(null); // Reference สำหรับแคปภาพ

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    // ✅ แก้ไขส่วนนี้: ปรับปรุง useEffect เพื่ออนุญาตให้ Admin และ Manager เข้าได้ทั้งคู่
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        
        // 1. ถ้าไม่มีการล็อกอินเลย -> ไปหน้า Login
        if (!userStr) { 
            navigate('/admin-login'); 
            return; 
        }

        try {
            const user = JSON.parse(userStr);
            
            // 2. เช็ค Role: อนุญาตให้ทั้ง 'manager' และ 'admin' เข้าได้
            // แปลงเป็นตัวพิมพ์เล็กก่อนเช็ค เพื่อป้องกันปัญหา case sensitive
            const role = user.role ? user.role.toLowerCase() : '';

            if (role !== 'manager' && role !== 'admin') { 
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'ไม่มีสิทธิ์เข้าถึงหน้านี้ (Role ของคุณคือ: ' + user.role + ')',
                    timer: 3000
                });
                navigate('/admin'); // ถ้าไม่ใช่ทั้งคู่ ค่อยดีดไปหน้า Admin หลัก
                return;
            }

            // ถ้าผ่านเงื่อนไข ให้ดึงข้อมูล
            fetchBookings();

        } catch (error) {
            console.error("Error parsing user data:", error);
            localStorage.removeItem('user'); // ถ้าข้อมูลพัง ให้ลบออกแล้วไป Login ใหม่
            navigate('/admin-login');
        }
    }, [navigate]);

    const fetchBookings = () => {
        fetch('https://hotel-booking-web-kfks.onrender.com/bookings')
            .then(res => res.json())
            .then(data => {
                const validBookings = data.filter(b => b.status === 'approved' || b.status === 'upcoming' || b.status === 'completed');
                setBookings(validBookings);
            })
            .catch(err => console.error(err));
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/admin-login');
    };

    const getMonthlyData = () => {
        const data = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(0, i).toLocaleDateString('th-TH', { month: 'short' }),
            income: 0
        }));
        bookings.forEach(b => {
            const d = new Date(b.check_in_date);
            if (d.getFullYear() === parseInt(year)) {
                data[d.getMonth()].income += Number(b.price);
            }
        });
        return data;
    };

    const getRoomTypeData = () => {
        const types = {};
        bookings.forEach(b => {
            if (types[b.room_name]) types[b.room_name] += 1;
            else types[b.room_name] = 1;
        });
        return Object.keys(types).map(key => ({ name: key, value: types[key] }));
    };

    // ฟังก์ชัน Export PDF (เหมือนเดิม)
    const exportPDF = () => {
        const input = reportRef.current;

        Swal.fire({
            title: 'กำลังสร้างไฟล์ PDF...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        });

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

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Navbar */}
            <nav className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-500 text-slate-900 p-2 rounded font-bold">GM</div>
                    <h1 className="text-xl font-bold">Executive Dashboard</h1>
                </div>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded shadow">Logout</button>
            </nav>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Controls Area (ส่วนนี้จะไม่ถูกแคป) */}
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">จัดการรายงาน</h2>
                    </div>
                    <div className="flex gap-4">
                        <select value={year} onChange={(e) => setYear(e.target.value)} className="border p-2 rounded-lg font-bold">
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                        <button onClick={exportPDF} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow flex items-center gap-2">
                            Download PDF
                        </button>
                    </div>
                </div>

                {/* พื้นที่ที่จะถูกพิมพ์ลง PDF */}
                <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                    
                    {/* หัวกระดาษสำหรับ PDF */}
                    <div className="text-center mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold text-slate-800">รายงานสรุปผลประกอบการ ประจำปี {year}</h1>
                        <p className="text-gray-500">บริษัท โฮเทล จำกัด (มหาชน)</p>
                        <p className="text-sm text-gray-400 mt-2">วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
                            <p className="text-blue-600 font-bold mb-2">รายได้รวม</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {bookings.filter(b => new Date(b.check_in_date).getFullYear() === parseInt(year))
                                        .reduce((sum, b) => sum + Number(b.price), 0).toLocaleString()} ฿
                            </h3>
                        </div>
                        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100 text-center">
                            <p className="text-orange-600 font-bold mb-2">จำนวนการจอง</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {bookings.filter(b => new Date(b.check_in_date).getFullYear() === parseInt(year)).length} ครั้ง
                            </h3>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center">
                            <p className="text-purple-600 font-bold mb-2">ราคาเฉลี่ย/ห้อง</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {(bookings.filter(b => new Date(b.check_in_date).getFullYear() === parseInt(year))
                                        .reduce((sum, b) => sum + Number(b.price), 0) / 
                                (bookings.filter(b => new Date(b.check_in_date).getFullYear() === parseInt(year)).length || 1)
                                ).toFixed(0).toLocaleString()} ฿
                            </h3>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold mb-4 text-center">แนวโน้มรายได้รายเดือน</h3>
                            <div className="h-[300px] border rounded p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getMonthlyData()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="income" fill="#4F46E5" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-4 text-center">สัดส่วนห้องพัก</h3>
                            <div className="h-[300px] border rounded p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getRoomTypeData()}
                                            cx="50%" cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            dataKey="value"
                                            label
                                        >
                                            {getRoomTypeData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ตารางสรุปท้ายรายงาน */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-2">ตารางสรุปรายได้รายเดือน</h3>
                        <table className="w-full text-sm text-left text-gray-500 border">
                            <thead className="text-xs text-white uppercase bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3">เดือน</th>
                                    <th className="px-6 py-3 text-right">รายได้ (บาท)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getMonthlyData().map((m, index) => (
                                    <tr key={index} className="bg-white border-b">
                                        <td className="px-6 py-2 font-medium text-gray-900">{m.name}</td>
                                        <td className="px-6 py-2 text-right">{m.income.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold">
                                    <td className="px-6 py-2 text-gray-900">รวมทั้งหมด</td>
                                    <td className="px-6 py-2 text-right">
                                        {bookings.filter(b => new Date(b.check_in_date).getFullYear() === parseInt(year))
                                        .reduce((sum, b) => sum + Number(b.price), 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;