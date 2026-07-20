import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Calendar, Clock, MapPin, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { bookingService } from '../services/ticket.service';
import { movieService } from '../services/movie.service';
import { useToast } from '../components/Toast';
import { type BookingResponseDTO, type Movie, type Showtime } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingResponseDTO | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  
  const result = searchParams.get('result');
  const idBill = searchParams.get('idBill');
  const token = searchParams.get('token');

  useEffect(() => {
    const handlePaymentResult = async () => {
      if (!idBill) {
        showToast('Mã hóa đơn không hợp lệ', 'error');
        navigate('/');
        return;
      }

      if (result === 'success' && token) {
        // Payment approved by user on PayPal — capture it now
        try {
          setIsSuccess(true);
          const detail = await bookingService.capturePayment(idBill, token);
          setBookingDetail(detail);

          if (detail.tickets && detail.tickets.length > 0) {
            const ticket = detail.tickets[0];
            const allShowtimes = await movieService.getAllShowtimes(0, 100);
            const currentShowtime = allShowtimes.data.find((st: Showtime) => st.idShowtime === ticket.idShowtime);
            if (currentShowtime) {
              setShowtime(currentShowtime);
              const movieData = await movieService.getMovieById(currentShowtime.idMovie);
              setMovie(movieData);
            }
          }
        } catch (err) {
          console.error(err);
          showToast('Không thể tải chi tiết hóa đơn', 'error');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Payment failed or cancelled by user
        try {
          setIsSuccess(false);
          // Automatically cancel bill to free up the seats
          await bookingService.cancelBooking(idBill);
          showToast('Thanh toán thất bại hoặc đã hủy. Ghế đã được giải phóng.', 'info');
        } catch (err) {
          console.error('Error cancelling failed payment booking:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handlePaymentResult();
  }, [result, idBill, token, navigate, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
        <p className="text-neutral-400 font-medium">Đang xử lý thông tin giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {isSuccess ? (
        <div className="bg-neutral-900 border border-neutral-850 rounded-[2rem] p-8 shadow-2xl space-y-8">
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-neutral-800">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-wider text-white">Thanh toán thành công</h1>
            <p className="text-neutral-400 text-sm">Cảm ơn bạn đã lựa chọn dịch vụ của Aireak Cinema</p>
          </div>

          {movie && showtime && bookingDetail && (
            <div className="space-y-6">
              <div className="flex gap-6 pb-6 border-b border-neutral-800">
                <img 
                  src={movie.image || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba'} 
                  alt={movie.nameMovie} 
                  className="w-24 h-36 object-cover rounded-2xl border border-neutral-800 shadow-md"
                />
                <div className="flex flex-col justify-center space-y-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-green-500/30 text-green-500 bg-green-500/10 rounded-full w-max">
                    Vé xem phim
                  </span>
                  <h2 className="text-xl font-bold text-white leading-tight">{movie.nameMovie}</h2>
                  <p className="text-xs text-neutral-400 font-medium">{movie.language} • {movie.duration} phút</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-neutral-950/50 border border-neutral-850 rounded-2xl">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Ngày chiếu</p>
                    <p className="text-sm font-bold text-neutral-200">
                      {format(new Date(showtime.showTime), 'EEEE, d MMMM yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-neutral-950/50 border border-neutral-850 rounded-2xl">
                  <Clock className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Suất chiếu</p>
                    <p className="text-sm font-bold text-neutral-200">
                      {format(new Date(showtime.showTime), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-neutral-950/50 border border-neutral-850 rounded-2xl">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Phòng chiếu</p>
                    <p className="text-sm font-bold text-neutral-200">{showtime.idRoom}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-neutral-950/50 border border-neutral-850 rounded-2xl">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Hình thức</p>
                    <p className="text-sm font-bold text-neutral-200">PayPal</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-medium">Mã giao dịch:</span>
                  <span className="text-neutral-300 font-bold">{bookingDetail.bill.idBill}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-medium">Ghế đã chọn:</span>
                  <span className="text-green-500 font-black tracking-wider">
                    {bookingDetail.tickets.map(t => t.seatCode).join(', ')}
                  </span>
                </div>
                <div className="border-t border-neutral-850 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Tổng cộng:</span>
                  <span className="text-lg font-black italic text-green-500">
                    {bookingDetail.bill.totalAmount.toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => navigate('/history')}
              className="flex-1 py-3 px-6 rounded-xl border border-neutral-700 text-sm font-bold hover:bg-neutral-800 transition-colors text-center text-white"
            >
              Lịch sử đặt vé
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex-grow-[2] py-3 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-black italic uppercase tracking-wider transition-colors text-center text-white flex items-center justify-center gap-2"
            >
              Quay lại Trang chủ
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-850 rounded-[2rem] p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
            <XCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black italic uppercase tracking-wider text-white">Thanh toán không thành công</h1>
            <p className="text-neutral-400 text-sm">Giao dịch đã bị hủy hoặc gặp sự cố trong quá trình thanh toán.</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-2xl inline-block max-w-full">
            <span className="text-xs text-neutral-400">
              Mọi ghế giữ chỗ của bạn đã được hoàn trả trạng thái trống thành công.
            </span>
          </div>

          <div className="flex gap-4 pt-4 justify-center">
            <button 
              onClick={() => navigate('/')}
              className="py-3 px-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-bold transition-colors text-white"
            >
              Quay về Trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentResult;
