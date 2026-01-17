// client/src/pages/admin/AdminManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Trash2, Edit, Plus, Users, Home, ArrowLeft, Image as ImageIcon, X, Box } from 'lucide-react'; // ✅ เพิ่ม Icon Box
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
        return p.startsWith('0') ? p : '0' + p;
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        
        if (user.role !== 'admin') {
            Swal.fire('Access Denied', 'หน้านี้สำหรับ Admin เท่านั้น', 'error');
            navigate('/');
            return;
        }

        fetchRooms();
        fetchUsers();
    }, [navigate]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/rooms`);
            const data = await res.json();
            setRooms(data);
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users?t=${Date.now()}`);
            const data = await res.json();
            setUsers(data);
        } catch (err) { console.error(err); }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);

        const filePreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(filePreviews);
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // ✅ เพิ่มการจัดการ room_count
        // (ปกติ input name="room_count" จะอยู่ใน formData อยู่แล้ว ไม่ต้องทำอะไรเพิ่ม)

        formData.delete('room_image'); 
        if (selectedFiles.length > 0) {
            selectedFiles.forEach((file) => {
                formData.append('room_image', file); 
            });
        }

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/rooms/${currentRoom.id}` : `${API_URL}/rooms`;

        try {
            const res = await fetch(url, { 
                method, 
                body: formData 
            });

            const contentType = res.headers.get("content-type");
            if (res.ok) {
                Swal.fire('สำเร็จ', isEditing ? 'แก้ไขข้อมูลห้องพักสำเร็จ' : 'เพิ่มห้องพักสำเร็จ', 'success');
                setShowRoomModal(false);
                setPreviews([]);
                setSelectedFiles([]);
                fetchRooms();
            } else {
                const result = contentType && contentType.includes("application/json") ? await res.json() : {};
                throw new Error(result.message || 'Server Internal Error (500)');
            }
        } catch (err) { 
            console.error("Submit Error:", err);
            Swal.fire('Error', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error'); 
        }
    };

    const handleUserUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        try {
            const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (res.ok) {
                setUsers(prevUsers => prevUsers.map(user => user.id === currentUser.id ? { ...user, ...userData } : user));
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขข้อมูลลูกค้าเรียบร้อย', timer: 1500, showConfirmButton: false });
                setShowUserModal(false);
                setTimeout(() => fetchUsers(), 500);
            }
        } catch (err) { console.error(err); }
    };

    const deleteRoom = (id) => {
        Swal.fire({
            title: 'ยืนยันการลบ?', text: "ข้อมูลห้องพักจะหายไป", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE' });
                fetchRooms();
            }
        });
    };

    const deleteUser = (id) => {
        if (id == 1) return Swal.fire('ห้ามลบ', 'ไม่สามารถลบ Super Admin ได้', 'warning');
        Swal.fire({
            title: 'ยืนยันการลบลูกค้า?', text: "ข้อมูลลูกค้าจะหายไปจากระบบ", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('ลบแล้ว', 'ลบข้อมูลลูกค้าเรียบร้อย', 'success');
                    fetchUsers();
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 border">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">จัดการข้อมูลระบบ</h1>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 shadow border">
                        <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 rounded-md flex items-center gap-2 font-bold ${activeTab === 'rooms' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <Home size={18} /> ห้องพัก
                        </button>
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md flex items-center gap-2 font-bold ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <Users size={18} /> ลูกค้า
                        </button>
                    </div>
                </div>

                {activeTab === 'rooms' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-700">รายการห้องพักทั้งหมด</h2>
                            <button onClick={() => { 
                                setIsEditing(false); 
                                setCurrentRoom(null); 
                                setPreviews([]);
                                setSelectedFiles([]);
                                setShowRoomModal(true); 
                            }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-bold shadow transition-transform active:scale-95">
                                <Plus size={18} /> เพิ่มห้องพักใหม่
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {rooms.map(room => (
                                <div key={room.id} className="bg-white rounded-[2rem] p-4 shadow-md border border-gray-100 flex items-center gap-6">
                                    <div className="w-32 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img 
                                            src={room.image_url ? `${API_URL}/uploads/${room.image_url}` : 'https://via.placeholder.com/150'} 
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-extrabold text-gray-800">{room.name}</h3>
                                        <div className="flex gap-4 mt-1 text-gray-600 font-medium text-sm">
                                            <span className="text-blue-600 font-bold text-lg">{Number(room.price).toLocaleString()} บาท/คืน</span>
                                            {/* ✅ แสดงจำนวนห้อง */}
                                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg border">
                                                <Box size={14} className="text-gray-500"/> มีทั้งหมด {room.room_count || 15} ห้อง
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { 
                                            setIsEditing(true); 
                                            setCurrentRoom(room); 
                                            setPreviews(room.image_url ? [`${API_URL}/uploads/${room.image_url}`] : []);
                                            setShowRoomModal(true); 
                                        }} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm">
                                            <Edit size={20} />
                                        </button>
                                        <button onClick={() => deleteRoom(room.id)} className="p-3 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition shadow-sm">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-700">จัดการข้อมูลลูกค้า</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-4 border">ชื่อ</th>
                                        <th className="p-4 border">อีเมล</th>
                                        <th className="p-4 border">เบอร์โทรศัพท์</th>
                                        <th className="p-4 border text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 border font-medium">{user.name}</td>
                                            <td className="p-4 border text-gray-600">{user.email}</td>
                                            <td className="p-4 border">{formatPhoneNumber(user.phone)}</td>
                                            <td className="p-4 border text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => { setCurrentUser(user); setShowUserModal(true); }} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition"><Edit size={18} /></button>
                                                    <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl border-4 border-white">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2"><Users className="text-blue-600" /> แก้ไขข้อมูลลูกค้า</h2>
                        <form onSubmit={handleUserUpdate} className="space-y-5">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ-นามสกุล</label><input name="name" defaultValue={currentUser?.name} className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">อีเมล</label><input name="email" type="email" defaultValue={currentUser?.email} className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label><input name="phone" defaultValue={formatPhoneNumber(currentUser?.phone)} className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required /></div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">ยกเลิก</button>
                                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95">บันทึกการแก้ไข</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRoomModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'แก้ไขห้องพัก' : 'เพิ่มห้องพักใหม่'}</h2>
                            <button onClick={() => setShowRoomModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อห้องพัก</label>
                                <input name="room_name" defaultValue={currentRoom?.name} className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ราคาต่อคืน (บาท)</label>
                                    <input name="price" type="number" defaultValue={currentRoom?.price} className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required />
                                </div>
                                
                                {/* ✅ เพิ่มช่องกรอกจำนวนห้อง */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนห้องทั้งหมด</label>
                                    <input name="room_count" type="number" defaultValue={currentRoom?.room_count || 15} min="1" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition" required />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">รูปภาพห้องพัก (เลือกได้หลายรูป)</label>
                                <div className="relative group">
                                    <input type="file" name="room_image" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" required={!isEditing} />
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-blue-50 group-hover:border-blue-200 transition">
                                        <ImageIcon size={40} className="text-gray-400 group-hover:text-blue-400 mb-2" />
                                        <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">คลิกเพื่อเลือกไฟล์รูปภาพ</span>
                                    </div>
                                </div>
                            </div>

                            {previews.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {previews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border shadow-sm">
                                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t">
                                <button type="button" onClick={() => setShowRoomModal(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">ยกเลิก</button>
                                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95">
                                    {isEditing ? 'บันทึกการแก้ไข' : 'ยืนยัน'}
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