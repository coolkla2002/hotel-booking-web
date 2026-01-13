// client/src/pages/client/HomePage.jsx

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/material_blue.css";
import API_URL from "/src/config";

// ✅ Import Swiper Components & Styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// ไอคอนติ๊กถูก
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const CheckIconGreen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// ฟังก์ชันช่วย: แตกช่วงวันที่
const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    while (currentDate < lastDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

const HomePage = ({ user }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [availability, setAvailability] = useState({});

  const fetchRoomsData = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms`);
      const data = await res.json();
      setRooms(data);

      const initialAvailability = {};
      data.forEach(room => {
        initialAvailability[room.name] = 15; 
      });

      for (const room of data) {
          const resAvail = await fetch(`${API_URL}/room-availability?room_name=${encodeURIComponent(room.name)}`);
          const dataAvail = await resAvail.json();
          initialAvailability[room.name] = dataAvail.available;
      }
      setAvailability(initialAvailability);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  useEffect(() => {
    fetchRoomsData();
    const interval = setInterval(fetchRoomsData, 10000);
    return () => clearInterval(interval);
  }, []);

  // เช็ค Role
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData.role === 'admin') navigate('/admin');   
        else if (userData.role === 'manager') navigate('/manager'); 
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, [navigate]);

  // ✅ ฟังก์ชันแสดงรูปภาพขยายใหญ่แบบ Gallery (เลื่อนรูปได้)
  const handleViewGallery = (room, initialIndex = 0) => {
    const images = [
      `${API_URL}/uploads/${room.image_url}`,
      room.name.includes('Double') ? "/images/IMG_5826.jpg" : "/images/8954a46a-7e0f-403d-9e30-f6d17ad26261.jpg",
      room.name.includes('Double') ? "/images/IMG_5829.jpg" : "/images/8d380d21-c2bc-44f1-9dba-9f9f52eb3004.jpg"
    ];

    const showModal = (index) => {
      Swal.fire({
        title: `${room.name} (${index + 1}/${images.length})`,
        imageUrl: images[index],
        imageAlt: `Room Image ${index + 1}`,
        showConfirmButton: index < images.length - 1,
        showDenyButton: index > 0,
        showCloseButton: true,
        confirmButtonText: 'ถัดไป →',
        denyButtonText: '← ย้อนกลับ',
        returnDirect: true,
        customClass: {
          image: 'rounded-lg max-h-[70vh] object-contain cursor-default',
          actions: 'flex justify-between w-full px-8'
        },
      }).then((result) => {
        if (result.isConfirmed) {
          showModal(index + 1);
        } else if (result.isDenied) {
          showModal(index - 1);
        }
      });
    };
    showModal(initialIndex);
  };

  const handleReserve = async (roomType, pricePerNight) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเข้าสู่ระบบ',
        text: 'คุณต้องล็อกอินหรือสมัครสมาชิกก่อนทำการจองห้องพัก',
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ระบบ',
        cancelButtonText: 'ยกเลิก'
      }).then((result) => {
        if (result.isConfirmed) navigate('/login');
      });
      return;
    }

    const userId = user.id || user.user_id || user.ID;
    if (!userId) {
        Swal.fire('ข้อมูลผิดพลาด', 'ไม่พบ User ID', 'error');
        return;
    }

    let fullDates = [];
    try {
        const response = await fetch(`${API_URL}/bookings/occupied?room_name=${encodeURIComponent(roomType)}`);
        const bookings = await response.json();
        
        if (Array.isArray(bookings)) {
            const MAX_ROOMS = 15;
            const dailyCounts = {};

            bookings.forEach(booking => {
                const range = getDatesInRange(booking.check_in_date, booking.check_out_date);
                range.forEach(dateStr => {
                    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + (booking.room_count || 1);
                });
            });

            fullDates = Object.keys(dailyCounts).filter(date => dailyCounts[date] >= MAX_ROOMS);
        }
    } catch (err) {
        console.error("Error fetching occupied dates:", err);
    }

    const { value: bookingData } = await Swal.fire({
      title: `จองห้องพัก: ${roomType} 📅`,
      html: `
        <div class="flex flex-col gap-4 text-left">
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">จำนวนห้อง (ว่าง ${availability[roomType] || 0} ห้อง)</label>
                <input type="number" id="swal-room-count" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value="1" min="1" max="${availability[roomType] || 15}">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">วันที่เช็คอิน</label>
                <input type="text" id="swal-checkin" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" placeholder="เลือกวันเช็คอิน...">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">วันที่เช็คเอาท์</label>
                <input type="text" id="swal-checkout" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" placeholder="เลือกวันเช็คเอาท์..." disabled>
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ถัดไป',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => {
        const checkInInput = document.getElementById('swal-checkin');
        const checkOutInput = document.getElementById('swal-checkout');
        flatpickr(checkInInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: fullDates,
            onChange: (selectedDates) => {
                checkOutInput.disabled = false;
                if (checkOutInput._flatpickr) {
                     checkOutInput._flatpickr.set('minDate', new Date(selectedDates[0].getTime() + 86400000));
                }
                checkOutInput.focus();
            }
        });
        flatpickr(checkOutInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: fullDates,
        });
      },
      preConfirm: () => {
        const checkIn = document.getElementById('swal-checkin').value;
        const checkOut = document.getElementById('swal-checkout').value;
        const roomCount = parseInt(document.getElementById('swal-room-count').value);
        if (!checkIn || !checkOut) {
          Swal.showValidationMessage('กรุณาเลือกวันทั้งเข้าและออก');
          return null;
        }
        if (roomCount < 1 || roomCount > (availability[roomType] || 15)) {
          Swal.showValidationMessage(`จำนวนห้องไม่ถูกต้อง`);
          return null;
        }
        const date1 = new Date(checkIn);
        const date2 = new Date(checkOut);
        const diffTime = Math.abs(date2 - date1);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const totalPrice = nights * pricePerNight * roomCount;
        return { checkIn, checkOut, nights, roomCount, totalPrice };
      }
    });

    if (!bookingData) return;

    const { value: paymentData } = await Swal.fire({
        title: 'ชำระเงิน / Payment',
        html: `
            <div class="text-left text-sm text-gray-700 space-y-4">
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p>รายการ: <strong>${roomType} (${bookingData.roomCount} ห้อง)</strong></p>
                    <p>ระยะเวลา: <strong>${bookingData.nights} คืน</strong></p>
                    <p>ราคารวม: <strong class="text-xl text-blue-700">${bookingData.totalPrice.toLocaleString()} บาท</strong></p>
                </div>
                <div>
                    <label class="block font-bold mb-1">เลือกวิธีชำระเงิน:</label>
                    <select id="swal-payment-method" class="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="bank">🏦 โอนผ่านธนาคาร</option>
                        <option value="qrcode">📱 สแกน QR Code</option>
                    </select>
                </div>
                <div id="info-bank" class="bg-gray-100 p-3 rounded-lg border border-gray-200">
                    <p class="font-bold text-blue-800">ธนาคารกสิกรไทย (KBANK)</p>
                    <p>เลขบัญชี: <strong>123-4-56789-0</strong></p>
                    <p>ชื่อบัญชี: บจก. RCBAT Hotel</p>
                </div>
                <div id="info-qr" class="bg-gray-100 p-3 rounded-lg border border-gray-200 text-center" style="display: none;">
                    <img src="/images/qrcode.jpg" alt="QR Code" class="w-48 h-48 mx-auto bg-white p-2 rounded border cursor-pointer" />
                </div>
                <div>
                    <label class="block font-bold mb-1">แนบสลิปโอนเงิน:</label>
                    <input type="file" id="swal-payment-slip" class="w-full p-2 border border-dashed border-gray-400 rounded-lg" accept="image/*">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'ยืนยันชำระเงิน',
        cancelButtonText: 'ยกเลิก',
        didOpen: () => {
            const select = document.getElementById('swal-payment-method');
            const bankInfo = document.getElementById('info-bank');
            const qrInfo = document.getElementById('info-qr');
            select.addEventListener('change', (e) => {
                bankInfo.style.display = e.target.value === 'bank' ? 'block' : 'none';
                qrInfo.style.display = e.target.value === 'qrcode' ? 'block' : 'none';
            });
        },
        preConfirm: () => {
            const method = document.getElementById('swal-payment-method').value;
            const file = document.getElementById('swal-payment-slip').files[0];
            if (!file) Swal.showValidationMessage('กรุณาแนบสลิปการโอนเงิน');
            return { method, file };
        }
    });

    if (!paymentData) return; 

    const result = await Swal.fire({
      title: 'ยืนยันการจอง',
      html: `
        <div class="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 text-left space-y-2">
          <p><strong>ผู้เข้าพัก:</strong> ${user.name || user.username}</p>
          <p><strong>ประเภทห้อง:</strong> ${roomType}</p>
          <p><strong>จำนวน:</strong> ${bookingData.roomCount} ห้อง</p>
          <p><strong>ระยะเวลา:</strong> ${bookingData.checkIn} ถึง ${bookingData.checkOut} (${bookingData.nights} คืน)</p>
          <p class="text-lg font-bold text-blue-800 pt-2 border-t">ยอดรวม: ${bookingData.totalPrice.toLocaleString()} ฿</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✅ ยืนยัน',
      cancelButtonText: 'แก้ไข',
    });

    if (result.isConfirmed) {
      try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('room_name', roomType);
        formData.append('room_count', bookingData.roomCount);
        formData.append('price', bookingData.totalPrice);
        formData.append('check_in_date', bookingData.checkIn);
        formData.append('check_out_date', bookingData.checkOut);
        formData.append('payment_method', paymentData.method);
        formData.append('slip', paymentData.file);

        const response = await fetch(`${API_URL}/reserve`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          Swal.fire('จองสำเร็จ!', 'ข้อมูลของคุณถูกส่งเพื่อรอการตรวจสอบแล้ว', 'success');
          fetchRoomsData();
        } else {
          Swal.fire('เกิดข้อผิดพลาด', data.message || 'จองไม่สำเร็จ', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto pt-12 pb-6 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4 tracking-tight">
          ยินดีต้อนรับสู่ <span className="text-blue-600">RCBAT Hotel</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          สัมผัสประสบการณ์การพักผ่อนที่แสนสบาย ในบรรยากาศที่เป็นกันเอง พร้อมสิ่งอำนวยความสะดวกครบครัน
        </p>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 space-y-24">
        {rooms.map((room, index) => {
          // เตรียมรูปภาพสำหรับแต่ละห้อง
          const roomImages = [
            `${API_URL}/uploads/${room.image_url}`,
            room.name.includes('Double') ? "/images/IMG_5826.jpg" : "/images/8954a46a-7e0f-403d-9e30-f6d17ad26261.jpg",
            room.name.includes('Double') ? "/images/IMG_5829.jpg" : "/images/8d380d21-c2bc-44f1-9dba-9f9f52eb3004.jpg"
          ];

          return (
            <div key={room.id} className="bg-white rounded-[3rem] p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                
                {/* ✅ ส่วน Slider รูปภาพที่เลื่อนได้และคลิกดูรูปใหญ่ได้ */}
                <div className="relative mb-8 h-80 md:h-[450px] rounded-3xl overflow-hidden shadow-md group cursor-zoom-in">
                  <Swiper
                    modules={[Navigation, Pagination, Autoplay, EffectFade]}
                    effect={'fade'}
                    navigation={true}
                    pagination={{ clickable: true }}
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    className="w-full h-full mySwiper"
                    style={{ '--swiper-navigation-color': '#fff', '--swiper-pagination-color': '#fff' }}
                  >
                    {roomImages.map((imgSrc, imgIndex) => (
                      <SwiperSlide key={imgIndex} onClick={() => handleViewGallery(room, imgIndex)}>
                        <img 
                          src={imgSrc} 
                          alt={`${room.name} ${imgIndex + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { e.target.src = "/images/default-room.jpg"; }}
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 text-white font-bold opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-xl">
                                🔍 คลิกเพื่อดูรูปใหญ่
                            </div>
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs font-medium pointer-events-none">
                    เลื่อนหรือคลิกเพื่อดูรูปภาพ
                  </div>
                </div>

                <div className={`bg-gradient-to-br ${index % 2 === 0 ? 'from-blue-100/80 to-blue-200/50' : 'from-green-100/80 to-green-200/50'} backdrop-blur-lg rounded-[2.5rem] p-8 md:p-10 shadow-lg border relative overflow-hidden`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
                      <div>
                          <div className="flex items-center gap-3 mb-3">
                            <h2 className={`text-3xl md:text-4xl font-extrabold ${index % 2 === 0 ? 'text-blue-900' : 'text-green-900'}`}>{room.name}</h2>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                                availability[room.name] > 0 ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                                {availability[room.name] > 0 ? `ว่าง ${availability[room.name]} ห้อง` : "ห้องเต็ม!"}
                            </span>
                          </div>
                          <p className={`text-4xl md:text-5xl font-black flex items-baseline gap-2 ${index % 2 === 0 ? 'text-blue-600' : 'text-green-600'}`}>
                            {Number(room.price).toLocaleString()}฿ <span className="text-xl text-gray-600 font-medium">/คืน</span>
                          </p>
                      </div>
                      
                      <button 
                        onClick={() => handleReserve(room.name, room.price)}
                        disabled={availability[room.name] <= 0} 
                        className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                            availability[room.name] > 0 
                            ? (index % 2 === 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700") + " text-white hover:-translate-y-1 active:scale-95" 
                            : "bg-gray-400 text-gray-200 cursor-not-allowed"
                        }`}
                      >
                        <span>{availability[room.name] > 0 ? "จองเลย" : "ห้องเต็ม"}</span>
                      </button>
                  </div>

                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-lg relative z-10 opacity-80">
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} สิ่งอำนวยความสะดวกครบครัน</li>
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} เครื่องปรับอากาศ</li>
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} ทีวีจอแบน (Smart TV)</li>
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} ห้องน้ำส่วนตัว</li>
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} เครื่องทำน้ำอุ่น</li>
                      <li className="flex items-center">{index % 2 === 0 ? <CheckIcon /> : <CheckIconGreen />} free wi-fi</li>
                  </ul>
                </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-2xl font-bold">ขออภัย ยังไม่มีข้อมูลห้องพักในขณะนี้</p>
          </div>
        )}
      </div>

      <style>{`
        .swiper-button-next, .swiper-button-prev {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: white !important;
        }
        .swiper-button-next:after, .swiper-button-prev:after { font-size: 18px; font-weight: bold; }
        .swiper-pagination-bullet { background: white; opacity: 0.6; }
        .swiper-pagination-bullet-active { background: white; opacity: 1; width: 20px; border-radius: 4px; }
        .cursor-zoom-in { cursor: zoom-in; }
      `}</style>
    </div>
  );
};

export default HomePage;