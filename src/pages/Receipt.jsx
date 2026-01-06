import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Receipt = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);

  // ดึงข้อมูล User ที่ Login อยู่
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    if (location.state && location.state.booking) {
      setBooking(location.state.booking);
    } else {
      navigate('/history');
    }
  }, [location, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 print:bg-white print:p-0">
      
      {/* ส่วนปุ่มกดพิมพ์ */}
      <div className="mb-6 flex gap-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 font-bold flex items-center gap-2"
        >
          🖨️ พิมพ์ใบเสร็จ / บันทึก PDF
        </button>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-6 py-2 rounded shadow hover:bg-gray-600"
        >
          ย้อนกลับ
        </button>
      </div>

      {/* กระดาษใบเสร็จ */}
      <div className="bg-white p-10 rounded shadow-lg w-[210mm] min-h-[297mm] relative text-gray-800 print:shadow-none print:w-full print:h-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">HOTEL BOOKING</h1>
            <p className="text-sm text-gray-500 mt-1">ใบยืนยันการจองห้องพัก / Receipt</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">My Hotel</h2>
            <p className="text-sm">888 นครราชสีมา</p>
            <p className="text-sm">โทร: 0987654321</p>
            <p className="text-sm">Email: contact@myhotel.com</p>
          </div>
        </div>

        {/* ข้อมูลลูกค้าและการจอง */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-600 border-b mb-2">ข้อมูลผู้จอง (Customer)</h3>
            <p><strong>Booking ID:</strong> #{booking.id}</p>
            
            {/* --- ส่วนที่แก้ไข: ใช้ booking.created_at หรือ booking.booking_date --- */}
            <p><strong>ชื่อผู้จอง:</strong> {user.name ? `${user.name} ${user.lastname || ''}` : (booking.user_name || 'คุณลูกค้า')}</p>
            <p><strong>อีเมล:</strong> {user.email || booking.email || '-'}</p>
            <p><strong>วันที่ทำรายการ:</strong> {new Date(booking.created_at || booking.booking_date).toLocaleString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })} น.</p>
            {/* ------------------------------------------------------------------- */}

          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-600 border-b mb-2 text-right">สถานะ (Status)</h3>
            <span className={`px-3 py-1 rounded text-sm font-bold border ${
                booking.status === 'approved' ? 'text-green-600 border-green-600' :
                booking.status === 'pending' ? 'text-yellow-600 border-yellow-600' :
                'text-red-600 border-red-600'
            }`}>
              {booking.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ตารางรายละเอียด */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="p-3 text-left border">รายการ (Description)</th>
              <th className="p-3 text-center border">วันที่ (Date)</th>
              <th className="p-3 text-right border">จำนวนเงิน (Amount)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border">
                <p className="font-bold">{booking.room_name}</p>
                <p className="text-sm text-gray-500">ค่าที่พัก (Room Charge)</p>
              </td>
              <td className="p-3 border text-center">
                {new Date(booking.check_in_date).toLocaleDateString('th-TH')} <br/> ถึง <br/>
                {new Date(booking.check_out_date).toLocaleDateString('th-TH')}
              </td>
              <td className="p-3 border text-right align-top font-bold">
                {Number(booking.price).toLocaleString()} บาท
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td colSpan="2" className="p-3 text-right font-bold border">รวมทั้งสิ้น (Total)</td>
              <td className="p-3 text-right font-bold border text-xl text-blue-800">
                {Number(booking.price).toLocaleString()} บาท
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="absolute bottom-10 left-10 right-10 text-center border-t pt-4 text-gray-500 text-sm">
          <p>ขอบคุณที่ใช้บริการ My Hotel</p>
        </div>

      </div>

      <style>{`
        @media print {
          @page { margin: 0; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default Receipt;