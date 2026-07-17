import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, MapPin, Clock, Ticket as TicketIcon, CreditCard, ChevronLeft, Download } from 'lucide-react';
import { bookingService } from '../services/ticket.service';
import { movieService } from '../services/movie.service';
import { type BookingResponseDTO, type Movie, type Showtime } from '../types';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';

const BillDetail: React.FC = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookingDetail, setBookingDetail] = useState<BookingResponseDTO | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!billId) return;
      try {
        setIsLoading(true);
        const detail = await bookingService.getBillDetail(billId);
        setBookingDetail(detail);

        // Lấy thông tin suất chiếu từ ticket đầu tiên
        if (detail.tickets.length > 0) {
          const stId = detail.tickets[0].idShowtime;
          const allShowtimes = await movieService.getAllShowtimes(0, 100); // Tăng size để tìm chính xác hơn
          const st = allShowtimes.data.find(s => s.idShowtime === stId);
          if (st) {
            setShowtime(st);
            const mv = await movieService.getMovieById(st.idMovie);
            setMovie(mv);
          }
        }
      } catch (err) {
        showToast('Không thể tải thông tin hóa đơn', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [billId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-500 animate-pulse" />
        <p className="text-neutral-400">Đang tải thông tin hóa đơn...</p>
      </div>
    );
  }

  if (!bookingDetail || !movie || !showtime) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Không tìm thấy thông tin hóa đơn</h2>
        <Link to="/" className="text-green-500 hover:underline flex items-center justify-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Chi tiết hóa đơn</h1>
      </div>

      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-neutral-800 bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-40 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-neutral-800 flex-shrink-0">
              <img 
                src={movie.image} 
                alt={movie.nameMovie} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow space-y-6">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">{movie.nameMovie}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-green-500" /> {movie.duration} phút</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-500" /> Aireak Cinema - {showtime.idRoom}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-6 bg-neutral-800/30 rounded-2xl border border-neutral-700/50">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Ngày chiếu</span>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Calendar className="w-4 h-4 text-green-500" />
                    {format(new Date(showtime.showTime), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Giờ chiếu</span>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Clock className="w-4 h-4 text-green-500" />
                    {format(new Date(showtime.showTime), 'HH:mm')}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Ghế đã đặt</span>
                  <div className="flex items-center gap-2 text-green-500 font-black italic">
                    <TicketIcon className="w-4 h-4" />
                    {bookingDetail.tickets.map(t => t.seatCode).join(', ')}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Mã hóa đơn</span>
                  <div className="text-white font-mono text-sm">#{bookingDetail.bill.idBill.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6"> 
          <div className="pt-6 border-t border-dashed border-neutral-800 flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Tổng tiền</span>
              <div className="text-4xl font-black text-green-500 italic tracking-tighter">
                {bookingDetail.bill.totalAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-black italic uppercase tracking-widest text-center transition-all"
        >
          Quay lại
        </button>
        
      </div>
    </div>
  );
};

export default BillDetail;
