// client/src/pages/client/HomePage.jsx

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/material_blue.css";

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

  const [availability, setAvailability] = useState({
    "Double Room": 15, 
    "Single Room": 15  
  });

  // Fetch ห้องว่าง
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const resDouble = await fetch(`https://hotel-booking-web-kfks.onrender.com/room-availability?room_name=Double Room`);
        const dataDouble = await resDouble.json();
        
        const resSingle = await fetch(`https://hotel-booking-web-kfks.onrender.com/room-availability?room_name=Single Room`);
        const dataSingle = await resSingle.json();

        setAvailability({
          "Double Room": dataDouble.available, 
          "Single Room": dataSingle.available
        });
      } catch (error) {
        console.error("Error fetching availability:", error);
      }
    };

    fetchAvailability();
    const interval = setInterval(fetchAvailability, 10000);
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

  const handleReserve = async (roomType, pricePerNight) => {
    // --- 1. เช็กล็อกอิน ---
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

    // --- 2. ดึงวันที่เต็ม ---
    let fullDates = [];
    try {
        const response = await fetch(`https://hotel-booking-web-kfks.onrender.com/bookings/occupied?room_name=${roomType}`);
        const bookings = await response.json();
        
        if (Array.isArray(bookings)) {
            const MAX_ROOMS = 15;
            const dailyCounts = {};

            bookings.forEach(booking => {
                const range = getDatesInRange(booking.check_in_date, booking.check_out_date);
                range.forEach(dateStr => {
                    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
                });
            });

            fullDates = Object.keys(dailyCounts).filter(date => dailyCounts[date] >= MAX_ROOMS);
        }
    } catch (err) {
        console.error("Error fetching occupied dates:", err);
    }

    // --- 3. Popup เลือกวัน ---
    const { value: bookingData } = await Swal.fire({
      title: `จองห้องพัก: ${roomType} 📅`,
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
            <div class="text-xs text-red-500 mt-1">* วันที่เป็นสีเทา คือห้องเต็ม</div>
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

        if (!checkIn || !checkOut) {
          Swal.showValidationMessage('กรุณาเลือกวันทั้งเข้าและออก');
          return null;
        }

        const date1 = new Date(checkIn);
        const date2 = new Date(checkOut);
        const diffTime = Math.abs(date2 - date1);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const totalPrice = nights * pricePerNight;

        return { checkIn, checkOut, nights, totalPrice };
      }
    });

    if (!bookingData) return;

    // --- 4. Popup ชำระเงิน (พร้อม QR Code) ---
    const { value: paymentData } = await Swal.fire({
        title: 'ชำระเงิน / Payment',
        html: `
            <div class="text-left text-sm text-gray-700 space-y-4">
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p>เข้าพัก: <strong>${bookingData.nights} คืน</strong> (${bookingData.checkIn} ถึง ${bookingData.checkOut})</p>
                    <p>ราคารวม: <strong class="text-xl text-blue-700">${bookingData.totalPrice.toLocaleString()} บาท</strong></p>
                </div>

                <div>
                    <label class="block font-bold mb-1">เลือกวิธีชำระเงิน:</label>
                    <select id="swal-payment-method" class="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="bank">🏦 โอนผ่านธนาคาร (Bank Transfer)</option>
                        <option value="qrcode">📱 สแกน QR Code</option>
                    </select>
                </div>
                
                <div id="info-bank" class="bg-gray-100 p-3 rounded-lg border border-gray-200">
                    <p class="font-bold text-blue-800">ธนาคารกสิกรไทย (KBANK)</p>
                    <p>เลขบัญชี: <strong>123-4-56789-0</strong></p>
                    <p>ชื่อบัญชี: บจก. RCBAT Hotel</p>
                </div>

                <div id="info-qr" class="bg-gray-100 p-3 rounded-lg border border-gray-200 text-center" style="display: none;">
                    <p class="font-bold text-blue-800 mb-2">สแกนเพื่อชำระเงิน</p>
                    <img src="/images/qrcode.jpg" alt="Payment QR Code" class="w-48 h-48 mx-auto object-contain bg-white p-2 rounded border" />
                    <p class="text-xs text-gray-500 mt-1">RCBAT Hotel PromptPay</p>
                </div>

                <div>
                    <label class="block font-bold mb-1">แนบสลิปโอนเงิน (Slip):</label>
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
                if (e.target.value === 'qrcode') {
                    bankInfo.style.display = 'none';
                    qrInfo.style.display = 'block';
                } else {
                    bankInfo.style.display = 'block';
                    qrInfo.style.display = 'none';
                }
            });
        },

        preConfirm: () => {
            const method = document.getElementById('swal-payment-method').value;
            const file = document.getElementById('swal-payment-slip').files[0];
            
            if (!file) {
                Swal.showValidationMessage('กรุณาแนบสลิปการโอนเงิน');
            }
            return { method, file };
        }
    });

    if (!paymentData) return; 

    // --- 5. ยืนยันข้อมูล (แก้ไขให้แสดงชื่อก่อนอีเมล) ---
    const result = await Swal.fire({
      title: '<h3 class="text-xl font-bold text-blue-700">ยืนยันรายละเอียด</h3>',
      html: `
        <div class="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 space-y-2 text-left">
          <div class="flex justify-between border-b pb-2">
            <span class="font-bold">ผู้เข้าพัก:</span>
            <span class="text-blue-900 font-medium">${user.name || user.firstname || user.username || user.email}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold">ประเภทห้อง:</span>
            <span class="text-blue-600 font-bold">${roomType}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold">เช็คอิน:</span>
            <span>${bookingData.checkIn}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold">เช็คเอาท์:</span>
            <span>${bookingData.checkOut}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-bold">ระยะเวลา:</span>
            <span>${bookingData.nights} คืน</span>
          </div>
          <div class="flex justify-between pt-2 border-t mt-2 text-lg font-bold text-blue-800">
            <span class="font-bold">ยอดสุทธิ:</span>
            <span>${bookingData.totalPrice.toLocaleString()} ฿</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✅ ยืนยันการจอง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('room_name', roomType);
        formData.append('price', bookingData.totalPrice);
        formData.append('check_in_date', bookingData.checkIn);
        formData.append('check_out_date', bookingData.checkOut);
        formData.append('payment_method', paymentData.method);
        formData.append('slip', paymentData.file);

        const response = await fetch('https://hotel-booking-web-kfks.onrender.com/reserve', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire('จองสำเร็จ!', 'ขอบคุณที่ใช้บริการครับ', 'success');
        } else {
          Swal.fire('เกิดข้อผิดพลาด', data.message || 'จองไม่สำเร็จ', 'error');
        }
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'เชื่อมต่อ Server ไม่ได้', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto pt-12 pb-6 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4 tracking-tight">
          ยินดีต้อนรับสู่ <span className="text-blue-600">RCBAT Hotel</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          สัมผัสประสบการณ์การพักผ่อนที่แสนสบาย ในบรรยากาศที่เป็นกันเอง พร้อมสิ่งอำนวยความสะดวกครบครัน
        </p>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* ================= ห้องที่ 1: Double Room ================= */}
        <div className="mb-24 bg-white rounded-[3rem] p-6 shadow-xl shadow-blue-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="grid grid-cols-3 gap-4 mb-8 h-[450px] md:h-[500px]">
              <div className="col-span-2 h-full rounded-3xl overflow-hidden shadow-md border-4 border-white">
                <img src="images/IMG_5827.jpg" alt="Double Room Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="grid grid-rows-2 gap-4 h-full">
                  <div className="rounded-3xl overflow-hidden shadow-md border-4 border-white">
                      <img src="images/IMG_5826.jpg" alt="Double Room Bathroom" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="rounded-3xl overflow-hidden shadow-md border-4 border-white">
                      <img src="images/IMG_5829.jpg" alt="Double Room Detail" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-100/80 to-blue-200/50 backdrop-blur-lg rounded-[2.5rem] p-8 md:p-10 shadow-lg border border-blue-200/60 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
                  <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900 tracking-tight">Double Room (เตียงคู่)</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                            availability["Double Room"] > 0 ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                        }`}>
                            {availability["Double Room"] > 0 ? `ว่าง ${availability["Double Room"]} ห้อง` : "ห้องเต็ม!"}
                        </span>
                      </div>
                      
                      <p className="text-4xl md:text-5xl font-black text-blue-600 flex items-baseline gap-2">
                        500฿ <span className="text-xl text-gray-600 font-medium">/คืน</span>
                      </p>
                  </div>
                  
                  <button 
                    onClick={() => handleReserve('Double Room', 500)}
                    disabled={availability["Double Room"] <= 0} 
                    className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                        availability["Double Room"] > 0 
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/30 hover:-translate-y-1 active:scale-95" 
                        : "bg-gray-400 text-gray-200 cursor-not-allowed"
                    }`}
                  >
                    <span>{availability["Double Room"] > 0 ? "จองเลย" : "ห้องเต็ม"}</span>
                    {availability["Double Room"] > 0 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                  </button>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-lg text-blue-900/80 relative z-10">
                  <li className="flex items-center"><CheckIcon /> ประเภทห้อง : เตียงคู่ (double bed)</li>
                  <li className="flex items-center"><CheckIcon /> จำนวนผู้เข้าพัก : 1-2 คน</li>
                  <li className="flex items-center"><CheckIcon /> เครื่องปรับอากาศ</li>
                  <li className="flex items-center"><CheckIcon /> ทีวีจอแบน (Smart TV)</li>
                  <li className="flex items-center"><CheckIcon /> โต๊ะทำงาน</li>
                  <li className="flex items-center"><CheckIcon /> ตู้เสื้อผ้า</li>
                  <li className="flex items-center"><CheckIcon /> ห้องน้ำส่วนตัว</li>
              </ul>
            </div>
        </div>

        <hr className="border-t border-blue-200 my-200 w-3/4 mx-auto opacity-50" />

        {/* ================= ห้องที่ 2: Single Room ================= */}
        <div className="mb-24 bg-white rounded-[3rem] p-6 shadow-xl shadow-green-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="grid grid-cols-3 gap-4 mb-8 h-[450px] md:h-[500px]">
              <div className="col-span-2 h-full rounded-3xl overflow-hidden shadow-md border-4 border-white">
                <img src="images/8a011ebd-aecf-4d85-b0dd-0f761e983e46.jpg" alt="Single Room Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="grid grid-rows-2 gap-4 h-full">
                  <div className="rounded-3xl overflow-hidden shadow-md border-4 border-white">
                      <img src="images/8954a46a-7e0f-403d-9e30-f6d17ad26261.jpg" alt="Single Room Bath" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="rounded-5x4 overflow-hidden shadow-md border-4 border-white">
                      <img src="images/8d380d21-c2bc-44f1-9dba-9f9f52eb3004.jpg" alt="Single Room Detail" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
              </div>
            </div>

            <div className="mt-20 bg-gradient-to-br from-green-50/80 to-green-100/50 backdrop-blur-lg rounded-[2.5rem] p-8 md:p-10 shadow-lg border border-green-200/60 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-300/30 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
                  <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-green-900 tracking-tight">Single Room (เตียงเดี่ยว)</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
                            availability["Single Room"] > 0 ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                        }`}>
                            {availability["Single Room"] > 0 ? `ว่าง ${availability["Single Room"]} ห้อง` : "ห้องเต็ม!"}
                        </span>
                      </div>
                      
                      <p className="text-4xl md:text-5xl font-black text-green-600 flex items-baseline gap-2">
                        450฿ <span className="text-xl text-gray-600 font-medium">/คืน</span>
                      </p>
                  </div>
                  
                  <button 
                    onClick={() => handleReserve('Single Room', 450)}
                    disabled={availability["Single Room"] <= 0}
                    className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                        availability["Single Room"] > 0 
                        ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-green-500/30 hover:-translate-y-1 active:scale-95" 
                        : "bg-gray-400 text-gray-200 cursor-not-allowed"
                    }`}
                  >
                    <span>{availability["Single Room"] > 0 ? "จองเลย" : "ห้องเต็ม"}</span>
                    {availability["Single Room"] > 0 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    )}
                  </button>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-lg text-green-900/80 relative z-10">
                  <li className="flex items-center"><CheckIconGreen /> ประเภทห้อง : เตียงเดี่ยว (Single bed)</li>
                  <li className="flex items-center"><CheckIconGreen /> จำนวนผู้เข้าพัก : 1-2 คน</li>
                  <li className="flex items-center"><CheckIconGreen /> เครื่องปรับอากาศ</li>
                  <li className="flex items-center"><CheckIconGreen /> ทีวีจอแบน (Smart TV)</li>
                  <li className="flex items-center"><CheckIconGreen /> โต๊ะทำงาน</li>
                  <li className="flex items-center"><CheckIconGreen /> ตู้เสื้อผ้า</li>
                  <li className="flex items-center"><CheckIconGreen /> ห้องน้ำส่วนตัว</li>
              </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;