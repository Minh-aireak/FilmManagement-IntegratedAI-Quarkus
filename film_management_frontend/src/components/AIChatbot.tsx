
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, ExternalLink, Check, Ban, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/ai.service';
import { bookingService } from '../services/ticket.service';
import { movieService } from '../services/movie.service';
import {
  type BookingChatData,
  type BookingIntentDTO,
  type ChatMessage,
  type MovieSummaryDTO,
  type SeatStatusDTO,
  type Showtime,
} from '../types';

type ChatStatus = 'closed' | 'open' | 'loading';

interface ChatContext {
  currentPage?: string;
  movieId?: string;
  showtimeId?: string;
}

function detectContext(pathname: string): ChatContext {
  const movieMatch = pathname.match(/^\/movie\/(.+)$/);
  if (movieMatch) {
    return { currentPage: 'MOVIE_DETAIL', movieId: movieMatch[1] };
  }

  const seatMatch = pathname.match(/^\/seat-selection\/(.+)$/);
  if (seatMatch) {
    return { currentPage: 'BOOKING', showtimeId: seatMatch[1] };
  }

  if (pathname.startsWith('/admin')) {
    return { currentPage: 'ADMIN' };
  }

  return { currentPage: 'OTHER' };
}

function formatTimestamp(date: Date): string {
  if (isNaN(date.getTime())) return '--:--';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function renderMarkdown(text: string | undefined | null): React.ReactNode[] {
  const safeText = (text || '').trim();
  const lines = safeText.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${codeKey++}`} className="bg-neutral-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs my-2">
            <code>{codeContent}</code>
          </pre>
        );
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    // Bold: **text**
    const boldProcessed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    const italicProcessed = boldProcessed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code: `text`
    const codeProcessed = italicProcessed.replace(/`(.+?)`/g, '<code class="bg-neutral-800 text-green-400 px-1 rounded text-xs">$1</code>');

    elements.push(
      <p
        key={`p-${i}`}
        className="!my-1 text-sm leading-relaxed break-words [overflow-wrap:anywhere]"
        dangerouslySetInnerHTML={{ __html: codeProcessed }}
      />
    );
  }

  return elements;
}

function MovieListCard({ movies }: { movies: MovieSummaryDTO[] }) {
  const navigate = useNavigate();

  return (
    <div className="w-full min-w-0 max-w-full space-y-2 my-2 overflow-hidden">
      <p className="text-sm text-neutral-300 font-medium">
        Danh sách phim tìm thấy <span className="text-neutral-500">({movies.length})</span>
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {movies.map((movie) => (
          <button
            key={movie.id}
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="w-full min-w-0 max-w-full flex items-start gap-2 overflow-hidden px-3 py-2.5 bg-neutral-700/50 hover:bg-neutral-700 border border-neutral-600 rounded-lg transition-all group"
          >
            <span className="min-w-0 flex-1 text-left text-sm leading-snug text-neutral-200 group-hover:text-white line-clamp-2 break-words [overflow-wrap:anywhere]">
              {movie.title}
            </span>
            <ExternalLink className="w-4 h-4 mt-0.5 text-neutral-500 group-hover:text-green-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function MovieDetailLinkCard({ movie }: { movie: MovieSummaryDTO }) {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="mt-3 flex w-full min-w-0 items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-left transition-colors hover:bg-green-500/20"
    >
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-green-400 [overflow-wrap:anywhere]">
        Xem chi tiết phim {movie.title}
      </span>
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-green-500" />
    </Link>
  );
}

const SEAT_TYPE_LABEL: Record<SeatStatusDTO['typeSeat'], string> = {
  VIP: 'VIP',
  STANDARD: 'Thường',
  COUPLE: 'Couple',
};

function parseSeatCode(seatCode: string) {
  const match = seatCode.trim().match(/^([A-Za-z]+)(\d+)$/);
  return match
    ? { row: match[1].toUpperCase(), column: Number(match[2]) }
    : { row: seatCode.toUpperCase(), column: Number.MAX_SAFE_INTEGER };
}

function timeToMinutes(time: string | undefined, fallback: number) {
  if (!time) return fallback;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeSeatPriority(priority: string | undefined): SeatStatusDTO['typeSeat'][] {
  const allowed: SeatStatusDTO['typeSeat'][] = ['VIP', 'STANDARD', 'COUPLE'];
  const requested = (priority || 'VIP,STANDARD,COUPLE')
    .toUpperCase()
    .replaceAll('TRIPLE', 'COUPLE')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is SeatStatusDTO['typeSeat'] => allowed.includes(value as SeatStatusDTO['typeSeat']));
  return [...new Set([...requested, ...allowed])];
}

function selectBestSeats(
  seats: SeatStatusDTO[],
  count: number,
  priority: SeatStatusDTO['typeSeat'][],
  preferCenter: boolean,
): SeatStatusDTO[] {
  const available = seats.filter((seat) => seat.status === 'AVAILABLE');
  const rows = [...new Set(seats.map((seat) => parseSeatCode(seat.seatCode).row))].sort();
  const rowCenter = (rows.length - 1) / 2;
  const maxColumnByRow = new Map<string, number>();
  seats.forEach((seat) => {
    const parsed = parseSeatCode(seat.seatCode);
    maxColumnByRow.set(parsed.row, Math.max(maxColumnByRow.get(parsed.row) || 0, parsed.column));
  });

  const centerScore = (group: SeatStatusDTO[]) => {
    if (!preferCenter) return 0;
    const parsed = group.map((seat) => parseSeatCode(seat.seatCode));
    const rowIndex = rows.indexOf(parsed[0].row);
    const averageColumn = parsed.reduce((sum, seat) => sum + seat.column, 0) / parsed.length;
    const columnCenter = ((maxColumnByRow.get(parsed[0].row) || 1) + 1) / 2;
    return Math.abs(rowIndex - rowCenter) * 2 + Math.abs(averageColumn - columnCenter);
  };

  for (const type of priority) {
    const typeSeats = available
      .filter((seat) => seat.typeSeat === type)
      .sort((a, b) => {
        const first = parseSeatCode(a.seatCode);
        const second = parseSeatCode(b.seatCode);
        return first.row.localeCompare(second.row) || first.column - second.column;
      });

    const groups: SeatStatusDTO[][] = [];
    const byRow = new Map<string, SeatStatusDTO[]>();
    typeSeats.forEach((seat) => {
      const row = parseSeatCode(seat.seatCode).row;
      byRow.set(row, [...(byRow.get(row) || []), seat]);
    });
    byRow.forEach((rowSeats) => {
      for (let index = 0; index <= rowSeats.length - count; index++) {
        const candidate = rowSeats.slice(index, index + count);
        const columns = candidate.map((seat) => parseSeatCode(seat.seatCode).column);
        if (columns.every((column, offset) => offset === 0 || column === columns[offset - 1] + 1)) {
          groups.push(candidate);
        }
      }
    });

    if (groups.length > 0) {
      return groups.sort((a, b) => centerScore(a) - centerScore(b))[0];
    }

    if (typeSeats.length >= count) {
      return [...typeSeats].sort((a, b) => centerScore([a]) - centerScore([b])).slice(0, count);
    }
  }

  return [];
}

async function resolveBookingPreview(intent: BookingIntentDTO): Promise<BookingChatData> {
  const showtimePage = await movieService.getAllShowtimes(
    0,
    100,
    'upcoming',
    undefined,
    intent.showingDate,
    undefined,
    intent.movieTitle,
  );
  const startMinutes = timeToMinutes(intent.startTime, 0);
  const endMinutes = timeToMinutes(intent.endTime, 23 * 60 + 59);
  const normalizedTitle = intent.movieTitle.trim().toLocaleLowerCase('vi-VN');
  const candidates = showtimePage.data
    .filter((showtime: Showtime) => showtime.movieName?.toLocaleLowerCase('vi-VN').includes(normalizedTitle))
    .filter((showtime: Showtime) => {
      const date = new Date(showtime.showTime);
      const minutes = date.getHours() * 60 + date.getMinutes();
      return minutes >= startMinutes && minutes <= endMinutes;
    })
    .sort((first: Showtime, second: Showtime) => {
      const firstDate = new Date(first.showTime);
      const secondDate = new Date(second.showTime);
      const firstDistance = Math.abs(firstDate.getHours() * 60 + firstDate.getMinutes() - startMinutes);
      const secondDistance = Math.abs(secondDate.getHours() * 60 + secondDate.getMinutes() - startMinutes);
      return firstDistance - secondDistance;
    });

  if (candidates.length === 0) {
    throw new Error(`Không có suất chiếu phim ${intent.movieTitle} trong khoảng giờ bạn yêu cầu.`);
  }

  const priority = normalizeSeatPriority(intent.seatPriority);
  for (const showtime of candidates) {
    const seatMap = await bookingService.getSeatStatuses(showtime.idShowtime);
    const selectedSeats = selectBestSeats(
      seatMap,
      Math.max(1, intent.seatCount || 1),
      priority,
      intent.preferCenter !== false,
    );
    if (selectedSeats.length === Math.max(1, intent.seatCount || 1)) {
      return {
        movieTitle: showtime.movieName || intent.movieTitle,
        idShowtime: showtime.idShowtime,
        idRoom: showtime.idRoom,
        showTime: showtime.showTime,
        selectedSeats,
        seatMap,
        totalAmount: selectedSeats.reduce((total, seat) => total + seat.price, 0),
        status: 'PREVIEW',
      };
    }
  }

  throw new Error(`Các suất chiếu phù hợp hiện không còn đủ ${intent.seatCount || 1} ghế theo ưu tiên của bạn.`);
}

function SeatMapPreview({ booking }: { booking: BookingChatData }) {
  const selectedCodes = new Set(booking.selectedSeats.map((seat) => seat.seatCode));
  const rows = [...new Set(booking.seatMap.map((seat) => parseSeatCode(seat.seatCode).row))].sort();

  return (
    <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-950/70 p-2" aria-label="Sơ đồ ghế đã chọn">
      <div className="mx-auto mb-3 h-1.5 w-4/5 rounded-b-full bg-green-500/70 shadow-[0_4px_12px_rgba(34,197,94,0.35)]" />
      <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-500">Màn hình</p>
      <div className="max-w-full space-y-1 overflow-x-auto pb-1">
        {rows.map((row) => (
          <div key={row} className="flex min-w-max items-center justify-center gap-1">
            <span className="w-4 text-[9px] font-bold text-neutral-500">{row}</span>
            {booking.seatMap
              .filter((seat) => parseSeatCode(seat.seatCode).row === row)
              .sort((a, b) => parseSeatCode(a.seatCode).column - parseSeatCode(b.seatCode).column)
              .map((seat) => {
                const selected = selectedCodes.has(seat.seatCode);
                const booked = seat.status === 'BOOKED' && !selected;
                return (
                  <span
                    key={seat.seatCode}
                    title={`${seat.seatCode} - ${SEAT_TYPE_LABEL[seat.typeSeat]}`}
                    className={`flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold ${
                      selected
                        ? 'bg-green-500 text-white ring-2 ring-green-300/60'
                        : booked
                          ? 'bg-neutral-800 text-neutral-600'
                          : seat.typeSeat === 'VIP'
                            ? 'bg-amber-500/80 text-white'
                            : seat.typeSeat === 'COUPLE'
                              ? 'bg-rose-500/80 text-white'
                              : 'bg-zinc-600 text-zinc-200'
                    }`}
                  >
                    {booked ? '×' : parseSeatCode(seat.seatCode).column}
                  </span>
                );
              })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-green-400">
        Ghế của bạn: {booking.selectedSeats.map((seat) => seat.seatCode).join(', ')}
      </p>
    </div>
  );
}

interface BookingCardProps {
  booking: BookingChatData;
  active?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function BookingCard({ booking, active = false, onConfirm, onCancel }: BookingCardProps) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const showtime = new Date(booking.showTime);

  const handlePayment = async () => {
    if (!booking.billId) return;
    try {
      setPaymentLoading(true);
      const result = await bookingService.getPaymentUrl(booking.billId);
      window.location.href = result.paymentUrl;
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="mt-2 w-full min-w-0 space-y-3 rounded-xl border border-neutral-700 bg-neutral-900/80 p-3">
      <div className="space-y-1 text-xs text-neutral-300">
        <p><strong className="text-white">Phim:</strong> {booking.movieTitle}</p>
        <p><strong className="text-white">Suất:</strong> {showtime.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        <p><strong className="text-white">Phòng:</strong> {booking.idRoom}</p>
        <p><strong className="text-white">Ghế:</strong> {booking.selectedSeats.map((seat) => `${seat.seatCode} (${SEAT_TYPE_LABEL[seat.typeSeat]})`).join(', ')}</p>
        <p><strong className="text-white">Tổng tiền:</strong> <span className="font-bold text-green-400">{booking.totalAmount.toLocaleString('vi-VN')}đ</span></p>
        {booking.billId && <p><strong className="text-white">Mã hóa đơn:</strong> {booking.billId}</p>}
      </div>

      <SeatMapPreview booking={booking} />

      {booking.status === 'PREVIEW' && (
        <>
          <p className="text-xs font-medium text-amber-300">Bạn có đồng ý đặt vé với thông tin trên không?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCancel}
              disabled={!active}
              className="flex items-center justify-center gap-1 rounded-lg bg-neutral-700 px-2 py-2 text-xs font-bold text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ban className="h-3.5 w-3.5" /> Không
            </button>
            <button
              onClick={onConfirm}
              disabled={!active}
              className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> Đồng ý đặt
            </button>
          </div>
        </>
      )}

      {booking.status === 'CONFIRMED' && booking.billId && (
        <button
          onClick={handlePayment}
          disabled={paymentLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Thanh toán vé
        </button>
      )}
    </div>
  );
}

const AIChatbot: React.FC = () => {
  const [status, setStatus] = useState<ChatStatus>('closed');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của Aireak Cinema. Tôi có thể giúp bạn tìm phim, gợi ý phim hay, hoặc hướng dẫn đặt vé. Bạn cần hỗ trợ gì?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<BookingChatData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (status === 'open') {
      inputRef.current?.focus();
    }
  }, [status]);

  const confirmBooking = async (booking: BookingChatData, appendUserMessage: boolean) => {
    if (status === 'loading') return;
    if (appendUserMessage) {
      setMessages((prev) => [...prev, {
        id: `user-confirm-${Date.now()}`,
        role: 'user',
        content: 'Đồng ý đặt vé',
        timestamp: new Date().toISOString(),
      }]);
    }
    setStatus('loading');
    setError(null);

    if (!user?.token) {
      setMessages((prev) => [...prev, {
        id: `assistant-login-${Date.now()}`,
        role: 'assistant',
        content: 'Bạn cần đăng nhập trước khi xác nhận đặt vé. Chưa có vé hoặc hóa đơn nào được tạo.',
        timestamp: new Date().toISOString(),
        type: 'TEXT',
      }]);
      setStatus('open');
      return;
    }

    try {
      const result = await bookingService.bookTickets({
        idShowtime: booking.idShowtime,
        seatCodes: booking.selectedSeats.map((seat) => seat.seatCode),
      });
      const selectedCodes = new Set(booking.selectedSeats.map((seat) => seat.seatCode));
      const confirmed: BookingChatData = {
        ...booking,
        status: 'CONFIRMED',
        billId: result.bill.idBill,
        totalAmount: result.bill.totalAmount,
        seatMap: booking.seatMap.map((seat) => selectedCodes.has(seat.seatCode)
          ? { ...seat, status: 'BOOKED' }
          : seat),
      };
      setPendingBooking(null);
      setConversationId(undefined);
      setMessages((prev) => [...prev, {
        id: `assistant-booked-${Date.now()}`,
        role: 'assistant',
        content: 'Đặt vé thành công. Đây là thông tin vé và vị trí ghế của bạn:',
        timestamp: new Date().toISOString(),
        type: 'BOOKING_CONFIRMED',
        booking: confirmed,
      }]);
    } catch (bookingError: unknown) {
      setPendingBooking(null);
      setConversationId(undefined);
      const message = bookingError instanceof Error
        ? bookingError.message
        : 'Không thể đặt vé vì ghế vừa được người khác chọn. Bạn vui lòng yêu cầu lại để mình tìm ghế mới.';
      setMessages((prev) => [...prev, {
        id: `assistant-booking-error-${Date.now()}`,
        role: 'assistant',
        content: `Chưa tạo được vé: ${message}`,
        timestamp: new Date().toISOString(),
        type: 'TEXT',
      }]);
    } finally {
      setStatus('open');
    }
  };

  const cancelBooking = (booking: BookingChatData, appendUserMessage: boolean) => {
    if (appendUserMessage) {
      setMessages((prev) => [...prev, {
        id: `user-cancel-${Date.now()}`,
        role: 'user',
        content: 'Không đặt vé',
        timestamp: new Date().toISOString(),
      }]);
    }
    if (pendingBooking?.idShowtime === booking.idShowtime) {
      setPendingBooking(null);
    }
    setConversationId(undefined);
    setMessages((prev) => [...prev, {
      id: `assistant-cancel-${Date.now()}`,
      role: 'assistant',
      content: 'Đã hủy yêu cầu. Không có vé hoặc hóa đơn nào được tạo.',
      timestamp: new Date().toISOString(),
      type: 'TEXT',
    }]);
    setStatus('open');
  };



  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || status === 'loading') return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStatus('loading');
    setError(null);

    const lowerInput = trimmedInput.toLowerCase();
    const isBookingConfirmation = /^(đồng ý|dong y|ok|okay|xác nhận|xac nhan|đặt đi|dat di)$/i.test(trimmedInput);
    const isBookingRejection = /^(không|khong|không đặt|khong dat|hủy|huy|bỏ qua|bo qua)$/i.test(trimmedInput);

    if (pendingBooking && isBookingConfirmation) {
      await confirmBooking(pendingBooking, false);
      return;
    }

    if (pendingBooking && isBookingRejection) {
      cancelBooking(pendingBooking, false);
      return;
    }

    const isBookingGuideQuery =
      lowerInput.includes('cách đặt') ||
      lowerInput.includes('cach dat') ||
      lowerInput.includes('hướng dẫn đặt') ||
      lowerInput.includes('huong dan dat') ||
      ['đặt vé', 'dat ve', 'mua vé', 'mua ve'].includes(lowerInput.trim());

    if (isBookingGuideQuery) {
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Chào bạn! Dưới đây là **quy trình đặt vé xem phim** chi tiết trên website của chúng tôi:\n` +
                   `1. **Chọn phim**: Tìm kiếm và chọn bộ phim bạn yêu thích tại danh sách phim ở trang chủ.\n` +
                   `2. **Chọn suất chiếu**: Nhấn nút **"Mua vé"** để xem thông tin chi tiết phim và bấm chọn suất chiếu (ngày giờ) phù hợp.\n` +
                   `3. **Chọn ghế ngồi**: Tại giao diện phòng chiếu, click chọn các vị trí ghế mong muốn trên sơ đồ (ghế màu xanh).\n` +
                   `4. **Xác nhận đặt vé**: Nhấn nút **"Xác nhận đặt vé"** ở cuối trang để hệ thống khởi tạo hóa đơn tạm thời.\n` +
                   `5. **Thanh toán**: Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán. Sau khi xác nhận thanh toán, hệ thống sẽ tự động đưa bạn về trang kết quả hóa đơn thành công.`,
          timestamp: new Date().toISOString(),
          type: 'TEXT',
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStatus('open');
      }, 700);
      return;
    }

    const context = detectContext(location.pathname);

    try {
      const response = await aiService.sendMessage({
        conversationId,
        message: trimmedInput,
        context: {
          userId: user?.nameDisplay || undefined,
          currentPage: context.currentPage,
          movieId: context.movieId,
          showtimeId: context.showtimeId,
        },
      });

      let assistantMessage: ChatMessage;
      if (response.type === 'BOOKING_REQUEST' && response.booking) {
        try {
          const preview = await resolveBookingPreview(response.booking);
          setPendingBooking(preview);
          assistantMessage = {
            id: `assistant-booking-preview-${Date.now()}`,
            role: 'assistant',
            content: 'Mình đã tìm suất chiếu và chọn ghế còn trống phù hợp nhất. Đây mới là vé dự kiến, hệ thống **chưa đặt vé**:',
            timestamp: response.timestamp || new Date().toISOString(),
            type: 'BOOKING_PREVIEW',
            booking: preview,
          };
        } catch (previewError: unknown) {
          setPendingBooking(null);
          assistantMessage = {
            id: `assistant-booking-unavailable-${Date.now()}`,
            role: 'assistant',
            content: previewError instanceof Error
              ? previewError.message
              : 'Không tìm thấy suất chiếu hoặc ghế phù hợp với yêu cầu của bạn.',
            timestamp: response.timestamp || new Date().toISOString(),
            type: 'TEXT',
          };
        }
      } else {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer || '',
          timestamp: response.timestamp || new Date().toISOString(),
          type: response.type === 'BOOKING_REQUEST' ? 'TEXT' : response.type,
          data: response.data,
        };
      }

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(response.conversationId);
      setStatus('open');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Không thể kết nối đến AI. Vui lòng thử lại sau.';
      setError(errorMessage);
      setStatus('open');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => {
    setStatus((prev) => (prev === 'closed' ? 'open' : 'closed'));
    setError(null);
  };

  if (status === 'closed') {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-600/30 transition-all hover:scale-110 active:scale-95"
        aria-label="Mở chat AI"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-[150] w-[28rem] max-w-[calc(100vw-2rem)] h-[35rem] max-h-[calc(100vh-8rem)] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700 bg-neutral-800/50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Assistant</h3>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-500 font-medium">Đang hoạt động</span>
            </div>
          </div>
        </div>
        <button
          onClick={toggleChat}
          className="p-1.5 hover:bg-neutral-700 rounded-lg transition-colors"
          aria-label="Đóng chat"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="min-w-0 flex-grow overflow-x-hidden overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex min-w-0 max-w-[90%] space-x-2 ${
                msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-green-600/20 border border-green-500/30'
                    : 'bg-neutral-700 border border-neutral-600'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-green-500" />
                ) : (
                  <Bot className="w-4 h-4 text-neutral-300" />
                )}
              </div>
              <div className="min-w-0 max-w-full">
                <div
                  className={`min-w-0 max-w-full overflow-hidden px-3 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-tr-md'
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-md border border-neutral-700'
                  }`}
                >
                  {msg.role === 'assistant' && msg.type === 'MOVIE_LIST' && msg.data ? (
                    <MovieListCard movies={msg.data} />
                  ) : msg.role === 'assistant' && msg.type === 'MOVIE_DETAIL' && msg.data?.[0] ? (
                    <div className="prose prose-invert prose-sm min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                      {renderMarkdown(msg.content)}
                      <MovieDetailLinkCard movie={msg.data[0]} />
                    </div>
                  ) : msg.role === 'assistant' &&
                      (msg.type === 'BOOKING_PREVIEW' || msg.type === 'BOOKING_CONFIRMED') &&
                      msg.booking ? (
                    <div className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                      <div className="prose prose-invert prose-sm min-w-0 max-w-full">
                        {renderMarkdown(msg.content)}
                      </div>
                      <BookingCard
                        booking={msg.booking}
                        active={pendingBooking === msg.booking}
                        onConfirm={() => confirmBooking(msg.booking!, true)}
                        onCancel={() => cancelBooking(msg.booking!, true)}
                      />
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                      {renderMarkdown(msg.content)}
                    </div>
                  ) : (
                    <p className="text-sm break-words [overflow-wrap:anywhere]">{msg.content}</p>
                  )}
                </div>
                <p
                  className={`text-[10px] text-neutral-500 mt-1 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {formatTimestamp(new Date(msg.timestamp))}
                </p>
              </div>
            </div>
          </div>
        ))}

        {status === 'loading' && (
          <div className="flex justify-start">
            <div className="flex space-x-2 max-w-[85%]">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-neutral-300" />
              </div>
              <div className="px-3 py-2 rounded-2xl bg-neutral-800 border border-neutral-700 rounded-tl-md">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  <span className="text-sm text-neutral-400">Đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-700 bg-neutral-800/50">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={status === 'loading'}
            className="min-w-0 flex-grow px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === 'loading'}
            className="p-2.5 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-xl transition-all"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
