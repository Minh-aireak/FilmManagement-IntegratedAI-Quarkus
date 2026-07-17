import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Loader2, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import { bookingService } from '../services/ticket.service';
import { authService } from '../services/auth.service';
import { type Bill } from '../types';
import { useToast } from '../components/Toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCache } from '../context/CacheContext';

const History: React.FC = () => {
  const { historyCache, setHistoryCache } = useCache();
  const [bills, setBills] = useState<Bill[]>(historyCache || []);
  const [isLoading, setIsLoading] = useState(!historyCache);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (user?.token) {
      fetchHistory();
    }
  }, [user?.token]); // Chỉ phụ thuộc vào token thay vì cả object user

  const fetchHistory = async () => {
    // Nếu đã có cache thì không hiện loading toàn trang
    if (historyCache && bills.length > 0) {
      setIsLoading(false);
    }

    try {
      if (!historyCache) setIsLoading(true);
      const data = await bookingService.getHistory();
      const sortedBills = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBills(sortedBills);
      setHistoryCache(sortedBills);
    } catch (err: any) {
      showToast('Không thể tải lịch sử đặt vé.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (idBill: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy vé này? Thao tác này không thể hoàn tác.')) {
      try {
        await bookingService.cancelBooking(idBill);
        showToast('Hủy vé thành công!', 'success');
        setHistoryCache(null); // Xóa cache để fetch lại
        fetchHistory(); // Tải lại danh sách
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Hủy vé thất bại.', 'error');
      }
    }
  };

  // Chỉ hiện loading toàn trang khi lần đầu tải và chưa có dữ liệu
  if (isLoading && bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
        <p className="mt-4 text-neutral-400 font-bold tracking-widest uppercase italic">Đang tải lịch sử giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Lịch sử đặt vé</h1>
        <p className="text-neutral-400 mt-2">Xem lại các giao dịch và thông tin vé đã đặt của bạn</p>
      </div>

      <div className="relative min-h-[400px]">
        {/* Loading overlay khi làm mới dữ liệu (như sau khi hủy vé) */}
        {isLoading && bills.length > 0 && (
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              <p className="text-white font-bold text-sm tracking-widest uppercase italic">Đang tải...</p>
            </div>
          </div>
        )}

        <div className={`space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
          {bills.length > 0 ? (
          bills.map((bill) => (
            <div key={bill.idBill} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden hover:border-neutral-700 transition-all shadow-xl">
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Bill Info */}
                  <div className="space-y-4 flex-grow w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono text-neutral-500 uppercase">Mã đơn: {bill.idBill}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>Ngày đặt: {format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                    </div>
                  </div>

                  {/* Price - Centered vertically */}
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-green-500 flex items-center gap-2 whitespace-nowrap">
                      <CreditCard className="w-4 h-4" />
                      {bill.totalAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6">
                    <button
                      onClick={() => navigate(`/bill-detail/${bill.idBill}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-sm font-bold rounded-lg transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Chi tiết
                    </button>
                    <button
                      onClick={() => handleCancel(bill.idBill)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Hủy vé
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-neutral-900 rounded-2xl border border-dashed border-neutral-800 p-16 text-center">
            <Ticket className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
            <p className="text-neutral-500 italic">Bạn chưa có giao dịch đặt vé nào.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
            >
              Đặt vé ngay
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default History;
