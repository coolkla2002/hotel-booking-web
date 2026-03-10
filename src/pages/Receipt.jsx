// Receipt.jsx

import React, { useEffect, useState, useRef } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas'; 
import jsPDF from 'jspdf'; 

const Receipt = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const receiptRef = useRef(null); 

  useEffect(() => {
    if (location.state && location.state.booking) {
      setBooking(location.state.booking);
    } else {
      navigate('/history');
    }
  }, [location, navigate]);

  // ✅ ฟังก์ชันคำนวณจำนวนคืน
  const calculateNights = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e - s);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // ✅ แก้ไขชื่อไฟล์ให้เลข ID เป็น 3 หลัก (เช่น Receipt_Booking_005.pdf)
      pdf.save(`Receipt_Booking_${String(booking.id).padStart(3, '0')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  if (!booking) return null;

  const nights = calculateNights(booking.check_in_date, booking.check_out_date);
  
  // ✅ คำนวณราคาสุทธิ (หักส่วนลดข้าราชการถ้ามี)
  console.log("ข้อมูล Booking ที่ส่งมาหน้าใบเสร็จ:", booking);
  const basePrice = Number(booking.price) || 0;
  const discount = booking.user_type === 'official' ? 100 : 0;
  const netTotal = basePrice - discount;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 print:bg-white print:p-0">
      
      <div className="mb-6 flex gap-4 print:hidden">
        <button 
          onClick={handleDownloadPDF} 
          className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 font-bold flex items-center gap-2"
        >
          ดาวน์โหลดใบเสร็จ (PDF)
        </button>
        <button 
          onClick={() => navigate(-1)}
          className="bg-red-500 text-white px-6 py-2 rounded shadow hover:bg-gray-600"
        >
          ย้อนกลับ
        </button>
      </div>

      <div ref={receiptRef} className="bg-white p-10 rounded shadow-lg w-[210mm] min-h-[297mm] relative text-gray-800 print:shadow-none print:w-full print:h-auto">
        
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex items-center gap-4"> 
            <div className="w-20 h-20 overflow-hidden rounded-lg bg-gray-100 border flex items-center justify-center">
              <img 
                src="images/ChatGPT Image 7 ม.ค. 2569 13_09_46.png" 
                alt="Hotel Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-blue-900">HOTEL BOOKING</h1>
              <p className="text-sm text-gray-500 mt-1">ใบยืนยันการจองห้องพัก / Receipt</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">RCBAT Hotel</h2>
            <p className="text-sm">888 นครราชสีมา</p>
            <p className="text-sm">โทร: 0987654321</p>
            <p className="text-sm">Email: contact@myhotel.com</p>
          </div>
        </div>

        {/* ✅ ส่วนแสดงสิทธิ์ข้าราชการ (ถ้ามี) */}
        {booking.user_type === 'official' && (
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <p className="text-blue-800 font-bold">✨ สิทธิประโยชน์สำหรับข้าราชการ</p>
            <p className="text-sm text-blue-600">ได้รับส่วนลดพิเศษ 100 บาท สำหรับการจองรายการนี้ (ตรวจสอบสิทธิ์จากบัตรข้าราชการแล้ว)</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-600 border-b mb-2">ข้อมูลผู้จอง (Customer)</h3>
            
            {/* ✅ แก้ไขการแสดงผล ID ให้เป็น 3 หลัก (เช่น #001) */}
            <p><strong>Booking ID:</strong> #{String(booking.id).padStart(3, '0')}</p>
            
            {/* ✅ แสดงชื่อผู้จอง (Customer Name) */}
            <p><strong>ชื่อผู้จอง:</strong> {booking.customer_name || booking.fullname || booking.name || booking.user_name || 'ไม่ระบุ'}</p>
            
            {/* ✅ แสดงอีเมล (Email) */}
            <p><strong>อีเมล:</strong> {booking.email || 'ไม่ระบุ'}</p>
            
            {/* ✅ แสดงวันที่และเวลา ณ ตอนที่ทำรายการจอง */}
            <p><strong>วันที่ทำรายการ:</strong> {new Date(booking.created_at || booking.booking_date || Date.now()).toLocaleString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })} น.</p>
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-600 border-b mb-2 text-right">สถานะ (Status)</h3>
            <span className={`px-3 py-1 rounded text-sm font-bold border ${
                booking.status === 'approved' ? 'text-green-600 border-green-600' :
                booking.status === 'pending' ? 'text-yellow-600 border-yellow-600' :
                'text-red-600 border-red-600'
            }`}>
              {(booking.status || 'UPCOMING').toUpperCase()}
            </span>
          </div>
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="p-3 text-left border">รายการ (Description)</th>
              <th className="p-3 text-center border">จำนวนคืน (Nights)</th>
              <th className="p-3 text-center border">จำนวนห้อง (Rooms)</th>
              <th className="p-3 text-right border">จำนวนเงินรวม (Total)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border">
                <p className="font-bold">{booking.room_name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(booking.check_in_date).toLocaleDateString('th-TH')} - {new Date(booking.check_out_date).toLocaleDateString('th-TH')}
                </p>
              </td>
              <td className="p-3 border text-center font-bold">
                {nights} คืน
              </td>
              <td className="p-3 border text-center">
                {booking.room_count || 1} ห้อง
              </td>
              <td className="p-3 border text-right align-top font-bold">
                {basePrice.toLocaleString()} บาท
              </td>
            </tr>
          </tbody>
          <tfoot>
            {/* ✅ แสดงส่วนลดถ้าเป็นข้าราชการ */}
            {booking.user_type === 'official' && (
              <tr className="bg-gray-50">
                <td colSpan="3" className="p-3 text-right text-sm text-red-600 font-bold border italic">ส่วนลดข้าราชการ (Official Discount)</td>
                <td className="p-3 text-right text-sm text-red-600 font-bold border italic">- 100 บาท</td>
              </tr>
            )}
            <tr className="bg-gray-100">
              <td colSpan="3" className="p-3 text-right font-bold border">ยอดชำระสุทธิ (Net Total)</td>
              <td className="p-3 text-right font-bold border text-xl text-blue-800">
                {/* ✅ เปลี่ยนเป็นแสดงราคาสุทธิที่คำนวณหักส่วนลดแล้ว */}
                {netTotal.toLocaleString()} บาท
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="absolute bottom-10 left-10 right-10 text-center border-t pt-4 text-gray-500 text-sm">
          <p>RCBAT Hotel - ขอบคุณที่ใช้บริการ</p>
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