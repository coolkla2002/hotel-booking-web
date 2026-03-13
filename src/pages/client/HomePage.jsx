// client/src/pages/client/HomePage.jsx

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/airbnb.css";
import API_URL from "/src/config";

// ✅ Import Swiper Components & Styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// ✅ Import Icons
import {
  Wifi, Users, Star, Calendar, ArrowRight, Car, Thermometer, Wind, Tv, Coffee,
  CheckCircle, Image as ImageIcon, Search, Info, Clock, AlertCircle, MapPin, Phone, Mail
} from 'lucide-react';

const FALLBACK_IMAGE = "https://placehold.co/600x400?text=No+Image";

const HomePage = () => {
  const [rooms, setRooms] = useState([]);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  const getImageUrl = (path) => {
    if (!path) return FALLBACK_IMAGE;
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.includes('uploads/')) {
      cleanPath = cleanPath.substring(cleanPath.indexOf('uploads/'));
    } else if (!cleanPath.startsWith('/') && !cleanPath.includes('uploads')) {
      cleanPath = 'uploads/' + cleanPath;
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    return `${API_URL}${cleanPath}`;
  };

  useEffect(() => {
    fetchRooms();
    flatpickr("#date-range-picker", {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      showMonths: 2,
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          const start = selectedDates[0];
          const end = selectedDates[1];
          const offset = start.getTimezoneOffset() * 60000;
          const localStart = new Date(start.getTime() - offset).toISOString().split('T')[0];
          const localEnd = new Date(end.getTime() - offset).toISOString().split('T')[0];
          setCheckInDate(localStart);
          setCheckOutDate(localEnd);
        }
      }
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms`);
      if (!res.ok) throw new Error("ดึงข้อมูลห้องไม่สำเร็จ");
      const data = await res.json();
  
      const formattedRooms = data.map(room => ({
        ...room,
        image: getImageUrl(room.image_url),
        // แก้ไขตรง subImages ให้ดึงรูป 1-4 มาใส่
        subImages: [
          getImageUrl(room.image_url),
          getImageUrl(room.picture2),
          getImageUrl(room.picture3),
          getImageUrl(room.picture4)
        ].filter(img => img !== FALLBACK_IMAGE), // กรองเอาเฉพาะรูปที่มีจริง (ถ้าว่างจะเป็น fallback)
        
        amenities: typeof room.amenities === 'string' 
          ? room.amenities.split(',').map(item => item.trim()) 
          : (room.amenities || []),
        description: room.description || 'ห้องพักบรรยากาศอบอุ่น...',
        capacity: room.capacity || 2,
        room_count: room.room_count 
      }));
  
      setRooms(formattedRooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleBooking = async (room) => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเข้าสู่ระบบ',
        text: 'คุณต้องล็อกอินก่อนทำการจองห้องพัก',
        confirmButtonText: 'ไปหน้าล็อกอิน',
        confirmButtonColor: '#1e3a8a',
      }).then((result) => {
        if (result.isConfirmed) navigate('/login');
      });
      return;
    }

    if (!checkInDate || !checkOutDate) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันเช็คอิน - เช็คเอาท์ก่อน', 'warning');
      return;
    }

    Swal.fire({ title: 'กำลังตรวจสอบห้องว่าง...', didOpen: () => Swal.showLoading() });

    let availableRooms = 0;
    let totalRooms = room.room_count ? room.room_count : 15; 

    try {
      const res = await fetch(`${API_URL}/check-availability?roomName=${encodeURIComponent(room.name)}&checkIn=${checkInDate}&checkOut=${checkOutDate}`);
      const data = await res.json();
      availableRooms = data.available;
      if (data.total > 0) {
          totalRooms = data.total;
      }
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'ไม่สามารถตรวจสอบห้องว่างได้', 'error');
      return;
    }

    if (availableRooms <= 0) {
      Swal.fire('ขออภัย', 'ห้องพักเต็มในช่วงเวลาที่เลือก', 'error');
      return;
    }

    const { value: roomCount } = await Swal.fire({
      title: `ว่าง ${availableRooms} ห้อง (จากทั้งหมด ${totalRooms} ห้อง)`,
      text: 'กรุณาระบุจำนวนห้องที่ต้องการจอง',
      input: 'select',
      inputOptions: Object.fromEntries(Array.from({ length: availableRooms }, (_, i) => [i + 1, `${i + 1} ห้อง`])),
      inputPlaceholder: 'เลือกจำนวนห้อง',
      confirmButtonText: 'ถัดไป',
      confirmButtonColor: '#1e3a8a',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'กรุณาเลือกจำนวนห้อง';
      }
    });

    if (!roomCount) return;

    const nights = calculateNights();
    const basePrice = room.price * nights * parseInt(roomCount);

    const { value: userType } = await Swal.fire({
      title: '<span class="text-xl font-serif">เลือกประเภทสิทธิประโยชน์</span>',
      html: `
        <div class="grid grid-cols-1 gap-4 mt-4">
          <label class="relative border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-all block text-left group has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
            <input type="radio" name="user_type_radio" value="general" class="hidden peer" checked>
            <div>
              <p class="font-bold text-gray-900">บุคคลทั่วไป</p>
              <p class="text-xs text-gray-500">Standard Rate</p>
            </div>
          </label>
          
          <label class="relative border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-all block text-left group has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
            <input type="radio" name="user_type_radio" value="official" class="hidden peer">
            <div>
              <p class="font-bold text-gray-900">ข้าราชการ / พนักงานราชการ</p>
              <p class="text-xs text-blue-600 font-medium">ลดทันที 100 บาท ต่อการจอง</p>
            </div>
          </label>
        </div>
      `,
      focusConfirm: false,
      confirmButtonText: 'ยืนยันสิทธิ์และถัดไป',
      confirmButtonColor: '#1e3a8a',
      preConfirm: () => {
        return document.querySelector('input[name="user_type_radio"]:checked').value;
      }
    });

    if (!userType) return;

    const finalPrice = userType === 'official' ? Math.max(0, basePrice - 100) : basePrice;

    const { value: formValues } = await Swal.fire({
      title: '<span class="text-xl font-serif">สรุปรายละเอียดและชำระเงิน</span>',
      html: `
        <div class="text-left space-y-4 pt-2">
           <div class="bg-blue-900 text-white p-4 rounded-xl shadow-inner">
             <div class="flex justify-between items-center mb-1">
                <span class="text-xs opacity-80 uppercase tracking-widest">Net Total</span>
                <span class="text-xs bg-white/20 px-2 py-0.5 rounded">${roomCount} ห้อง x ${nights} คืน</span>
             </div>
             <p class="text-3xl font-bold">฿${finalPrice.toLocaleString()}</p>
             ${userType === 'official' ? '<p class="text-[10px] mt-1 text-red-300">*ประยุกต์ใช้ส่วนลดข้าราชการเรียบร้อยแล้ว</p>' : ''}
           </div>
           
           <div class="space-y-2">
             <label class="block text-xs font-bold text-gray-500 uppercase">1. ช่องทางชำระเงิน</label>
             <select id="payment_method" class="w-full border-2 border-gray-100 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none">
                <option value="bank_transfer">โอนผ่านธนาคาร (กสิกรไทย 012-3-45678-9)</option>
                <option value="qr_code">QR Code PromptPay (แสดงรหัสสแกน)</option>
             </select>
           </div>

           <div id="qr_display" class="hidden flex flex-col items-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PROMPTPAY_PAYMENT_ID" alt="QR Code" class="w-32 h-32 mb-2">
             <p class="text-[10px] text-gray-500 font-medium">ชื่อบัญชี: บจก. อาร์ซีแบท โฮเทล</p>
           </div>

           <div class="space-y-2">
             <label class="block text-xs font-bold text-gray-500 uppercase">2. อัปโหลดสลิป</label>
             <input type="file" id="slip_file" accept="image/*" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
           </div>

           ${userType === 'official' ? `
           <div class="space-y-2 border-t pt-3">
             <label class="block text-xs font-bold text-red-600 uppercase">3. บัตรยืนยันตัวตน (ราชการ)</label>
             <input type="file" id="gov_card_file" accept="image/*" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100">
           </div>
           ` : ''}
        </div>
      `,
      didOpen: () => {
        const methodSelect = document.getElementById('payment_method');
        const qrDisplay = document.getElementById('qr_display');
        methodSelect.addEventListener('change', (e) => {
          if (e.target.value === 'qr_code') {
            qrDisplay.classList.remove('hidden');
          } else {
            qrDisplay.classList.add('hidden');
          }
        });
      },
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการจอง',
      confirmButtonColor: '#10B981',
      preConfirm: () => {
        const slip = document.getElementById('slip_file').files[0];
        const method = document.getElementById('payment_method').value;
        const govCard = userType === 'official' ? document.getElementById('gov_card_file').files[0] : null;

        if (!slip) {
          Swal.showValidationMessage('กรุณาแนบหลักฐานการโอนเงิน');
          return false;
        }
        if (userType === 'official' && !govCard) {
          Swal.showValidationMessage('ข้าราชการจำเป็นต้องแนบรูปบัตรเพื่อยืนยันสิทธิ์');
          return false;
        }

        return { slip, method, govCard };
      }
    });

    if (!formValues) return;

    Swal.fire({ title: 'กำลังประมวลผล...', didOpen: () => Swal.showLoading() });

    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('room_id', room.id);
      formData.append('room_name', room.name);
      formData.append('check_in_date', checkInDate);
      formData.append('check_out_date', checkOutDate);
      formData.append('price', finalPrice);
      formData.append('payment_method', formValues.method);
      formData.append('user_type', userType);
      formData.append('slip', formValues.slip);
      formData.append('room_count', roomCount);

      if (formValues.govCard) formData.append('gov_card', formValues.govCard);

      const response = await fetch('${API_URL}/reserve', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'การจองสำเร็จ!',
          text: `จอง ${roomCount} ห้อง เรียบร้อยแล้ว`,
          timer: 3000
        }).then(() => navigate('/history'));
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'ไม่สามารถติดต่อ Server ได้', 'error');
    }
  };

  const openImageModal = (imageUrl) => {
    Swal.fire({
      imageUrl: imageUrl,
      imageAlt: 'Room Preview',
      showConfirmButton: false,
      showCloseButton: true,
      width: 'auto',
      background: 'transparent',
      customClass: {
        popup: 'border-none shadow-none',
        image: 'rounded-xl max-h-[85vh]'
      }
    });
  };

  return (
    // ✅ เพิ่ม min-h-screen และบังคับพื้นหลังสีฟ้าอ่อน bg-blue-50 ให้เต็มจอ
    <div className="font-sans text-gray-800 relative bg-blue-50 min-h-screen">

      {/* ================= HERO SECTION ================= */}
      <div className="relative h-screen w-full overflow-hidden bg-black">
        {/* ✅ ลบ div ที่เกินมาตรงนี้ออกแล้ว */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] hover:scale-105"
          style={{ 
            backgroundImage: "url('https://i.ibb.co/nq5MsC0W/654aa3a1-fecb-4d04-a882-225008531d5b-upscayl-4x-upscayl-standard-4x.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat'
          }} 
        >
        </div>

        {/* BOOKING BAR */}
        <div className="absolute bottom-0 left-0 w-full z-20">
          <div className="bg-white/95 backdrop-blur-xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] py-6 px-4 md:px-10 border-t border-gray-100">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex-1 w-full md:max-w-lg relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">เลือกวัน Check-in — Check-out</label>
                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-3 group-hover:border-blue-400 transition-colors">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    id="date-range-picker"
                    type="text"
                    placeholder="เลือกวันเข้าพัก..."
                    className="w-full bg-transparent outline-none text-gray-800 font-medium placeholder-gray-400 text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="hidden md:block text-center px-6 border-l border-gray-200">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration (จำนวนคืน)</div>
                <div className="font-serif font-bold text-blue-900 text-xl">
                  {calculateNights() > 0 ? `${calculateNights()} Nights` : '-'}
                </div>
              </div>

              <button
                onClick={() => document.getElementById('rooms-section').scrollIntoView({ behavior: 'smooth' })}
                className="w-full md:w-auto bg-gray-900 hover:bg-blue-900 text-white font-medium py-4 px-10 rounded-lg uppercase tracking-widest text-xs transition-all duration-300 shadow-lg"
              >
                เช็คห้องว่าง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ROOMS DISPLAY ================= */}
      <div id="rooms-section" className="py-20 px-4 md:px-10 max-w-7xl mx-auto" style={{ backgroundColor: '#dbeafe', borderRadius: '24px' }}>
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">ห้องพัก</h2>
            <div className="h-1 w-20 bg-blue-600 mt-4"></div>
          </div>
          <div className="hidden md:flex gap-3">
            <button className="swiper-button-prev-custom p-4 border border-gray-200 rounded-full hover:bg-gray-900 hover:text-white transition-all">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <button className="swiper-button-next-custom p-4 border border-gray-200 rounded-full hover:bg-gray-900 hover:text-white transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          navigation={{ nextEl: '.swiper-button-next-custom', prevEl: '.swiper-button-prev-custom' }}
          pagination={{ clickable: true, dynamicBullets: true }}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          className="pb-16"
        >
          {rooms.map((room) => (
            <SwiperSlide key={room.id} className="h-full">
              <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl flex flex-col lg:flex-row h-full">

                <div className="lg:w-3/5 p-2 bg-gray-50">
                  <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[450px]">
                    {[
                      "https://i.ibb.co/bjp66hXD/a470ece9-4af2-4456-aeb4-abe576738a2f.jpg",
                      "https://i.ibb.co/v6jP65rC/0fc397c0-6fe5-44fa-af75-7438a561d1d0.jpg",
                      "https://i.ibb.co/zVC8zJss/d28617be-6241-4eba-b46b-fdc292c57f06.jpg",
                      "https://i.ibb.co/tTFVrftL/f9e3d921-a105-4f6e-a127-a6ccd4686b41.jpg"
                    ].map((imgUrl, index) => (
                      <div 
                        key={index} 
                        className="relative group overflow-hidden rounded-xl cursor-zoom-in"
                        onClick={() => openImageModal(imgUrl)}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Room view ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <ImageIcon className="text-white w-8 h-8" />
                        </div>
                        {index === 3 && (
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs flex items-center gap-1">
                            <Users size={12} /> {room.capacity} ท่าน
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:w-2/5 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-600">{Number(room.price).toLocaleString()}</p>
                        <p className="text-gray-400 text-sm">บาท / คืน</p>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6 border-l-4 border-blue-500 pl-4 bg-gray-50 py-2 rounded-r-lg text-sm">
                      {room.description}
                    </p>

                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle size={16} className="text-green-500" /> สิ่งอำนวยความสะดวก
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-8">
                      {room.amenities && room.amenities.length > 0 ? (
                        room.amenities.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle size={14} className="text-blue-500" />
                            <span>{item}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-blue-400 italic col-span-2">เดี่ยวไปแก้</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => handleBooking(room)}
                      disabled={!checkInDate || !checkOutDate}
                      className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 ${!checkInDate || !checkOutDate
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                        }`}
                    >
                      {(!checkInDate || !checkOutDate) ? 'กรุณาเลือกวันเข้าพัก' : `จอง ${room.name}`}
                    </button>
                    {checkInDate && checkOutDate && (
                      <p className="text-center text-xs text-blue-600 mt-2 font-medium">✨ ระบบจะตรวจสอบห้องว่างในขั้นตอนถัดไป</p>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {rooms.length === 0 && (
          <div className="text-center py-24 bg-blue-100/50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-light">กำลังโหลดข้อมูลห้องพัก...</p>
          </div>
        )}
      </div>

      {/* ================= CONDITIONS SECTION ================= */}
      <div className="py-16 border-t border-blue-100" style={{ backgroundColor: '#dbeafe' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center justify-center gap-2">
              <Info className="text-blue-600" /> ข้อกำหนดและเงื่อนไขการจอง
            </h2>
            <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 1. นโยบายการยกเลิก */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 bg-red-100 w-24 h-24 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <AlertCircle className="text-red-500 w-10 h-10 mb-4 relative z-10" />
              <h3 className="text-lg font-bold text-gray-800 mb-3 relative z-10">การยกเลิกการจอง & คืนเงิน</h3>
              <ul className="space-y-3 text-sm text-gray-600 relative z-10">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>ลูกค้าสามารถแจ้งขอยกเลิกการจองได้ผ่านระบบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>กรณีอนุมัติการยกเลิก ทางโรงแรมจะดำเนินการ <span className="text-red-600 font-bold bg-red-50 px-1 rounded">คืนเงินให้ 20%</span> ของยอดที่ชำระเข้ามาเท่านั้น</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>การดำเนินการคืนเงินใช้เวลาประมาณ 3-7 วันทำการ</span>
                </li>
              </ul>
            </div>

            {/* 2. การเลื่อนวันและเวลา */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 bg-blue-100 w-24 h-24 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <Clock className="text-blue-500 w-10 h-10 mb-4 relative z-10" />
              <h3 className="text-lg font-bold text-gray-800 mb-3 relative z-10">การเลื่อนวัน & เวลาเข้าพัก</h3>
              <ul className="space-y-3 text-sm text-gray-600 relative z-10">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>สามารถขอเลื่อนวันเข้าพักได้ (ขึ้นอยู่กับห้องว่างในช่วงเวลานั้น)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>ต้องแจ้งล่วงหน้าก่อนวันเช็คอินเดิม</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><b>Check-in:</b> ตั้งแต่เวลา 14:00 น. เป็นต้นไป</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><b>Check-out:</b> ก่อนเวลา 12:00 น.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CONTACT & MAP SECTION ================= */}
      <div className="py-16 border-t border-blue-100" id="contact-section" style={{ backgroundColor: '#dbeafe' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* 1. ข้อมูลติดต่อ */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">ติดต่อเรา</h2>
                <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">ที่อยู่</h4>
                    <p className="text-gray-600">123 ถนนตัวอย่าง ตำบลในเมือง อำเภอเมือง<br />จังหวัดนครราชสีมา 30000</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-green-50 p-3 rounded-full text-green-600">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">เบอร์โทรศัพท์</h4>
                    <p className="text-gray-600">044-xxx-xxx</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-purple-50 p-3 rounded-full text-purple-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">อีเมล</h4>
                    <p className="text-gray-600">contact@rcbathotel.com</p>
                  </div>
                </div>
              </div>

              <a
                href="https://maps.apple/p/T_8~fwPJjQGE6K"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg hover:-translate-y-1"
              >
                <MapPin size={20} />
                เปิดดูแผนที่
              </a>
            </div>

            {/* 2. รูปแผนที่ */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-75 blur-lg group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white h-[400px]">
                <img
                  src="https://i.ibb.co/HDgc210L/S-46227459.jpg"
                  alt="Map Location"
                  className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>

                {/* Overlay Text */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
                  <p className="text-sm font-bold text-gray-800">RCBAT Hotel</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* ✅ บังคับให้พื้นหลังทั้งหน้าเป็นสีฟ้า เพื่อป้องกันขอบสีขาว */
        body { 
          background-color: #eff6ff !important; 
        }
        .flatpickr-calendar {
            box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
            border: none !important;
            border-radius: 16px !important;
        }
        .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange {
            background: #1e3a8a !important;
            border-color: #1e3a8a !important;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
            animation: slideUp 0.8s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .swal2-input, .swal2-file, .swal2-select { font-size: 0.875rem !important; }
      `}</style>
    </div>
  );
};

export default HomePage;