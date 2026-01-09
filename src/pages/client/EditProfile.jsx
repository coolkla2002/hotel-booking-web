import React, { useState, useEffect } from 'react';
import { User, Settings, Camera, Pencil, Phone, Globe } from 'lucide-react';
import Swal from 'sweetalert2';

const EditProfile = ({ user, onUpdateUser }) => {
  // 1. เพิ่มตัวดักจับ: ถ้าข้อมูล User ยังไม่มา ให้แสดง Loading (กันจอขาว)
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
    gender: '',
    birthdate: '',
    phone: '', // ✅ ใช้ตัวแปร phone
    email: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        gender: user.gender || '',
        birthdate: user.birthdate || '',
        phone: user.phone || '', // ✅ ดึงข้อมูลจาก user.phone
        email: user.email || '',
      });

      // ถ้ามีรูปในฐานข้อมูล ให้โชว์รูปนั้น
      if (user?.profile_image) {
        setPreview(`https://hotel-booking-web-kfks.onrender.com/uploads/${user.profile_image}`);
      } else {
        setPreview(null);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
        const data = new FormData();
        data.append('id', user.id);
        data.append('name', formData.name);
        data.append('gender', formData.gender);
        data.append('birthdate', formData.birthdate);
        data.append('phone', formData.phone); // ✅ ส่งข้อมูล key 'phone'
        
        if (imageFile) {
            data.append('profile_image', imageFile);
        }

        const response = await fetch('http://localhost:3000/update-user', {
            method: 'PUT',
            body: data
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลเรียบร้อย!',
                text: 'ระบบได้อัปเดตข้อมูลของคุณแล้ว',
                timer: 1500,
                showConfirmButton: false
            });

            if (result.user) {
                // เรียกฟังก์ชันนี้เพื่ออัปเดตข้อมูลไปยัง Navbar
                onUpdateUser(result.user);

                // อัปเดต Preview รูปในหน้านี้ทันที + ใส่ timestamp กัน Cache
                if (result.user.profile_image) {
                    setPreview(`https://hotel-booking-web-kfks.onrender.com/uploads/${result.user.profile_image}?t=${Date.now()}`);
                }
                
                setImageFile(null);
            }
        } else {
            Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้', 'error');
    }
  };

  const handleImageError = () => {
      setPreview(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-900 mb-8 flex items-center gap-3">
        <Settings size={36} className="text-blue-500" /> 
        แก้ไขข้อมูลผู้ใช้/Edit user information
      </h2>

      <div className="bg-blue-200/50 p-8 rounded-[50px] shadow-xl relative">
        
        {/* ส่วนรูปโปรไฟล์ */}
        <div className="flex justify-center mb-10 relative">
          <div className="w-40 h-40 rounded-full bg-white border-4 border-blue-300 flex items-center justify-center overflow-hidden shadow-md relative group">
            
            {preview ? (
                <img 
                    key={preview} 
                    src={preview} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={handleImageError} 
                />
            ) : (
                <img 
                    src="https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg?w=740" 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                />
            )}
            
            <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white font-bold flex flex-col items-center">
                    <Camera size={24} />
                    <span>เปลี่ยนรูป</span>
                </span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>

            <div className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white pointer-events-none">
                <Camera size={20} />
            </div>
          </div>
        </div>

        {/* ฟอร์มแก้ไขข้อมูล */}
        <form className="space-y-6 max-w-2xl mx-auto">
          
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
              <select name="gender" value={formData.gender} onChange={handleChange}
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
                {/* ✅ name="phone" และ value={formData.phone} */}
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