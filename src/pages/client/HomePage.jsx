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

// ฟังก์ชันช่วย: แปลง Date Object หรือ String ให้เป็น "YYYY-MM-DD" เพื่อการเปรียบเทียบที่แม่นยำ
const formatDateStr = (dateInput) => {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    // ใช้ toISOString แล้วตัดเอาแค่ข้างหน้า เพื่อไม่ให้ Timezone ทำวันเพี้ยน
    // หรือถ้ากังวลเรื่อง Timezone Local ให้ใช้แบบนี้:
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ฟังก์ชันช่วย: แตกช่วงวันที่เป็น Array ของ YYYY-MM-DD
const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate < lastDate) {
        dates.push(formatDateStr(currentDate));
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
      // ตั้งค่าเริ่มต้น (แสดงไว้ก่อนโหลดเสร็จ)
      data.forEach(room => {
        initialAvailability[room.name] = 15; 
      });

      // ดึงข้อมูล availability ของวันนี้ (สำหรับแสดงหน้าการ์ด)
      for (const room of data) {
          try {
            const resAvail = await fetch(`${API_URL}/room-availability?room_name=${encodeURIComponent(room.name)}`);
            const dataAvail = await resAvail.json();
            initialAvailability[room.name] = dataAvail.available;
          } catch (e) {
            console.error("Failed to load availability for", room.name);
          }
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
        
        // ✅ 1. เพิ่มบรรทัดนี้: เพื่อสลับปุ่ม ให้ย้อนกลับอยู่ซ้าย และถัดไปอยู่ขวา
        reverseButtons: true, 
        
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

  // ✅ ฟังก์ชันจองที่แก้ไขเรื่อง Date Format แล้ว
  const handleReserve = async (roomType, pricePerNight) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเข้าสู่ระบบ',
        text: 'คุณต้องล็อกอินหรือสมัครสมาชิกก่อนทำการจองห้องพัก',
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ระบบ',
        cancelButtonText: 'ยกเลิก',
        customClass: {
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all',
          cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all'
        },
      }).then((result) => {
        if (result.isConfirmed) navigate('/login');
      });
      return;
    }

    const userId = user.id || user.user_id || user.ID;
    const MAX_ROOMS_TOTAL = 15; 

    // 1. ดึงข้อมูลการจองทั้งหมด
    let occupiedBookings = [];
    try {
        const response = await fetch(`${API_URL}/bookings/occupied?room_name=${encodeURIComponent(roomType)}`);
        const rawBookings = await response.json();
        
        // 🚨 ส่วนสำคัญ: แปลงวันที่จาก Server ให้เป็น YYYY-MM-DD ให้หมดก่อนนำไปใช้
        if (Array.isArray(rawBookings)) {
            occupiedBookings = rawBookings.map(b => ({
                ...b,
                check_in_date: formatDateStr(b.check_in_date),
                check_out_date: formatDateStr(b.check_out_date),
                room_count: b.room_count || 1 // ถ้าไม่มี room_count ให้นับเป็น 1
            }));
            
            // Debug ดูข้อมูลว่ามาไหม (กด F12 ดูใน Console)
            console.log("Bookings fetched:", occupiedBookings);
        }
    } catch (err) {
        console.error("Error fetching bookings:", err);
    }

    // 2. สร้าง Map นับจำนวนห้องที่ถูกจองในแต่ละวันรอไว้เลย
    const dailyBookedMap = {}; // { "2023-10-16": 2, "2023-10-17": 5 }
    
    occupiedBookings.forEach(booking => {
        // แตกช่วงวันที่ของการจองนั้นๆ ออกมาเป็นรายวัน
        const range = getDatesInRange(booking.check_in_date, booking.check_out_date);
        range.forEach(dateStr => {
            dailyBookedMap[dateStr] = (dailyBookedMap[dateStr] || 0) + booking.room_count;
        });
    });

    console.log("Daily Booked Map:", dailyBookedMap);

    const { value: bookingData } = await Swal.fire({
      title: `จองห้องพัก: ${roomType} `,
      html: `
        <div class="flex flex-col gap-4 text-left">
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">วันที่เช็คอิน</label>
                <input type="text" id="swal-checkin" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" placeholder="เลือกวันเช็คอิน...">
            </div>
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">วันที่เช็คเอาท์</label>
                <input type="text" id="swal-checkout" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" placeholder="เลือกวันเช็คเอาท์..." disabled>
            </div>
            
            <div id="room-selection-container" style="display: none;" class="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm animate-fade-in">
                <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-bold text-gray-800">จำนวนห้องที่ต้องการ</label>
                    <span id="availability-badge" class="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                        กำลังตรวจสอบ...
                    </span>
                </div>
                <select id="swal-room-count" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-lg text-gray-700">
                </select>
                <p id="availability-text" class="text-xs text-gray-500 mt-2 text-right"></p>
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ถัดไป',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all',
        cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all'
      },
      didOpen: () => {
        const checkInInput = document.getElementById('swal-checkin');
        const checkOutInput = document.getElementById('swal-checkout');
        const roomContainer = document.getElementById('room-selection-container');
        const roomSelect = document.getElementById('swal-room-count');
        const badge = document.getElementById('availability-badge');
        const availText = document.getElementById('availability-text');

        const calculateRealtimeAvailability = () => {
            const cin = checkInInput.value;
            const cout = checkOutInput.value;

            if (cin && cout) {
                // สร้าง array วันที่ที่ลูกค้าเลือกจอง (เช่น เลือก 16-18 ก็จะได้ [16, 17])
                const userSelectedRange = getDatesInRange(cin, cout);
                
                // สมมติว่าตอนแรกว่างเต็ม 15 ห้อง
                let minRoomsAvailable = MAX_ROOMS_TOTAL;

                // วนลูปเช็ค "ทุกวัน" ที่ลูกค้าเลือก เพื่อหาว่าวันไหน "เหลือห้องน้อยที่สุด" (Bottleneck)
                userSelectedRange.forEach(dateStr => {
                    // ดูว่าวันนั้นๆ มีคนจองไปแล้วกี่ห้อง (จาก Map ที่ทำไว้)
                    const bookedCount = dailyBookedMap[dateStr] || 0; 
                    const availableOnDate = MAX_ROOMS_TOTAL - bookedCount;
                    
                    // อัปเดตค่าต่ำสุด
                    if (availableOnDate < minRoomsAvailable) {
                        minRoomsAvailable = availableOnDate;
                    }
                });

                // จำนวนที่เปิดให้จองได้จริง
                const finalAvailable = Math.max(0, minRoomsAvailable);

                // อัปเดตหน้าจอ
                if (finalAvailable > 0) {
                    badge.className = "bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full";
                    badge.innerHTML = `ว่าง ${finalAvailable} ห้อง`;
                    availText.innerHTML = `วันที่เลือกมีห้องว่างเหลือ ${finalAvailable} ห้อง จากทั้งหมด ${MAX_ROOMS_TOTAL} ห้อง`;
                    
                    // สร้าง Options 1 ถึง finalAvailable
                    roomSelect.innerHTML = Array.from({ length: finalAvailable }, (_, i) => 
                        `<option value="${i + 1}">${i + 1} ห้อง</option>`).join('');
                    roomSelect.disabled = false;
                } else {
                    badge.className = "bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full";
                    badge.innerHTML = `เต็มแล้ว`;
                    availText.innerHTML = `ขออภัย ห้องพักเต็มในช่วงวันที่เลือก`;
                    
                    roomSelect.innerHTML = `<option value="">ไม่มีห้องว่าง</option>`;
                    roomSelect.disabled = true;
                }
                roomContainer.style.display = 'block';
            } else {
                roomContainer.style.display = 'none';
            }
        };

        flatpickr(checkInInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            onChange: (selectedDates) => {
                checkOutInput.disabled = false;
                if (checkOutInput._flatpickr) {
                     checkOutInput._flatpickr.set('minDate', new Date(selectedDates[0].getTime() + 86400000));
                }
                calculateRealtimeAvailability();
            }
        });
        flatpickr(checkOutInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            onChange: calculateRealtimeAvailability
        });
      },
      preConfirm: () => {
        const checkIn = document.getElementById('swal-checkin').value;
        const checkOut = document.getElementById('swal-checkout').value;
        const roomCount = parseInt(document.getElementById('swal-room-count').value);
        
        if (!checkIn || !checkOut) return Swal.showValidationMessage('กรุณาเลือกวันที่เข้าพัก');
        if (!roomCount || isNaN(roomCount)) return Swal.showValidationMessage('กรุณาเลือกจำนวนห้อง');
        
        const nights = Math.ceil(Math.abs(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)); 
        const totalPrice = nights * pricePerNight * roomCount;
        return { checkIn, checkOut, nights, roomCount, totalPrice };
      }
    });

    if (!bookingData) return;

    // --- ส่วนการชำระเงิน ---
    const { value: paymentData } = await Swal.fire({
        title: 'ชำระเงิน / Payment',
        html: `
            <div class="text-left text-sm text-gray-700 space-y-4">
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p>รายการ: <strong>${roomType} (${bookingData.roomCount} ห้อง)</strong></p>
                    <p>ระยะเวลา: <strong>${bookingData.nights} คืน</strong> (${bookingData.checkIn} ถึง ${bookingData.checkOut})</p>
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
        customClass: {
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all',
          cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all'
        },
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

    // --- ยืนยันการจอง ---
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
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'แก้ไข',
      customClass: {
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all',
        cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all'
      },
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
          const roomImages = [
            `${API_URL}/uploads/${room.image_url}`,
            room.name.includes('Double') ? "/images/IMG_5826.jpg" : "/images/8954a46a-7e0f-403d-9e30-f6d17ad26261.jpg",
            room.name.includes('Double') ? "/images/IMG_5829.jpg" : "/images/8d380d21-c2bc-44f1-9dba-9f9f52eb3004.jpg"
          ];

          return (
            <div key={room.id} className="bg-white rounded-[3rem] p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
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
        /* ✅ 2. เพิ่ม CSS นี้เพื่อบังคับตำแหน่งลูกศรให้ถูกต้อง */
        .swiper-button-prev {
          left: 10px !important;
          right: auto !important;
        }
        .swiper-button-next {
          right: 10px !important;
          left: auto !important;
        }

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
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default HomePage;