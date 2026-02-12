// client/src/pages/client/BookingHistory.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import API_URL from "/src/config";
import { Search, X, Calendar, FileText } from 'lucide-react'; 

// 1. นำเข้า Flatpickr และ CSS
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/material_blue.css";

const BookingHistory = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const userId = user.id || user.user_id || user.ID; 
      fetch(`${API_URL}/my-bookings/${userId}`)
        .then(res => res.json())
        .then(data => {
            // ป้องกัน Error ถ้า data ไม่ใช่ Array
            if (Array.isArray(data)) {
                setBookings(data);
            } else {
                setBookings([]);
                console.error("Data received is not an array:", data);
            }
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  if (!user) return <div className="p-10 text-center text-red-500">กรุณาเข้าสู่ระบบเพื่อดูประวัติ</div>;

  const canModify = (checkInDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const diffTime = checkIn - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 1; 
  };

  // ✅ ฟังก์ชันขอเลื่อนวัน
  const handleReschedule = async (bookingId, roomName, oldCheckIn, oldCheckOut, price, rescheduleCount) => {
    const start = new Date(oldCheckIn);
    const end = new Date(oldCheckOut);
    const diffTime = Math.abs(end - start);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    let selectedNewCheckIn = null;
    let calculatedNewCheckOut = null;

    const { value: formValues } = await Swal.fire({
      title: '📅 ขอเลื่อนวันเข้าพัก',
      html: `
        <div style="text-align: left; font-size: 14px; margin-bottom: 10px;">
          <p><b>ห้อง:</b> ${roomName}</p>
          <p><b>จำนวนคืนที่จองไว้:</b> <span style="color:blue; font-weight:bold;">${nights} คืน</span> (คงเดิม)</p>
          <hr style="margin: 10px 0;">
          <label style="display:block; margin-bottom:5px;">เลือกวันเช็คอินใหม่:</label>
          <input id="new-check-in" class="swal2-input" placeholder="เลือกวันเช็คอิน..." style="margin: 0 0 10px 0; width: 100%;">
          
          <div id="checkout-preview" style="background: #f3f4f6; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
             <span style="color:gray;">วันเช็คเอาท์จะเป็น:</span> <br>
             <b id="checkout-date-text" style="font-size: 16px; color: #333;">-</b>
          </div>

          <label style="display:block; margin-bottom:5px;">เหตุผลที่ขอเลื่อน:</label>
          <textarea id="reschedule-reason" class="swal2-textarea" placeholder="เช่น ติดธุระด่วน, ป่วย..." style="margin: 0; width: 100%;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ส่งคำขอ',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => {
        flatpickr("#new-check-in", {
          minDate: "today",
          dateFormat: "Y-m-d",
          disableMobile: "true",
          onChange: (selectedDates) => {
            if (selectedDates.length > 0) {
              const checkInDate = selectedDates[0];
              const checkOutDate = new Date(checkInDate);
              checkOutDate.setDate(checkOutDate.getDate() + nights);

              selectedNewCheckIn = checkInDate;
              calculatedNewCheckOut = checkOutDate;

              document.getElementById('checkout-date-text').innerText = 
                `${checkOutDate.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
              document.getElementById('checkout-date-text').style.color = "#2563EB"; 
            }
          }
        });
      },
      preConfirm: () => {
        const reason = document.getElementById('reschedule-reason').value;
        if (!selectedNewCheckIn || !calculatedNewCheckOut) {
          Swal.showValidationMessage('กรุณาเลือกวันเช็คอินใหม่');
          return false;
        }
        if (!reason) {
          Swal.showValidationMessage('กรุณาระบุเหตุผล');
          return false;
        }
        
        const formatDate = (date) => {
            const d = new Date(date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().split('T')[0];
        };

        return {
          new_check_in: formatDate(selectedNewCheckIn),
          new_check_out: formatDate(calculatedNewCheckOut),
          reason: reason
        };
      }
    });

    if (formValues) {
      try {
        const response = await fetch(`${API_URL}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: bookingId,
            new_check_in: formValues.new_check_in,
            new_check_out: formValues.new_check_out,
            reason: formValues.reason
          })
        });

        const data = await response.json();
        if (data.success) {
          Swal.fire('สำเร็จ', 'ส่งคำขอเลื่อนวันเรียบร้อยแล้ว รอแอดมินอนุมัติ', 'success');
          if (user) {
             const userId = user.id || user.user_id || user.ID;
             fetch(`${API_URL}/my-bookings/${userId}`)
              .then(res => res.json())
              .then(data => setBookings(data));
          }
        } else {
          Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
      }
    }
  };

  // ✅ ฟังก์ชันขอยกเลิกการจอง (อัปเดตใหม่: รับข้อมูลบัญชีและ QR Code)
  const handleCancel = async (bookingId, checkInDate) => {
    if (!canModify(checkInDate)) {
      Swal.fire('ไม่สามารถยกเลิกได้', 'ต้องยกเลิกจองล่วงหน้าอย่างน้อย 24 ชั่วโมง', 'error');
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'แจ้งขอยกเลิกการจอง',
      width: '600px',
      html: `
        <div class="text-left space-y-4">
            <div class="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-800">
                <p class="font-bold mb-1">⚠️ เงื่อนไขการคืนเงิน:</p>
                <p>ทางโรงแรมจะทำการ <span class="underline font-bold text-red-600">คืนเงิน 20%</span> ของยอดที่ชำระเข้ามาเท่านั้น</p>
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">1. เหตุผลการยกเลิก <span class="text-red-500">*</span></label>
                <textarea id="cancel-reason" class="swal2-textarea m-0 w-full h-20 text-sm" placeholder="เช่น ติดธุระด่วน, ป่วย, เปลี่ยนแผนการเดินทาง..."></textarea>
            </div>

            <div class="border-t border-gray-200 pt-4 mt-2">
                <p class="text-sm font-bold text-blue-900 mb-3">ช่องทางรับเงินคืน (กรุณาระบุอย่างน้อย 1 ช่องทาง)</p>
                
                <div class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">รายละเอียดบัญชี / พร้อมเพย์</label>
                    <textarea id="refund-details" class="swal2-textarea m-0 w-full h-20 text-sm bg-gray-50" placeholder="ระบุชื่อธนาคาร, เลขบัญชี, ชื่อบัญชี หรือ เบอร์พร้อมเพย์"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">หรือแนบภาพ QR Code รับเงิน</label>
                    <input type="file" id="refund-image" accept="image/*" class="w-full text-sm border border-gray-300 rounded p-2 bg-white">
                </div>
            </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ยืนยันส่งคำขอ',
      cancelButtonText: 'ปิดหน้าต่าง',
      focusConfirm: false,
      preConfirm: () => {
        const reason = document.getElementById('cancel-reason').value;
        const refundDetails = document.getElementById('refund-details').value;
        const refundImage = document.getElementById('refund-image').files[0];

        if (!reason) {
          Swal.showValidationMessage('กรุณาระบุเหตุผลการยกเลิก');
          return false;
        }
        if (!refundDetails && !refundImage) {
          Swal.showValidationMessage('กรุณาระบุช่องทางการรับเงินคืน (เลขบัญชี หรือ แนบ QR Code)');
          return false;
        }

        return { reason, refundDetails, refundImage };
      }
    });

    if (formValues) {
      // แสดง Loading ระหว่างส่งข้อมูล
      Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      try {
        // ใช้ FormData เพื่อรองรับการอัปโหลดไฟล์
        const formData = new FormData();
        formData.append('booking_id', bookingId);
        formData.append('reason', formValues.reason);
        formData.append('refund_details', formValues.refundDetails || '');
        if (formValues.refundImage) {
            formData.append('refund_image', formValues.refundImage);
        }

        const response = await fetch(`${API_URL}/cancel-booking`, {
          method: 'POST',
          // ไม่ต้องใส่ Content-Type: application/json เพราะใช้ FormData
          body: formData 
        });

        const data = await response.json();
        if (data.success) {
          Swal.fire('ส่งคำขอสำเร็จ', 'ระบบได้รับคำขอยกเลิกแล้ว กรุณารอตรวจสอบและโอนเงินคืน (20%) ภายในระยะเวลาทำการ', 'success');
          if (user) {
             const userId = user.id || user.user_id || user.ID;
             fetch(`${API_URL}/my-bookings/${userId}`)
              .then(res => res.json())
              .then(data => {
                  if (Array.isArray(data)) setBookings(data);
              });
          }
        } else {
          Swal.fire('ผิดพลาด', data.message || 'ไม่สามารถยกเลิกได้', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
      }
    }
  };

  const filteredBookings = Array.isArray(bookings) ? bookings.filter(b => {
    if (!filterDate) return true;
    const bDate = new Date(b.check_in_date || b.booking_date).toISOString().split('T')[0];
    return bDate === filterDate;
  }) : [];

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-l-4 border-blue-600 pl-4">ประวัติการจองห้องพัก</h2>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-1/2">
            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
            />
        </div>
        {filterDate && (
            <button 
                onClick={() => setFilterDate('')}
                className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm font-medium"
            >
                <X size={16} /> ล้างตัวกรอง
            </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm">📭 ยังไม่มีประวัติการจอง</div>
        ) : (
          filteredBookings.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-100 text-green-700' :
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            item.status === 'pending_reschedule' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'pending_cancel' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {
                                item.status === 'pending' ? 'รอตรวจสอบ' :
                                item.status === 'approved' || item.status === 'upcoming' ? 'ยืนยันแล้ว' :
                                item.status === 'pending_reschedule' ? 'รออนุมัติเลื่อน' :
                                item.status === 'pending_cancel' ? 'รอยืนยันยกเลิก' :
                                item.status === 'cancelled' ? 'ยกเลิกแล้ว' :
                                item.status === 'rejected' ? 'ถูกปฏิเสธ' : item.status
                            }
                        </span>
                        <span className="text-gray-400 text-xs">ID: #{item.id}</span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800">{item.room_name}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(item.check_in_date).toLocaleDateString('th-TH')} - {new Date(item.check_out_date).toLocaleDateString('th-TH')}
                    </p>
                    {item.reschedule_reason && (
                       <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded border border-orange-100 inline-block">
                          📝 เหตุผลขอเลื่อน: {item.reschedule_reason}
                       </p>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  <p className="text-2xl font-bold text-blue-600">{Number(item.price).toLocaleString()} ฿</p>
                  <div className="flex gap-2 justify-end mt-1">
                    {(item.status === 'upcoming' || item.status === 'approved' || item.status === 'pending') && (
                      <>
                        <button onClick={() => navigate('/receipt', { state: { booking: item } })} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-200">🧾 ใบเสร็จ</button>
                        
                        <button onClick={() => handleReschedule(item.id, item.room_name, item.check_in_date, item.check_out_date, item.price, item.reschedule_count)} className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-yellow-200">📅 เลื่อนวัน</button>
                        
                        <button onClick={() => handleCancel(item.id, (item.check_in_date || item.booking_date))} className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200">❌ ยกเลิก</button>
                      </>
                    )}
                    {item.status === 'completed' && (
                         <button onClick={() => navigate('/receipt', { state: { booking: item } })} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">📄 ดูใบเสร็จย้อนหลัง</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingHistory;