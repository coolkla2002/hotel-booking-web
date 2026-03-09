// client/src/pages/admin/AdminManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Trash2, Edit, Users, Home, ArrowLeft, Image as ImageIcon, X, Box } from 'lucide-react';
import API_URL from "/src/config";

const AdminManagement = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('rooms');
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);

    // State สำหรับ Modal ห้องพัก
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);

    // State สำหรับจัดการรูปภาพหลายรูปและพรีวิว
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    // State สำหรับ Modal แก้ไขลูกค้า
    const [showUserModal, setShowUserModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // ฟังก์ชันช่วยจัดรูปแบบเบอร์โทร (เติมเลข 0 ถ้าไม่มี)
    const formatPhoneNumber = (phone) => {
        if (!phone) return "";
        let p = phone.toString();
        return p.startsWith('0') ? p : `0${p}`;
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/rooms`);
            const data = await res.json();
            setRooms(data);
        } catch (err) {
            console.error("Error fetching rooms:", err);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'rooms') fetchRooms();
    }, [activeTab]);

    const handleDeleteUser = async (id) => {
        if (id == 1) return Swal.fire('ห้ามลบ!', 'ไม่สามารถลบ Super Admin ได้', 'error');

        if (await Swal.fire({ title: 'ยืนยันการลบ?', text: "ข้อมูลนี้จะหายไปถาวร!", icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
            fetchUsers();
            Swal.fire('ลบแล้ว!', '', 'success');
        }
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('room_name', currentRoom.name || currentRoom.room_name);
        formData.append('price', currentRoom.price);
        formData.append('room_count', currentRoom.room_count || 15);

        // ✅ เพิ่มบรรทัดนี้ เพื่อส่งสิ่งอำนวยความสะดวกไปด้วย
        formData.append('amenities', currentRoom.amenities || '');

        if (selectedFiles.length > 0) {
            formData.append('room_image', selectedFiles[0]);
        }

        const url = isEditing ? `${API_URL}/rooms/${currentRoom.id}` : `${API_URL}/rooms`;
        const method = isEditing ? 'PUT' : 'POST';

        await fetch(url, { method, body: formData });

        setShowRoomModal(false);
        fetchRooms();
        Swal.fire('สำเร็จ!', `บันทึกข้อมูลห้องพักเรียบร้อย`, 'success');
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentUser)
        });
        await fetch(`${API_URL}/users/${currentUser.id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: currentUser.role })
        });
        setShowUserModal(false);
        fetchUsers();
        Swal.fire('สำเร็จ!', 'อัปเดตข้อมูลลูกค้าเรียบร้อย', 'success');
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition"><ArrowLeft size={24} /></button>
                        <h1 className="text-2xl font-bold flex items-center gap-2"><Box size={28} /> จัดการระบบ (Admin)</h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0 bg-white">
                    <button onClick={() => setActiveTab('rooms')} className={`flex-1 p-4 font-bold flex justify-center items-center gap-2 ${activeTab === 'rooms' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}><Home size={20} /> จัดการห้องพัก</button>
                    <button onClick={() => setActiveTab('users')} className={`flex-1 p-4 font-bold flex justify-center items-center gap-2 ${activeTab === 'users' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-400'}`}><Users size={20} /> จัดการลูกค้า</button>
                </div>

                {/* Content Area - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {activeTab === 'rooms' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">รายการห้องพักทั้งหมด</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map(room => (
                                    <div key={room.id} className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-4">
                                        <div className="h-40 bg-gray-100 rounded-xl overflow-hidden relative">
                                            {room.image_url ? (
                                                <img src={`${API_URL}/uploads/${room.image_url}`} alt="Room" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex justify-center items-center w-full h-full text-gray-400"><ImageIcon size={40} /></div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{room.name || room.room_name}</h3>
                                            <p className="text-green-600 font-bold text-lg">฿{Number(room.price).toLocaleString()} / คืน</p>
                                            <p className="text-gray-500 text-sm mt-1">จำนวนห้องทั้งหมด: <span className="font-bold text-gray-800">{room.room_count || 15}</span> ห้อง</p>
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={() => { setIsEditing(true); setCurrentRoom(room); setPreviews(room.image_url ? [`${API_URL}/uploads/${room.image_url}`] : []); setSelectedFiles([]); setShowRoomModal(true); }} className="flex-1 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl hover:bg-yellow-200">แก้ไข</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="animate-fade-in">
                            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="bg-purple-50 text-purple-900 border-b">
                                        <tr>
                                            <th className="p-4 font-bold">#</th>
                                            <th className="p-4 font-bold">ชื่อ-สกุล</th>
                                            <th className="p-4 font-bold">อีเมล</th>
                                            <th className="p-4 font-bold">เพศ</th>
                                            <th className="p-4 font-bold">วันเกิด</th>
                                            <th className="p-4 font-bold">เบอร์โทร</th>
                                            <th className="p-4 font-bold text-center">บทบาท (Role)</th>
                                            <th className="p-4 font-bold">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(users) ? users.map((user, index) => (
                                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">{index + 1}</td>
                                                <td className="p-3 font-bold text-blue-900">{user.name}</td>
                                                <td className="p-3">{user.email}</td>
                                                <td className="p-3 text-gray-600">
                                                    {user.gender === 'male' ? 'ชาย' : user.gender === 'female' ? 'หญิง' : user.gender === 'other' ? 'อื่นๆ' : '-'}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {user.birthdate ? (
                                                        new Date(user.birthdate).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                        })
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3">{formatPhoneNumber(user.phone)}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                        user.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => { setCurrentUser(user); setShowUserModal(true); }} className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200" title="แก้ไข"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="ลบ"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="8" className="p-4 text-center text-red-500 font-bold">
                                                    ⚠️ เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้าจากฐานข้อมูล (Internal Server Error)
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal จัดการห้องพัก */}
            {showRoomModal && currentRoom && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold">{isEditing ? 'แก้ไขห้องพัก' : 'เพิ่มห้องพักใหม่'}</h2>
                            <button onClick={() => setShowRoomModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">ชื่อห้องพัก</label><input type="text" required className="w-full border p-2 rounded-lg" value={currentRoom.name || currentRoom.room_name} onChange={e => setCurrentRoom({ ...currentRoom, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">ราคาต่อคืน (บาท)</label><input type="number" required className="w-full border p-2 rounded-lg" value={currentRoom.price} onChange={e => setCurrentRoom({ ...currentRoom, price: e.target.value })} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">จำนวนห้องทั้งหมด (ห้อง)</label><input type="number" required min="1" className="w-full border p-2 rounded-lg" value={currentRoom.room_count || 15} onChange={e => setCurrentRoom({ ...currentRoom, room_count: e.target.value })} /></div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพห้องพัก</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border p-2 rounded-lg text-sm" />
                                {previews.length > 0 && (
                                    <div className="mt-3 relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border">
                                        <img src={previews[0]} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            {/* ... ช่องกรอกจำนวนห้องทั้งหมด (ของเดิม) ... */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนห้องทั้งหมด (ห้อง)</label>
                                <input type="number" required min="1" className="w-full border p-2 rounded-lg" value={currentRoom.room_count || 15} onChange={e => setCurrentRoom({ ...currentRoom, room_count: e.target.value })} />
                            </div>

                            {/* ✅ เพิ่มช่องกรอกสิ่งอำนวยความสะดวกตรงนี้ */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    สิ่งอำนวยความสะดวก <span className="text-red-500 font-normal">(คั่นด้วยลูกน้ำ เช่น แอร์, ฟรี Wi-Fi, ทีวี)</span>
                                </label>
                                <textarea
                                    rows="2"
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="เช่น แอร์, ฟรี Wi-Fi, ทีวี, ที่จอดรถ, เครื่องทำน้ำอุ่น"
                                    value={currentRoom.amenities || ''}
                                    onChange={e => setCurrentRoom({ ...currentRoom, amenities: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4 border-t">
                                <button type="button" onClick={() => setShowRoomModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">ยกเลิก</button>
                                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal จัดการลูกค้า */}
            {showUserModal && currentUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold">แก้ไขข้อมูลลูกค้า</h2>
                            <button onClick={() => setShowUserModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUserSubmit} className="p-6 space-y-4">

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">User ID</label>
                                <input type="text" disabled className="w-full border p-2 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed font-mono" value={currentUser.id || currentUser.user_id} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">บทบาท (Role)</label>
                                <input type="text" disabled className="w-full border p-2 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed font-bold uppercase" value={currentUser.role} />
                            </div>

                            {['admin', 'manager', 'Super Admin', 'General Manager'].includes(currentUser.role) ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">อีเมล (Email)</label>
                                        <input type="email" required className="w-full border p-2 rounded-lg" value={currentUser.email} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-red-600 mb-1">รหัสผ่านใหม่ (ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยน)</label>
                                        <input type="text" className="w-full border p-2 rounded-lg border-red-200 focus:ring-red-500" placeholder="กรอกรหัสผ่านใหม่" value={currentUser.password || ''} onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ-สกุล</label>
                                        <input type="text" required className="w-full border p-2 rounded-lg" value={currentUser.name} onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">เพศ</label>
                                            <select className="w-full border p-2 rounded-lg" value={currentUser.gender || ''} onChange={e => setCurrentUser({ ...currentUser, gender: e.target.value })}>
                                                <option value="">ไม่ระบุ</option>
                                                <option value="male">ชาย</option>
                                                <option value="female">หญิง</option>
                                                <option value="other">อื่นๆ</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">วันเกิด</label>
                                            <input
                                                type="date"
                                                className="w-full border p-2 rounded-lg"
                                                value={currentUser.birthdate ? new Date(currentUser.birthdate).toISOString().split('T')[0] : ''}
                                                onChange={e => setCurrentUser({ ...currentUser, birthdate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">อีเมล</label>
                                        <input type="email" required className="w-full border p-2 rounded-lg" value={currentUser.email} onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทร</label>
                                        <input type="text" className="w-full border p-2 rounded-lg" value={currentUser.phone} onChange={e => setCurrentUser({ ...currentUser, phone: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t mt-6">
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">ยกเลิก</button>
                                <button type="submit" className="px-8 py-2 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition active:scale-95">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;