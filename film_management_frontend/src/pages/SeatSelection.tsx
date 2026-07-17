import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { bookingService } from '../services/ticket.service';
import { authService } from '../services/auth.service';
import { movieService } from '../services/movie.service';
import { type Showtime, type Seat, type Movie, type BookingResponseDTO } from '../types';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckCircle2, Ticket as TicketIcon, Calendar, Clock, MapPin, X, Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RoomConfig {
  name: string;
  columns: number;
  aisles: number[];
  description: string;
}

const ROOM_CONFIGS: Record<string | number, RoomConfig> = {
  1: {
    name: "Phòng Standard - Room 1",
    columns: 10,
    aisles: [5],
    description: "Phòng chiếu 10x10, không gian tiêu chuẩn"
  },
  2: {
    name: "Phòng Comfort - Room 2",
    columns: 12,
    aisles: [3, 9],
    description: "Phòng chiếu 12x10, không gian rộng rãi"
  },
  3: {
    name: "Phòng Premium - Room 3",
    columns: 8,
    aisles: [4],
    description: "Phòng chiếu 8x8, ghế ngồi cao cấp"
  }
};

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const SeatSelection: React.FC = () => {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingResult, setBookingResult] = useState<BookingResponseDTO | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!showtimeId) return;
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Lấy danh sách ghế, trạng thái và giá theo suất chiếu
        const seatStatuses = await bookingService.getSeatStatuses(showtimeId);
        const seatStatusMap = new Map(seatStatuses.map(seat => [seat.seatCode, seat]));
        
        // 2. Lấy thông tin suất chiếu
        const allShowtimes = await movieService.getAllShowtimes(0, 100);
        const currentShowtime = allShowtimes.data.find((st: Showtime) => st.idShowtime === showtimeId);
        
        if (!currentShowtime) {
          throw new Error('Không tìm thấy thông tin suất chiếu');
        }

        setShowtime(currentShowtime);

         // 3. Lấy thông tin phim
         const movieData = await movieService.getMovieById(currentShowtime.idMovie);
         setMovie(movieData);

         // 4. Tạo danh sách tất cả ghế dựa trên cấu hình phòng
         const roomRawId = currentShowtime.idRoom;
         const roomNumericId = parseInt(roomRawId.replace(/[^0-9]/g, '')) || 1;
         
         const config = ROOM_CONFIGS[roomNumericId] || ROOM_CONFIGS[1];
         const roomId = roomNumericId;

         const allSeats: Seat[] = [];
         const rows = roomId === 2 ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
         
         rows.forEach(row => {
           let currentSlot = 1;
           let seatInRowIndex = 1;
           
           while (currentSlot <= config.columns) {
             let seatType: 'STANDARD' | 'VIP' | 'COUPLE' = 'STANDARD';
             
             // Phân bổ loại ghế dựa trên hàng
             if (row === 'G' || row === 'H' || row === 'I' || row === 'J') {
               seatType = 'COUPLE';
             } else if (row === 'D' || row === 'E' || row === 'F') {
               seatType = 'VIP';
             }

             // Độ rộng của ghế tính theo slot (theo yêu cầu: couple chiếm 2 slot)
             const seatWidth = seatType === 'COUPLE' ? 2 : 1;
             
             // Kiểm tra nếu không đủ slot trống còn lại cho ghế Couple
             if (currentSlot + seatWidth - 1 > config.columns) {
               // Nếu là ghế Couple mà không đủ chỗ, chuyển thành ghế thường nếu còn ít nhất 1 slot
               if (seatType === 'COUPLE' && currentSlot <= config.columns) {
                 seatType = 'STANDARD';
               } else {
                 // Không còn đủ chỗ cho bất kỳ ghế nào
                 break;
               }
             }

             const seatId = `${row}${seatInRowIndex}`;
             const seatStatus = seatStatusMap.get(seatId);
             if (seatStatus) {
               seatType = seatStatus.typeSeat;
             }
             
             allSeats.push({
               id: seatId,
               roomId: currentShowtime.idRoom.toString(),
               row: row,
               column: seatInRowIndex,
               type: seatType,
               price: seatStatus?.price ?? 0,
               isBooked: seatStatus?.status === 'BOOKED'
             });

             currentSlot += (seatType === 'COUPLE' ? 2 : 1);
             seatInRowIndex++;
           }
         });

        setSeats(allSeats);
      } catch (err: any) {
        const message = 'Không thể tải sơ đồ ghế. Vui lòng thử lại sau.';
        setError(message);
        showToast(message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showtimeId]);

  const toggleSeat = (seat: Seat) => {
    if (seat.isBooked) return;
    setSelectedSeats(prev => 
      prev.find(s => s.id === seat.id) 
        ? prev.filter(s => s.id !== seat.id) 
        : [...prev, seat]
    );
  };

  const calculateTotal = () => {
    return selectedSeats.reduce((total, seat) => total + seat.price, 0);
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0 || !showtime) return;
    
    const loginData = authService.getCurrentUser();
    if (!loginData || !loginData.token) {
      showToast('Vui lòng đăng nhập để đặt vé', 'info');
      navigate('/login');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const bookingData = {
        idShowtime: showtime.idShowtime,
        seatCodes: selectedSeats.map(s => s.id)
      };

      const response = await bookingService.bookTickets(bookingData);
      showToast('Đặt vé thành công!', 'success');
      setBookingResult(response);
      setCurrentStep(2);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Đặt vé thất bại. Vui lòng thử lại.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
        <div className={cn(
          "flex-1 flex items-center justify-center py-3 gap-2 font-bold italic transition-all duration-500",
          currentStep === 1 ? "bg-green-600 text-white" : "bg-neutral-800 text-neutral-500"
        )}>
          <span className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs not-italic",
            currentStep === 1 ? "bg-white text-green-600" : "bg-neutral-700 text-neutral-400"
          )}>1</span>
          Chọn ghế
        </div>
        <div className={cn(
          "w-0 h-0 border-y-[24px] border-y-transparent border-l-[24px] transition-all duration-500",
          currentStep === 1 ? "border-l-green-600" : "border-l-neutral-800"
        )} />
        <div className={cn(
          "flex-1 flex items-center justify-center py-3 gap-2 font-bold italic transition-all duration-500",
          currentStep === 2 ? "bg-green-600 text-white" : "bg-neutral-900 text-neutral-500"
        )}>
          <span className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs not-italic",
            currentStep === 2 ? "bg-white text-green-600" : "bg-neutral-800 text-neutral-500"
          )}>2</span>
          Thành công
        </div>
      </div>

      {currentStep === 1 ? (
        <div className="flex flex-col lg:flex-row gap-10 min-h-[80vh]">
      {/* Left side: Seat Map */}
      <div className="flex-grow bg-neutral-900 rounded-[2.5rem] border border-neutral-800 p-10 shadow-2xl">
        <div className="flex justify-center items-center mb-12 pb-8 border-b border-neutral-800">
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 text-xs font-black uppercase tracking-[0.15em] text-neutral-400">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
              <span>Đang chọn</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-zinc-700 rounded-lg border border-zinc-600" />
              <span>Thường</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-500 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
              <span>VIP</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-6 bg-rose-500 rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
              <span>Couple</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center">
                <X className="w-4 h-4 text-neutral-600" />
              </div>
              <span>Đã đặt</span>
            </div>
          </div>
        </div>

        {/* Screen */}
        <div className="relative mb-24">
          <div className="w-full h-2 bg-gradient-to-b from-green-500/30 to-transparent rounded-full blur-md" />
          <div className="w-[85%] h-12 bg-neutral-800 mx-auto rounded-b-[120px] border-t-4 border-green-600 flex items-center justify-center shadow-[0_20px_40px_rgba(34,197,94,0.1)]">
            <span className="text-white font-black tracking-[1em] text-sm italic">SCREEN</span>
          </div>
        </div>

        {/* Seats Grid */}
        <div className="flex flex-col gap-4 items-center select-none overflow-x-auto py-8">
          {ROWS.map(rowLabel => {
            const rowSeats = seats.filter(s => s.row === rowLabel).sort((a, b) => a.column - b.column);
            if (rowSeats.length === 0) return null;

            return (
              <div key={rowLabel} className="flex gap-4 items-center">
                <span className="w-8 text-center text-sm font-black text-neutral-500">{rowLabel}</span>
                <div className="flex gap-2">
                  {rowSeats.map((seat) => {
                    const isBooked = seat.isBooked;
                    const isSelected = !!selectedSeats.find(s => s.id === seat.id);
                    const isVIP = seat.type === 'VIP';
                    const isCouple = seat.type === 'COUPLE';

                    return (
                      <button
                        key={seat.id}
                        disabled={isBooked}
                        onClick={() => toggleSeat(seat)}
                        className={cn(
                          "relative flex items-center justify-center text-xs font-black transition-all duration-300 rounded-xl",
                          isCouple ? "w-[88px] h-10" : "w-10 h-10",
                          isBooked 
                            ? "bg-neutral-800 border border-neutral-700 text-neutral-600 cursor-not-allowed"
                            : isSelected
                              ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110 z-10"
                              : isCouple
                                ? "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/10 hover:shadow-rose-500/30"
                                : isVIP
                                  ? "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/10 hover:shadow-amber-500/30"
                                  : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white"
                        )}
                      >
                        {isBooked ? <X className="w-4 h-4" /> : seat.column}
                        {isVIP && !isSelected && !isBooked && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-amber-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <span className="w-8 text-center text-sm font-black text-neutral-500">{rowLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Summary */}
      <div className="w-full lg:w-[480px] space-y-6">
        <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 p-8 shadow-2xl sticky top-24 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="space-y-6 mb-8 relative z-10">
            <h2 className="text-3xl font-black text-white italic leading-tight uppercase tracking-tighter group-hover:text-green-500 transition-colors">
              {movie?.nameMovie}
            </h2>
            <div className="space-y-3 text-base text-neutral-400 font-medium">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-500" />
                <span>
                  {showtime && format(new Date(showtime.showTime), 'HH:mm')} — {showtime && format(new Date(showtime.showTime), 'EEEE, dd/MM', { locale: vi })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-500" />
                <span>Aireak Cinema — {showtime?.idRoom}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-8 space-y-6 relative z-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 bg-neutral-800/50 px-4 py-2 rounded-lg w-fit">
              CHI TIẾT ĐƠN HÀNG
            </h3>
            
            <div className="space-y-6">
              {selectedSeats.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map(s => (
                      <span key={s.id} className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-black italic text-sm">
                        {s.row}{s.column}
                      </span>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-dashed border-neutral-800 flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-xs text-neutral-500 font-black uppercase tracking-widest">Tổng cộng</span>
                      <div className="text-4xl font-black text-green-500 italic tracking-tighter">
                        {calculateTotal().toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-600">
                    <TicketIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-neutral-500 font-bold italic">
                    Vui lòng chọn ghế để tiếp tục
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            disabled={selectedSeats.length === 0 || isLoading}
            onClick={handleBooking}
            className="w-full mt-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/10 active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận đặt vé'}
          </button>
        </div>
      </div>
      </div>
    ) : (
      /* Step 2: Success UI */
        <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Đặt vé thành công!</h1>
            <p className="text-neutral-400">Cảm ơn bạn đã lựa chọn Aireak Cinema. Chúc bạn có những phút giây xem phim vui vẻ!</p>
          </div>

          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-neutral-800 bg-gradient-to-r from-green-500/5 to-transparent">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-40 aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-neutral-800 flex-shrink-0">
                  <img 
                    src={movie?.image} 
                    alt={movie?.nameMovie} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">{movie?.nameMovie}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-green-500" /> {movie?.duration} phút</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-500" /> Aireak Cinema - {showtime?.idRoom}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 p-6 bg-neutral-800/30 rounded-2xl border border-neutral-700/50">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Ngày chiếu</span>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Calendar className="w-4 h-4 text-green-500" />
                        {showtime && format(new Date(showtime.showTime), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Giờ chiếu</span>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Clock className="w-4 h-4 text-green-500" />
                        {showtime && format(new Date(showtime.showTime), 'HH:mm')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Ghế đã chọn</span>
                      <div className="flex items-center gap-2 text-green-500 font-black italic">
                        <TicketIcon className="w-4 h-4" />
                        {bookingResult?.tickets.map(t => t.seatCode).join(', ')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Mã hóa đơn</span>
                      <div className="text-white font-mono text-sm">#{bookingResult?.bill.idBill.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="pt-6 border-t border-dashed border-neutral-800 flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Tổng tiền thanh toán</span>
                  <div className="text-4xl font-black text-green-500 italic tracking-tighter">
                    {bookingResult?.bill.totalAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black italic uppercase tracking-widest text-center shadow-lg shadow-green-600/20 transition-all"
            >
              Quay lại trang chủ
            </button>
           
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
