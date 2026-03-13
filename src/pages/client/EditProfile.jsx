// client/src/pages/client/EditProfile.jsx

import React, { useState, useEffect } from 'react';
import { Settings, Pencil, Phone, Globe, Hash } from 'lucide-react'; 
import Swal from 'sweetalert2';
import API_URL from "/src/config";

const EditProfile = ({ user, onUpdateUser }) => {
  console.log("ข้อมูล user ที่ส่งมาหน้าแก้ไขโปรไฟล์:", user);
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-blue-800 font-bold animate-pulse">
          กำลังโหลดข้อมูลสมาชิก...
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: '',
    sex: '', // แก้จาก gender เป็น sex
    birthdate: '',
    phone: '', 
    email: '',
  });

  useEffect(() => {
    if (user) {
      const formatPhone = (phone) => {
        if (!phone) return '';
        let p = phone.toString();
        if (p.length === 9 && !p.startsWith('0')) {
          return '0' + p;
        }
        return p;
      };

      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; 
        return date.toISOString().split('T')[0]; 
      };

      // ✅ แก้ไขส่วน setFormData ตรงนี้ให้ดึง gender และ birthdate มาด้วย
      setFormData({
        name: user.name || '',
        sex: user.sex || '', // แก้จาก gender เป็น sex
        birthdate: formatDate(user.birthdate),
        phone: formatPhone(user.phone),
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
        // เปลี่ยนจาก FormData เป็น Object ธรรมดา
        const payload = {
            id: user.id || user.user_id,
            name: formData.name || '',
            sex: formData.sex || '',
            birthdate: formData.birthdate || '',
            phone: formData.phone || ''
        };

        const response = await fetch(API_URL + '/update-user', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json' // ระบุว่าส่ง JSON
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            const updatedUser = {
                ...user,            
                ...formData         
            };

            localStorage.setItem('user', JSON.stringify(updatedUser));

            await Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลเรียบร้อย!',
                text: 'ระบบได้อัปเดตข้อมูลของคุณแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

            if (onUpdateUser) {
                onUpdateUser(updatedUser);
            }
        } else {
            Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-900 mb-8 flex items-center gap-3">
        <Settings size={36} className="text-blue-500" /> 
        แก้ไขข้อมูลผู้ใช้/Edit user information
      </h2>

      <div className="bg-blue-200/50 p-8 rounded-[50px] shadow-xl relative">
        <form className="space-y-6 max-w-2xl mx-auto">
          
          <div>
            <label className="block text-blue-900 font-bold mb-2 text-2xl">
                User ID <span className="text-sm text-red-500 font-normal ml-2">*ไม่สามารถแก้ไขได้</span>
            </label>
            <div className="relative">
                <input 
                  type="text" 
                  value={user.id || user.user_id || ''} 
                  disabled
                  className="w-full p-4 pr-12 rounded-2xl bg-gray-300 border-2 border-gray-400 text-gray-600 text-xl font-bold shadow-inner cursor-not-allowed"
                />
                <Hash size={28} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-blue-900 font-bold mb-2 text-2xl">ชื่อ - นามสกุล</label>
            <div className="relative">
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange}
                  className="w-full p-4 pr-12 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-800 text-xl font-bold shadow-inner"
                />
                <Pencil size={28} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-blue-900 font-bold mb-2 text-2xl">เพศ</label>
              <select name="sex" value={formData.sex} onChange={handleChange}
                  className="w-full p-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-800 text-xl font-bold shadow-inner appearance-none">
                <option value="">เลือกเพศ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-blue-900 font-bold mb-2 text-2xl">วัน/เดือน/ปีเกิด</label>
              <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange}
                className="w-full p-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-800 text-xl font-bold shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-blue-900 font-bold mb-2 text-2xl">เบอร์โทรศัพท์</label>
            <div className="relative">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full p-4 pr-12 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-blue-400 focus:outline-none text-gray-800 text-xl font-bold shadow-inner underline decoration-2 underline-offset-4"
                />
                <Phone size={28} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-blue-900 font-bold mb-2 text-2xl">
                อีเมล <span className="text-sm text-red-500 font-normal ml-2">*ไม่สามารถแก้ไขได้</span>
            </label>
            <div className="relative">
                <input type="email" name="email" value={formData.email} disabled
                  className="w-full p-4 pr-12 rounded-2xl bg-gray-300 border-2 border-gray-400 text-gray-500 text-xl font-bold shadow-inner cursor-not-allowed"
                />
                <Globe size={28} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-center gap-8 mt-12">
            <button type="button" onClick={handleSave}
                className="bg-green-400 hover:bg-green-500 text-white text-2xl font-bold py-4 px-16 rounded-full shadow-lg transition-transform active:scale-95">
              แก้ไข
            </button>
            <button type="button"
                className="bg-red-400 hover:bg-red-500 text-white text-2xl font-bold py-4 px-16 rounded-full shadow-lg transition-transform active:scale-95">
              ยกเลิก
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfile;