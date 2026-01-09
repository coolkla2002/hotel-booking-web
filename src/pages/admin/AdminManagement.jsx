import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Trash2, Edit, Plus, Users, Home } from 'lucide-react';

const AdminManagement = () => {
    const navigate = useNavigate();
    
    // State สำหรับจัดการ Tab และข้อมูล
    const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' หรือ 'users'
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);

    // State สำหรับ Modal ห้องพัก (เพิ่ม/แก้ไข)
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);

    // --- 1. ตรวจสอบสิทธิ์และดึงข้อมูลเมื่อโหลดหน้า ---
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        
        // ถ้าไม่ใช่ Admin ให้ดีดออก
        if (user.role !== 'admin') {
            Swal.fire('Access Denied', 'หน้านี้สำหรับ Admin เท่านั้น', 'error');
            navigate('/');
            return;
        }

        fetchRooms();
        fetchUsers();
    }, [navigate]);

    // --- 2. ฟังก์ชันดึงข้อมูล (API) ---
    const fetchRooms = async () => {
        try {
            // เช็คว่า URL ถูกต้อง (ปกติคือ http://localhost:3000/rooms)
            const res = await fetch('http://localhost:3000/rooms');
            if (!res.ok) throw new Error('Failed to fetch rooms');
            const data = await res.json();
            setRooms(data);
        } catch (err) {
            console.error("Error fetching rooms:", err);
            // ไม่แสดง Alert พร่ำเพรื่อถ้าแค่โหลดไม่ได้ แต่ log ไว้ดู
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:3000/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    // --- 3. ฟังก์ชันจัดการห้องพัก (Add/Edit) ---
    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        let url = 'http://localhost:3000/rooms'; // POST
        let method = 'POST';

        if (isEditing && currentRoom) {
            url = `http://localhost:3000/rooms/${currentRoom.id}`; // PUT
            method = 'PUT';
        }

        try {
            const res = await fetch(url, {
                method: method,
                body: formData 
            });
            
            const result = await res.json(); 

            if (res.ok) {
                Swal.fire('สำเร็จ', isEditing ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มห้องพักเรียบร้อย', 'success');
                setShowRoomModal(false);
                fetchRooms(); 
            } else {
                console.error("Server Error:", result);
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error("Network Error:", err);
            Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้ (ตรวจสอบว่ารัน node index.js หรือยัง)', 'error');
        }
    };

    // ฟังก์ชันลบห้อง
    const handleDeleteRoom = (id) => {
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ข้อมูลห้องนี้จะหายไป!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบเลย'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await fetch(`http://localhost:3000/rooms/${id}`, { method: 'DELETE' });
                    Swal.fire('ลบแล้ว!', 'ข้อมูลห้องถูกลบเรียบร้อย', 'success');
                    fetchRooms();
                } catch (err) {
                    Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
                }
            }
        });
    };

    // --- 4. ฟังก์ชันจัดการผู้ใช้ ---
    const handleDeleteUser = (id) => {
        Swal.fire({
            title: 'ยืนยันการลบผู้ใช้?',
            text: "ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบเลย'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await fetch(`http://localhost:3000/users/${id}`, { method: 'DELETE' });
                    Swal.fire('ลบแล้ว!', 'ผู้ใช้ถูกลบเรียบร้อย', 'success');
                    fetchUsers();
                } catch (err) {
                    Swal.fire('Error', 'ลบไม่สำเร็จ', 'error');
                }
            }
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ จัดการข้อมูล (Admin Management)</h1>
                
                {/* Tabs */}
                <div className="flex space-x-4 mb-6">
                    <button 
                        onClick={() => setActiveTab('rooms')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'rooms' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                    >
                        <Home size={20} /> จัดการห้องพัก
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                    >
                        <Users size={20} /> จัดการผู้ใช้งาน
                    </button>
                </div>

                {/* Content: Rooms */}
                {activeTab === 'rooms' && (
                    <div>
                        <button 
                            onClick={() => { setIsEditing(false); setCurrentRoom(null); setShowRoomModal(true); }}
                            className="mb-4 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 shadow"
                        >
                            <Plus size={20} /> เพิ่มห้องพักใหม่
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map(room => (
                                <div key={room.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                                    <div className="h-48 bg-gray-200 relative">
                                        {/* แก้ไขการดึงรูปภาพให้ใช้ image_url ตาม DB */}
                                        <img 
                                            src={room.image_url ? `http://localhost:3000/uploads/${room.image_url}` : 'https://via.placeholder.com/300?text=No+Image'}
                                            alt={room.name} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {e.target.src = 'https://via.placeholder.com/300?text=Error'}} 
                                        />
                                    </div>
                                    <div className="p-4">
                                        {/* แก้ไขให้ใช้ชื่อตัวแปรตาม DB: name, price */}
                                        <h3 className="text-xl font-bold text-gray-800">{room.name}</h3>
                                        <p className="text-blue-600 font-bold text-lg">{Number(room.price).toLocaleString()} บาท/คืน</p>
                                        
                                        {/* ข้อมูลที่ไม่มีใน DB ให้ใส่ข้อความ default ไว้ก่อน */}
                                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                                            รายละเอียดห้องพักมาตรฐานพร้อมสิ่งอำนวยความสะดวกครบครัน
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">พักได้สูงสุด: 2 คน</p>
                                        
                                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                            <button 
                                                onClick={() => { setIsEditing(true); setCurrentRoom(room); setShowRoomModal(true); }}
                                                className="p-2 text-yellow-500 hover:bg-yellow-50 rounded"
                                            >
                                                <Edit size={20} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRoom(room.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content: Users */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">ชื่อ</th>
                                    <th className="p-4">อีเมล</th>
                                    <th className="p-4">เบอร์โทร</th>
                                    <th className="p-4">บทบาท</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 text-gray-500">#{u.id}</td>
                                        <td className="p-4 font-bold">{u.name}</td>
                                        <td className="p-4">{u.email}</td>
                                        <td className="p-4">{u.phone || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {u.role ? u.role.toUpperCase() : 'USER'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {u.role !== 'admin' && (
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Add/Edit Room */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="bg-blue-600 p-4 text-white font-bold text-xl sticky top-0">
                            {isEditing ? '✏️ แก้ไขข้อมูลห้องพัก' : '➕ เพิ่มห้องพักใหม่'}
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">ชื่อห้องพัก</label>
                                {/* name="room_name" อาจจะต้องเปลี่ยนเป็น "name" ถ้า Backend รับค่า name แต่ตอนนี้ใช้ room_name ไปก่อนตาม index.js เดิม */}
                                <input name="room_name" defaultValue={currentRoom?.name} required className="w-full border p-2 rounded" placeholder="เช่น Deluxe Room 01" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">ราคาต่อคืน (บาท)</label>
                                <input name="price" type="number" defaultValue={currentRoom?.price} required className="w-full border p-2 rounded" />
                            </div>
                            
                            {/* ส่วน Description และ Guest Limit ไม่มีใน DB แต่ใส่ไว้ให้ UI ไม่โล่ง (แต่ข้อมูลจะไม่ถูกบันทึกจริง จนกว่าจะแก้ DB) */}
                            {/* <div className="p-2 bg-yellow-50 text-xs text-yellow-700 rounded border border-yellow-200">
                                หมายเหตุ: รายละเอียดและจำนวนผู้เข้าพักจะยังไม่ถูกบันทึก เนื่องจากยังไม่มีช่องข้อมูลในฐานข้อมูล
                            </div> */}
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">จำนวนผู้เข้าพักสูงสุด (คน)</label>
                                <input name="guest_limit" type="number" defaultValue={2} className="w-full border p-2 rounded bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">รายละเอียด</label>
                                <textarea name="description" rows="3" defaultValue={"รายละเอียดห้องพัก..."} className="w-full border p-2 rounded bg-gray-100"></textarea>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">รูปภาพห้องพัก</label>
                                {isEditing && currentRoom?.image_url && (
                                    <div className="mb-2 text-xs text-gray-500">รูปเดิม: {currentRoom.image_url} (อัปโหลดใหม่เพื่อเปลี่ยน)</div>
                                )}
                                <input name="room_image" type="file" accept="image/*" required={!isEditing} className="w-full border p-2 rounded bg-gray-50" />
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowRoomModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow">
                                    {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มห้องพัก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;