
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/ai.service';
import { bookingService } from '../services/ticket.service';
import { type ChatMessage, type MovieSummaryDTO } from '../types';

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
  const safeText = text || '';
  const lines = safeText.split('\n');
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
      elements.push(<br key={`br-${i}`} />);
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
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: codeProcessed }}
      />
    );
  }

  return elements;
}

function MovieListCard({ movies }: { movies: MovieSummaryDTO[] }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2 my-2">
      <p className="text-sm text-neutral-300 font-medium">Danh sách phim tìm thấy:</p>
      {movies.map((movie) => (
        <button
          key={movie.id}
          onClick={() => navigate(`/movie/${movie.id}`)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-700/50 hover:bg-neutral-700 border border-neutral-600 rounded-lg transition-all group"
        >
          <span className="text-sm text-neutral-200 group-hover:text-white truncate">
            {movie.title}
          </span>
          <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-green-500 flex-shrink-0 ml-2" />
        </button>
      ))}
    </div>
  );
}

function BookingActionCard() {
  const { user } = useAuth();
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      setBookingLoading(true);
      setBookingError(null);
      const idShowtime = "Showtime_03defed4-6a63-43e8-b6bf-51c62fb8961e";
      
      // Get available seats dynamically to avoid "already booked" errors
      const seatStatuses = await bookingService.getSeatStatuses(idShowtime);
      const availableSeats = seatStatuses
        .filter(s => s.status === 'AVAILABLE')
        .map(s => s.seatCode);
        
      if (availableSeats.length < 2) {
        setBookingError('Không đủ ghế trống cho suất chiếu này. Hãy thử hủy vé cũ.');
        return;
      }
      
      const seatCodes = [availableSeats[0], availableSeats[1]];
      const response = await bookingService.bookTickets({ idShowtime, seatCodes });
      const vnpayRes = await bookingService.getPaymentUrl(response.bill.idBill);
      window.location.href = vnpayRes.paymentUrl;
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Không thể khởi tạo thanh toán.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
      <div className="text-xs text-neutral-400 space-y-1 text-left">
        <p>🎬 Phim: <strong className="text-white">Inception</strong></p>
        <p>🕒 Suất chiếu: <strong className="text-white">18:00 - 2026-05-26</strong></p>
        <p>📍 Phòng: <strong className="text-white">Phòng 1</strong></p>
        <p>🎫 Số lượng: <strong className="text-white">2 Ghế Thường (STANDARD)</strong></p>
        <p>💰 Tổng tiền: <strong className="text-emerald-400 font-bold">200,000 VND</strong></p>
      </div>
      
      {bookingError && (
        <p className="text-xs text-red-500 font-medium text-left">{bookingError}</p>
      )}

      <button
        onClick={handlePay}
        disabled={bookingLoading}
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg text-xs font-black italic uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-white"
      >
        {bookingLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          'Thanh toán VNPay Sandbox'
        )}
      </button>
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
    const isBookingQuery = 
      lowerInput.includes('đặt vé') || 
      lowerInput.includes('dat ve') || 
      lowerInput.includes('mua vé') || 
      lowerInput.includes('mua ve') ||
      lowerInput.includes('cách đặt') ||
      lowerInput.includes('cach dat') ||
      lowerInput.includes('đặt vé xem phim');

    if (isBookingQuery) {
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Chào bạn! Dưới đây là **quy trình đặt vé xem phim** chi tiết trên website của chúng tôi:\n` +
                   `1. **Chọn phim**: Tìm kiếm và chọn bộ phim bạn yêu thích tại danh sách phim ở trang chủ.\n` +
                   `2. **Chọn suất chiếu**: Nhấn nút **"Mua vé"** để xem thông tin chi tiết phim và bấm chọn suất chiếu (ngày giờ) phù hợp.\n` +
                   `3. **Chọn ghế ngồi**: Tại giao diện phòng chiếu, click chọn các vị trí ghế mong muốn trên sơ đồ (ghế màu xanh).\n` +
                   `4. **Xác nhận đặt vé**: Nhấn nút **"Xác nhận đặt vé"** ở cuối trang để hệ thống khởi tạo hóa đơn tạm thời.\n` +
                   `5. **Thanh toán qua VNPay**: Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán **VNPay Sandbox**. Tại đây, bạn chọn ngân hàng phát hành (VD: NCB), nhập thông tin thẻ test và xác nhận thanh toán. Hệ thống sẽ tự động đưa bạn về trang kết quả hóa đơn thành công.\n` +
                   `---\n` +
                   `**Lối tắt đặt vé nhanh**:\n` +
                   `Nếu bạn muốn thử nghiệm thanh toán ngay cho suất chiếu thử nghiệm của phim **Inside Out 2** (18:00 - Phòng 1), bạn có thể click nút dưới đây để chuyển hướng thẳng đến cổng thanh toán VNPay Sandbox:`,
          timestamp: new Date().toISOString(),
          type: 'BOOKING_ACTION',
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

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer || '',
        timestamp: response.timestamp || new Date().toISOString(),
        type: response.type,
        data: response.data,
      };

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
    <div className="fixed bottom-24 right-6 z-[150] w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
      <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex space-x-2 max-w-[85%] ${
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
              <div>
                <div
                  className={`px-3 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-tr-md'
                      : 'bg-neutral-800 text-neutral-200 rounded-tl-md border border-neutral-700'
                  }`}
                >
                  {msg.role === 'assistant' && msg.type === 'MOVIE_LIST' && msg.data ? (
                    <MovieListCard movies={msg.data} />
                  ) : msg.role === 'assistant' && msg.type === 'BOOKING_ACTION' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      {renderMarkdown(msg.content)}
                      <BookingActionCard />
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      {renderMarkdown(msg.content)}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
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
            className="flex-grow px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all disabled:opacity-50"
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