// client/src/pages/client/BookingHistory.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import API_URL from "/src/config";
import { Search, X } from 'lucide-react'; 

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
        .then(data => setBookings(data))
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
    
    return diffDays >= 3; 
  };

  const handleCancel = async (bookingId, checkInDate) => {
    if (!canModify(checkInDate)) {
        Swal.fire('ไม่สามารถยกเลิกได้', 'ต้องแจ้งยกเลิกการจองล่วงหน้าอย่างน้อย 3 วัน', 'error');
        return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'แจ้งขอคืนเงิน',
      html: `
        <div style="text-align: left;">
          <p style="font-size: 14px; color: #555; margin-bottom: 10px;">กรุณาระบุเลขบัญชี/ธนาคาร หรืออัปโหลด QR Code เพื่อรับเงินคืน</p>
          <label style="font-weight: bold; font-size: 14px;">📝 รายละเอียดบัญชี:</label>
          <input id="swal-refund-details" class="swal2-input" placeholder="เลขบัญชี, ชื่อบัญชี, ธนาคาร" style="margin-top: 5px; width: 85%;">
          
          <label style="font-weight: bold; font-size: 14px; display: block; margin-top: 15px;">🖼️ อัปโหลด QR Code (ถ้ามี):</label>
          <input type="file" id="swal-refund-file" class="swal2-file" accept="image/*" style="width: 85%;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ส่งคำขอยกเลิก',
      cancelButtonText: 'ปิด',
      customClass: {
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all',
        cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-all'
      },
      preConfirm: () => {
        const details = document.getElementById('swal-refund-details').value;
        const file = document.getElementById('swal-refund-file').files[0];
        if (!details && !file) {
          Swal.showValidationMessage('กรุณากรอกรายละเอียดบัญชีหรืออัปโหลด QR Code');
          return null;
        }
        return { details, file };
      }
    });

    if (formValues) {
      const formData = new FormData();
      formData.append('booking_id', bookingId);
      formData.append('refund_details', formValues.details || "");
      if (formValues.file) {
          formData.append('refund_qr', formValues.file);
      }

      fetch(`${API_URL}/cancel-booking`, {
        method: 'PUT',
        body: formData 
      })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          Swal.fire('ส่งคำขอแล้ว!', 'รอแอดมินตรวจสอบและอนุมัติการคืนเงิน', 'success');
          setBookings(prev => 
            prev.map(item => item.id === bookingId ? { ...item, status: 'pending_cancel' } : item)
          ); 
        } else {
          Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถยกเลิกได้', 'error');
        }
      })
      .catch(err => {
          console.error("Fetch Error:", err);
          Swal.fire('Error', 'เชื่อมต่อระบบไม่ได้', 'error');
      });
    }
  };

  const handleReschedule = async (bookingId, roomName, oldCheckIn, oldCheckOut, currentPrice) => {
    if (!canModify(oldCheckIn)) {
        Swal.fire('ไม่สามารถเลื่อนวันได้', 'ต้องแจ้งเลื่อนวันล่วงหน้าอย่างน้อย 3 วัน', 'error');
        return;
    }

    let occupiedDates = [];
    try {
        const response = await fetch(`${API_URL}/bookings/occupied?room_name=${encodeURIComponent(roomName)}`);
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

    const pricePerNight = currentPrice / (Math.ceil(Math.abs((new Date(oldCheckOut) - new Date(oldCheckIn)) / (24 * 60 * 60 * 1000))) || 1);

    const { value: formValues } = await Swal.fire({
      title: 'ขอเลื่อนวันเข้าพัก',
      html: `
        <div style="text-align: left; margin-top: 10px;">
            <div style="margin-bottom: 10px; font-size: 14px; color: #666; background: #f8f9fa; padding: 10px; border-radius: 8px;">
               💰 ราคาที่จ่ายแล้ว: <b>${Number(currentPrice).toLocaleString()}</b> บาท <br/>
               <span id="price-change-info">ราคาใหม่: - บาท</span> <br/>
               <div id="balance-info" style="margin-top: 5px; font-size: 16px;"></div>
            </div>
            <hr style="margin: 10px 0;">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">📅 วันที่เช็คอินใหม่:</label>
                <input type="text" id="swal-new-checkin" class="swal2-input" placeholder="เลือกวันเช็คอินใหม่" style="margin: 0; width: 100%;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">📅 วันที่เช็คเอาท์ใหม่:</label>
                <input type="text" id="swal-new-checkout" class="swal2-input" placeholder="เลือกวันเช็คเอาท์ใหม่" style="margin: 0; width: 100%;" disabled>
            </div>

            <div id="slip-section" style="display: none; border: 2px dashed #ff4d4f; padding: 12px; border-radius: 8px; background: #fff1f0;">
                <p style="color: #cf1322; font-weight: bold; font-size: 14px; margin-bottom: 8px;">💵 มียอดค้างชำระเพิ่ม กรุณาแนบสลิป:</p>
                <input type="file" id="swal-reschedule-slip" class="swal2-file" accept="image/*" style="width: 100%; margin: 0;">
            </div>

            <div style="font-size: 12px; color: orange; margin-top: 10px;">* กรณีราคาใหม่ถูกกว่าเดิม ส่วนต่างจะถูกพิจารณาคืนโดยแอดมิน</div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'ส่งคำขอเลื่อนวัน',
      customClass: {
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-colors',
        cancelButton: 'bg-red-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg mx-2 transition-colors'
      },
      didOpen: () => {
        const checkInInput = document.getElementById('swal-new-checkin');
        const checkOutInput = document.getElementById('swal-new-checkout');
        const priceInfo = document.getElementById('price-change-info');
        const balanceInfo = document.getElementById('balance-info');
        const slipSection = document.getElementById('slip-section');

        const updatePrice = () => {
            if (checkInInput.value && checkOutInput.value) {
                const diffDays = Math.ceil(Math.abs(new Date(checkOutInput.value) - new Date(checkInInput.value)) / (1000 * 60 * 60 * 24));
                const newPrice = diffDays * pricePerNight;
                const balance = newPrice - currentPrice;

                priceInfo.innerHTML = `💵 ราคาใหม่ (${diffDays} คืน): <b>${newPrice.toLocaleString()}</b> บาท`;
                
                if (balance > 0) {
                    balanceInfo.innerHTML = `<span style="color: #cf1322; font-weight: bold;">⚠️ ต้องชำระเพิ่ม: ${balance.toLocaleString()} บาท</span>`;
                    slipSection.style.display = 'block';
                } else if (balance < 0) {
                    balanceInfo.innerHTML = `<span style="color: #389e0d; font-weight: bold;">✨ ส่วนต่างลดลง: ${Math.abs(balance).toLocaleString()} บาท</span>`;
                    slipSection.style.display = 'none';
                } else {
                    balanceInfo.innerHTML = `<span style="color: #8c8c8c;">ราคาเท่าเดิม</span>`;
                    slipSection.style.display = 'none';
                }
            }
        };

        const fpCheckIn = flatpickr(checkInInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: occupiedDates,
            onChange: (selectedDates) => {
                if (selectedDates.length > 0) {
                    checkOutInput.disabled = false;
                    const nextDay = new Date(selectedDates[0]);
                    nextDay.setDate(nextDay.getDate() + 1);
                    fpCheckOut.set('minDate', nextDay);
                    updatePrice();
                }
            }
        });
        const fpCheckOut = flatpickr(checkOutInput, {
            minDate: "today",
            dateFormat: "Y-m-d",
            disable: occupiedDates, 
            onChange: updatePrice
        });
      },
      preConfirm: () => {
        const newCheckIn = document.getElementById('swal-new-checkin').value;
        const newCheckOut = document.getElementById('swal-new-checkout').value;
        const slipFile = document.getElementById('swal-reschedule-slip').files[0];

        if (!newCheckIn || !newCheckOut) return Swal.showValidationMessage('กรุณาเลือกวันให้ครบ');
        
        const diffDays = Math.ceil(Math.abs(new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60 * 60 * 24));
        const newTotalPrice = diffDays * pricePerNight;

        if (newTotalPrice > currentPrice && !slipFile) {
            return Swal.showValidationMessage('กรุณาแนบสลิปการโอนเงินส่วนต่าง');
        }

        return { newCheckIn, newCheckOut, newTotalPrice, slipFile };
      }
    });

    if (formValues) {
        const formData = new FormData();
        formData.append('booking_id', bookingId);
        formData.append('new_check_in', formValues.newCheckIn);
        formData.append('new_check_out', formValues.newCheckOut);
        formData.append('new_price', formValues.newTotalPrice);
        if (formValues.slipFile) {
            formData.append('reschedule_slip', formValues.slipFile);
        }

        fetch(`${API_URL}/request-reschedule`, {
            method: 'POST',
            body: formData 
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire('ส่งคำขอแล้ว!', 'กรุณารอเจ้าหน้าที่อนุมัติ', 'success');
                setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'pending_reschedule' } : b));
            } else {
                Swal.fire('ผิดพลาด', data.message || 'ส่งคำขอไม่สำเร็จ', 'error');
            }
        })
        .catch(err => console.error("Reschedule Error:", err));
    }
  };

  const filteredBookings = bookings.filter((item) => {
    if (!filterDate) return true;
    const itemDate = new Date(item.check_in_date || item.booking_date).toISOString().split('T')[0];
    return itemDate === filterDate;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-blue-900">📅 ประวัติการจองของฉัน</h2>
        <div className="relative">
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow border border-blue-200">
                <span className="text-gray-500 text-sm font-bold">🔍 ค้นหาวันเข้าพัก:</span>
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="outline-none text-blue-800 font-bold bg-transparent"
                />
                {filterDate && (
                    <button onClick={() => setFilterDate('')} className="text-red-500 hover:text-red-700">
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">
          {filterDate ? 'ไม่พบการจองในวันที่เลือก' : 'ยังไม่มีการจองห้องพัก'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-center border-l-4 border-blue-500 hover:shadow-lg transition-shadow gap-4">
              
              <div className="w-full md:w-auto">
                <h3 className="text-xl font-bold text-gray-800">{item.room_name}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <p><span className="font-bold text-blue-600">เข้าพัก:</span> {new Date(item.check_in_date || item.booking_date).toLocaleDateString('th-TH')}</p>
                    {item.check_out_date && <p><span className="font-bold text-red-500">ออก:</span> {new Date(item.check_out_date).toLocaleDateString('th-TH')}</p>}
                </div>
                
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-fit
                  ${item.status === 'approved' || item.status === 'upcoming' ? 'bg-green-100 text-green-700' : 
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    item.status === 'pending_reschedule' ? 'bg-orange-100 text-orange-800' : 
                    item.status === 'pending_cancel' ? 'bg-red-50 text-red-500' : 
                    item.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-600'}`}>
                  
                  {item.status === 'approved' || item.status === 'upcoming' ? '✅ จองสำเร็จ' : 
                   item.status === 'pending' ? '⏳ รอตรวจสอบ' : 
                   item.status === 'pending_reschedule' ? '📅 รออนุมัติเลื่อนวัน' : 
                   item.status === 'pending_cancel' ? '🛑 รออนุมัติยกเลิก' : 
                   item.status === 'rejected' ? '❌ ไม่ผ่าน' : 
                   '🚫 ยกเลิกแล้ว'}
                </span>
              </div>

              <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  <p className="text-2xl font-bold text-blue-600">{Number(item.price).toLocaleString()} ฿</p>
                  <div className="flex gap-2 justify-end mt-1">
                    {(item.status === 'upcoming' || item.status === 'approved' || item.status === 'pending') && (
                      <>
                        <button onClick={() => navigate('/receipt', { state: { booking: item } })} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-200">🧾 ใบเสร็จ</button>
                        <button onClick={() => handleReschedule(item.id, item.room_name, (item.check_in_date || item.booking_date), item.check_out_date, item.price)} className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-yellow-200">📅 เลื่อนวัน</button>
                        <button onClick={() => handleCancel(item.id, (item.check_in_date || item.booking_date))} className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200">ยกเลิก</button>
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