import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// 1. นำเข้า Flatpickr และ CSS
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/material_blue.css";

const BookingHistory = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const userId = user.id || user.user_id || user.ID; 
      fetch(`https://hotel-booking-web-kfks.onrender.com/my-bookings/${userId}`)
        .then(res => res.json())
        .then(data => setBookings(data))
        .catch(err => console.error(err));
    }
  }, [user]);

  if (!user) return <div className="p-10 text-center text-red-500">กรุณาเข้าสู่ระบบเพื่อดูประวัติ</div>;

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user'); 
        navigate('/'); 
        window.location.reload(); 
      }
    });
  };

  const canModify = (checkInDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    
    const diffTime = checkIn - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 3; 
  };

  const handleCancel = async (bookingId, checkInDate) => {
    if (!canModify(checkInDate)) {
        Swal.fire('ไม่สามารถยกเลิกได้', 'ต้องแจ้งยกเลิกการจองล่วงหน้าอย่างน้อย 3 วัน', 'error');
        return;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก?',
      text: "คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', 
      cancelButtonColor: '#3085d6', 
      confirmButtonText: 'ใช่, ยกเลิกเลย',
      cancelButtonText: 'ไม่'
    });

    if (result.isConfirmed) {
      fetch('https://hotel-booking-web-kfks.onrender.com/cancel-booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Swal.fire('เรียบร้อย!', data.message || 'ยกเลิกการจองสำเร็จ', 'success');
          setBookings(prevBookings => 
            prevBookings.map(item => 
              item.id === bookingId ? { ...item, status: 'cancelled' } : item
            )
          ); 
        } else {
          Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
        }
      })
      .catch(err => {
          Swal.fire('Error', 'เชื่อมต่อระบบไม่ได้', 'error');
          console.error(err);
      });
    }
  };

  //  ฟังก์ชันสำหรับการเลื่อนวัน (Reschedule)
  const handleReschedule = async (bookingId, roomName, oldCheckIn, oldCheckOut, currentPrice) => {
    //  ตรวจสอบเงื่อนไข 3 วัน
    if (!canModify(oldCheckIn)) {
        Swal.fire('ไม่สามารถเลื่อนวันได้', 'ต้องแจ้งเลื่อนวันล่วงหน้าอย่างน้อย 3 วัน', 'error');
        return;
    }

    // 1. ดึงข้อมูล "วันที่ไม่ว่าง" ของห้องนี้มาก่อน
    let occupiedDates = [];
    try {
        // ใช้ encodeURIComponent เพื่อป้องกันกรณีชื่อห้องมีวรรค
        const response = await fetch(`https://hotel-booking-web-kfks.onrender.com/bookings/occupied?room_name=${encodeURIComponent(roomName)}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            occupiedDates = data.map(booking => ({
                from: booking.check_in_date,
                to: booking.check_out_date
            }));
        }
    } catch (err) {
        console.error("Error fetching occupied dates:", err);
    }

    // คำนวณราคาต่อคืน
    const oneDay = 24 * 60 * 60 * 1000;
    const start = new Date(oldCheckIn);
    const end = new Date(oldCheckOut || oldCheckIn);
    let oldDays = Math.round(Math.abs((end - start) / oneDay));
    if (oldDays === 0) oldDays = 1; // ป้องกันการหารด้วย 0
    const pricePerNight = currentPrice / oldDays;

    // 2. แสดง Popup พร้อม Flatpickr
    const { value: formValues } = await Swal.fire({
      title: 'ขอเลื่อนวันเข้าพัก',
      html: `
        <div style="text-align: left; margin-top: 10px;">
            <div style="margin-bottom: 10px; font-size: 14px; color: #666;">
               ราคาเดิม: <b>${Number(currentPrice).toLocaleString()}</b> บาท (${oldDays} คืน) <br/>
               เฉลี่ยคืนละ: <b>${Number(pricePerNight).toLocaleString()}</b> บาท
            </div>
            <hr style="margin: 10px 0;">
            
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">📅 วันที่เช็คอินใหม่:</label>
                <input type="text" id="swal-new-checkin" class="swal2-input" placeholder="เลือกวันเช็คอินใหม่" style="margin: 0; width: 100%;">
            </div>

            <div>
                <label style="display:block; margin-bottom:5px; font-weight:bold;">📅 วันที่เช็คเอาท์ใหม่:</label>
                <input type="text" id="swal-new-checkout" class="swal2-input" placeholder="เลือกวันเช็คเอาท์ใหม่" style="margin: 0; width: 100%;" disabled>
            </div>
            <div style="font-size: 12px; color: red; margin-top: 5px;">* วันที่เป็นสีเทาคือมีผู้จองแล้ว</div>
            <div style="font-size: 12px; color: orange; margin-top: 2px;">* ต้องรอแอดมินอนุมัติก่อน</div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'คำนวณและส่งคำขอ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ffc107',
      
      //  เริ่มต้น Flatpickr เมื่อเปิด Popup
      didOpen: () => {
        const checkInInput = document.getElementById('swal-new-checkin');
        const checkOutInput = document.getElementById('swal-new-checkout');

        const fpCheckIn = flatpickr(checkInInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: occupiedDates, //  บล็อกวันที่ไม่ว่าง
            onChange: (selectedDates) => {
                // เมื่อเลือกวันเช็คอินแล้ว ให้เปิดช่องเช็คเอาท์ และตั้ง minDate
                if (selectedDates.length > 0) {
                    checkOutInput.disabled = false;
                    const nextDay = new Date(selectedDates[0]);
                    nextDay.setDate(nextDay.getDate() + 1);
                    fpCheckOut.set('minDate', nextDay);
                    checkOutInput.focus();
                }
            }
        });

        const fpCheckOut = flatpickr(checkOutInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: occupiedDates, //  บล็อกวันที่ไม่ว่าง
        });
      },

      preConfirm: () => {
        const newCheckIn = document.getElementById('swal-new-checkin').value;
        const newCheckOut = document.getElementById('swal-new-checkout').value;

        if (!newCheckIn || !newCheckOut) {
          Swal.showValidationMessage('กรุณาเลือกวันให้ครบทั้งสองช่อง');
          return null;
        }
        if (newCheckIn >= newCheckOut) {
          Swal.showValidationMessage('วันเช็คเอาท์ ต้องอยู่หลังวันเช็คอิน');
          return null;
        }

        // คำนวณราคาใหม่
        const diffTime = Math.abs(new Date(newCheckOut) - new Date(newCheckIn));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const newTotalPrice = diffDays * pricePerNight;

        return { newCheckIn, newCheckOut, newTotalPrice, diffDays };
      }
    });

    if (formValues) {
      // 3. แสดงยืนยันอีกครั้งหากราคาเปลี่ยน
      const confirmResult = await Swal.fire({
          title: 'ยืนยันการส่งคำขอ?',
          html: `
            คุณเลือกพัก <b>${formValues.diffDays} คืน</b><br/>
            ราคาใหม่: <b style="color:blue; font-size:1.2em;">${Number(formValues.newTotalPrice).toLocaleString()} บาท</b> <br/><br/>
            <span style="color:red; font-size:0.9em;">*คำขอนี้จะต้องรอการอนุมัติจากแอดมิน*</span>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ส่งคำขอ',
          cancelButtonText: 'แก้ไข'
      });

      if (confirmResult.isConfirmed) {
          fetch('https://hotel-booking-web-kfks.onrender.com/request-reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                booking_id: bookingId, 
                new_check_in: formValues.newCheckIn,
                new_check_out: formValues.newCheckOut,
                new_price: formValues.newTotalPrice 
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              Swal.fire('ส่งคำขอแล้ว!', 'กรุณารอเจ้าหน้าที่ตรวจสอบและอนุมัติ', 'success');
              
              // อัปเดต State ให้เป็นสถานะรออนุมัติเลื่อนวัน
              setBookings(bookings.map(b => 
                b.id === bookingId ? { 
                    ...b, 
                    status: 'pending_reschedule' 
                } : b
              ));
            } else {
              Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
            }
          })
          .catch(err => console.error(err));
      } else {
        // ถ้ากด Cancel ในหน้ายืนยันราคา ให้เรียกฟังก์ชันเดิมซ้ำเพื่อให้เลือกใหม่
        handleReschedule(bookingId, roomName, oldCheckIn, oldCheckOut, currentPrice);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-900">📅 ประวัติการจองของฉัน</h2>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow"
        >
          ออกจากระบบ
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">
          ยังไม่มีการจองห้องพัก
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl shadow-md flex justify-between items-center border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
              
              {/* ส่วนแสดงข้อมูลห้องพัก (ซ้าย) */}
              <div>
                <h3 className="text-xl font-bold text-gray-800">{item.room_name}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <p>
                        <span className="font-bold text-blue-600">เข้าพัก:</span>{' '} 
                        {new Date(item.check_in_date || item.booking_date).toLocaleDateString('th-TH')}
                    </p>
                    {item.check_out_date && (
                        <p>
                            <span className="font-bold text-red-500">ออก:</span>{' '}
                            {new Date(item.check_out_date).toLocaleDateString('th-TH')}
                        </p>
                    )}
                </div>
                
                {/* สถานะการจอง */}
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-fit
                  ${item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-100 text-green-700' : 
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    item.status === 'pending_reschedule' ? 'bg-orange-100 text-orange-800' : 
                    item.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-600'}`}>
                  
                  {item.status === 'approved' || item.status === 'upcoming' ? '✅ จองสำเร็จ' : 
                   item.status === 'pending' ? '⏳ รอตรวจสอบ' : 
                   item.status === 'pending_reschedule' ? '📅 รออนุมัติเลื่อนวัน' : 
                   item.status === 'rejected' ? '❌ ไม่ผ่าน' : 
                   '🚫 ยกเลิกแล้ว'}
                </span>
                
                {item.status === 'pending' && <p className="text-xs text-yellow-600 mt-1">กำลังตรวจสอบหลักฐาน...</p>}
                {item.status === 'rejected' && <p className="text-xs text-red-600 mt-1">โปรดติดต่อเจ้าหน้าที่</p>}
                {item.status === 'pending_reschedule' && <p className="text-xs text-orange-600 mt-1">แอดมินกำลังตรวจสอบวันที่คุณขอใหม่</p>}
              </div>

              {/* ส่วนแสดงราคาและปุ่ม (ขวา) - จัด Group รวมกันเพื่อให้ Layout ไม่แตก */}
              <div className="flex flex-col items-end gap-2">
                  <p className="text-2xl font-bold text-blue-600">
                      {Number(item.price).toLocaleString()} ฿
                  </p>
              
                  <div className="flex gap-2 justify-end mt-1">
                    {/*  ซ่อนปุ่มถ้าสถานะเป็น pending_reschedule */}
                    {(item.status === 'upcoming' || item.status === 'approved' || item.status === 'pending') && item.status !== 'pending_reschedule' && (
                      <>
                        <button 
                          onClick={() => navigate('/receipt', { state: { booking: item } })}
                          className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-200"
                        >
                          🧾 ใบเสร็จ
                        </button>

                        <button 
                          //  ส่ง item.room_name เข้าไปในฟังก์ชัน
                          onClick={() => handleReschedule(item.id, item.room_name, (item.check_in_date || item.booking_date), item.check_out_date, item.price)}
                          className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-yellow-200"
                        >
                          📅 เลื่อนวัน
                        </button>

                        <button 
                          onClick={() => handleCancel(item.id, (item.check_in_date || item.booking_date))}
                          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200"
                        >
                          ยกเลิก
                        </button>
                      </>
                    )}
                  </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;