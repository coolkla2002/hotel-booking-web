// client/src/pages/admin/AdminManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Trash2, Edit, Plus, Users, Home, ArrowLeft, Image as ImageIcon, X, Box } from 'lucide-react';
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

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate('/'); return; }

        fetchUsers();
        fetchRooms();
    }, [navigate]);

    const fetchUsers = () => {
        fetch(`${API_URL}/users`)
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error(err));
    };

    const fetchRooms = () => {
        fetch(`${API_URL}/rooms`)
            .then(res => res.json())
            .then(data => setRooms(data))
            .catch(err => console.error(err));
    };

    // --- จัดการ User ---
    const handleDeleteUser = (id) => {
        Swal.fire({
            title: 'ยืนยันการลบ?', text: "ข้อมูลลูกค้าจะหายไปถาวร!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบเลย'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${API_URL}/users/${id}`, { method: 'DELETE' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire('ลบสำเร็จ!', '', 'success');
                            fetchUsers();
                        } else {
                            Swal.fire('Error', data.message, 'error');
                        }
                    });
            }
        });
    };

    const handleEditUserClick = (user) => {
        setCurrentUser({ ...user, phone: formatPhoneNumber(user.phone) });
        setShowUserModal(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentUser)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('สำเร็จ', 'อัปเดตข้อมูลลูกค้าเรียบร้อย', 'success');
                setShowUserModal(false);
                fetchUsers();
                
                // ถ้า Admin แก้ตัวเอง ให้อัปเดต localStorage ด้วย
                const loggedUser = JSON.parse(localStorage.getItem('user'));
                if (loggedUser.id === currentUser.id) {
                    localStorage.setItem('user', JSON.stringify({ ...loggedUser, ...currentUser }));
                    navigate(0); // รีโหลดหน้าเพื่อให้ Navbar อัปเดต
                }
            } else {
                Swal.fire('ผิดพลาด', data.message, 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
    };

    // --- จัดการ Room ---
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(newPreviews);
        }
    };

    const handleAddRoom = () => {
        setIsEditing(false);
        setCurrentRoom({ name: '', description: '', price: '', amenities: '', capacity: 2, image_url: '' });
        setPreviews([]);
        setSelectedFiles([]);
        setShowRoomModal(true);
    };

    const handleEditRoom = (room) => {
        setIsEditing(true);
        setCurrentRoom(room);
        setPreviews(room.image_url ? [`${API_URL}${room.image_url}`] : []); // โชว์รูปเดิมถ้ามี
        setSelectedFiles([]);
        setShowRoomModal(true);
    };

    const handleDeleteRoom = (id) => {
        Swal.fire({
            title: 'ลบห้องพักนี้?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบ'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`${API_URL}/rooms/${id}`, { method: 'DELETE' })
                    .then(() => {
                        Swal.fire('ลบสำเร็จ', '', 'success');
                        fetchRooms();
                    });
            }
        });
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', currentRoom.name);
        formData.append('description', currentRoom.description);
        formData.append('price', currentRoom.price);
        formData.append('capacity', currentRoom.capacity);
        formData.append('amenities', currentRoom.amenities);

        // ถ้ามีการเลือกไฟล์ใหม่ ให้ส่งไป
        selectedFiles.forEach(file => {
            formData.append('images', file); 
        });

        const url = isEditing ? `${API_URL}/rooms/${currentRoom.id}` : `${API_URL}/rooms`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();
            if (data.success) {
                Swal.fire('สำเร็จ', isEditing ? 'แก้ไขห้องพักแล้ว' : 'เพิ่มห้องพักแล้ว', 'success');
                setShowRoomModal(false);
                fetchRooms();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Upload failed', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        // ✅ แก้ไขตรงนี้: ให้กลับไปหน้า /admin แทนหน้าแรก
                        onClick={() => navigate('/admin')} 
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold">ย้อนกลับ</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Box className="text-blue-600" /> จัดการข้อมูลพื้นฐาน
                    </h1>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm p-2 flex gap-2 mb-6 w-fit mx-auto">
                    <button onClick={() => setActiveTab('rooms')} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'rooms' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <Home size={18} /> จัดการห้องพัก
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <Users size={18} /> จัดการลูกค้า
                    </button>
                </div>

                {/* Content: Rooms */}
                {activeTab === 'rooms' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-700">รายการห้องพักทั้งหมด ({rooms.length})</h2>
                            <button onClick={handleAddRoom} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95">
                                <Plus size={20} /> เพิ่มห้องใหม่
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map((room) => (
                                <div key={room.id} className="group relative bg-white rounded-2xl border hover:border-blue-400 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="h-48 overflow-hidden relative">
                                        <img src={room.image_url ? `${API_URL}${room.image_url}` : 'https://placehold.co/600x400'} alt={room.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditRoom(room)} className="p-2 bg-white/90 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white shadow"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteRoom(room.id)} className="p-2 bg-white/90 text-red-600 rounded-lg hover:bg-red-600 hover:text-white shadow"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-gray-800 mb-1">{room.name}</h3>
                                        <p className="text-blue-600 font-bold text-xl">{Number(room.price).toLocaleString()} ฿ <span className="text-xs text-gray-400 font-normal">/ คืน</span></p>
                                        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                                            <span>👥 {room.capacity} ท่าน</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${room.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{room.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content: Users */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-fade-in">
                        <h2 className="text-xl font-bold text-gray-700 mb-6">รายชื่อลูกค้าในระบบ ({users.length})</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                        <th className="p-4 rounded-tl-xl">ID</th>
                                        <th className="p-4">ชื่อ-นามสกุล</th>
                                        <th className="p-4">อีเมล</th>
                                        <th className="p-4">เบอร์โทร</th>
                                        <th className="p-4">บทบาท</th>
                                        <th className="p-4 text-center rounded-tr-xl">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 text-sm">
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 font-bold text-gray-400">#{user.id}</td>
                                            <td className="p-4 font-bold">{user.name}</td>
                                            <td className="p-4">{user.email}</td>
                                            <td className="p-4">{user.phone || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center flex justify-center gap-2">
                                                <button onClick={() => handleEditUserClick(user)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Add/Edit Room */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold flex items-center gap-2">{isEditing ? <Edit size={18}/> : <Plus size={18}/>} {isEditing ? 'แก้ไขห้องพัก' : 'เพิ่มห้องพักใหม่'}</h3>
                            <button onClick={() => setShowRoomModal(false)} className="hover:bg-gray-700 p-1 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">ชื่อห้องพัก</label><input type="text" className="w-full border p-2 rounded-lg" value={currentRoom.name} onChange={e => setCurrentRoom({...currentRoom, name: e.target.value})} required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">ราคา (บาท)</label><input type="number" className="w-full border p-2 rounded-lg" value={currentRoom.price} onChange={e => setCurrentRoom({...currentRoom, price: e.target.value})} required /></div>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">คำอธิบาย</label><textarea className="w-full border p-2 rounded-lg h-24" value={currentRoom.description} onChange={e => setCurrentRoom({...currentRoom, description: e.target.value})}></textarea></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">ความจุ (คน)</label><input type="number" className="w-full border p-2 rounded-lg" value={currentRoom.capacity} onChange={e => setCurrentRoom({...currentRoom, capacity: e.target.value})} required /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">สิ่งอำนวยความสะดวก (คั่นด้วย ,)</label><input type="text" className="w-full border p-2 rounded-lg" value={currentRoom.amenities} onChange={e => setCurrentRoom({...currentRoom, amenities: e.target.value})} placeholder="Wifi, TV, Air Con" /></div>
                            </div>
                            
                            {/* Upload Image */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รูปภาพหลัก</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                    <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon size={32} />
                                        <span className="text-sm mt-2">คลิกเพื่ออัปโหลดรูปภาพ</span>
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
                                <button type="button" onClick={() => setShowRoomModal(false)} className="px-6 py-2 text-red-500 font-bold hover:bg-gray-50 rounded-xl transition">ยกเลิก</button>
                                <button type="submit" className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95">
                                    {isEditing ? 'บันทึกการแก้ไข' : 'ยืนยัน'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit User */}
            {showUserModal && currentUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-purple-800 p-4 flex justify-between items-center text-white">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Edit size={18}/> แก้ไขข้อมูลลูกค้า</h3>
                            <button onClick={() => setShowUserModal(false)} className="hover:bg-purple-700 p-1 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ-นามสกุล</label><input type="text" className="w-full border p-2 rounded-lg" value={currentUser.name} onChange={e => setCurrentUser({...currentUser, name: e.target.value})} required /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label><input type="text" className="w-full border p-2 rounded-lg" value={currentUser.phone} onChange={e => setCurrentUser({...currentUser, phone: e.target.value})} /></div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">บทบาท</label>
                                <select className="w-full border p-2 rounded-lg bg-white" value={currentUser.role} onChange={e => setCurrentUser({...currentUser, role: e.target.value})}>
                                    <option value="user">User (ลูกค้าทั่วไป)</option>
                                    <option value="manager">Manager (ผู้จัดการ)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t">
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