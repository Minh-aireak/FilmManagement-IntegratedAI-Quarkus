import React, { useEffect, useState } from 'react';
import { Search, Calendar, User, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { bookingService } from '../services/ticket.service';
import { type AdminBillResponse } from '../types';
import { useToast } from '../components/Toast';
import { useCache } from '../context/CacheContext';

const AdminBookings: React.FC = () => {
  const { adminBookingsCache, setAdminBookingsCache } = useCache();
  const [bills, setBills] = useState<AdminBillResponse[]>(adminBookingsCache?.bills || []);
  const [isLoading, setIsLoading] = useState(!adminBookingsCache);
  const [searchTerm, setSearchTerm] = useState(adminBookingsCache?.searchTerm || '');
  const [currentPage, setCurrentPage] = useState(adminBookingsCache?.page || 0);
  const [totalPages, setTotalPages] = useState(adminBookingsCache?.totalPages || 0);
  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, [currentPage, searchTerm]);

  const fetchInitialData = async () => {
    if (adminBookingsCache && 
        currentPage === adminBookingsCache.page && 
        searchTerm === adminBookingsCache.searchTerm &&
        bills.length > 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const pageBillsResponse = await bookingService.getAllBills(currentPage, 6, searchTerm);

      const newBills = pageBillsResponse.data || [];
      const newTotalPages = pageBillsResponse.totalPages || 1;

      setBills(newBills);
      setTotalPages(newTotalPages);

      // Cập nhật cache
      setAdminBookingsCache({
        bills: newBills,
        page: currentPage,
        totalPages: newTotalPages,
        searchTerm: searchTerm
      });
    } catch (err: any) {
      showToast('Không thể tải dữ liệu đặt vé.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Since filtering is now handled by the server, we don't need additional client-side filtering
  const displayBills = bills;

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-green-500" /> Quản lý hóa đơn vé
          </h1>
        </div>
      </div>

      <div className="bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800">
        <div className="space-y-2 max-w-md">
          <label className="text-xs font-bold text-neutral-500 uppercase ml-1 flex items-center gap-2">
            <Search className="w-3 h-3" /> Tìm kiếm hóa đơn
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Nhập mã hóa đơn hoặc ID khách hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
                setAdminBookingsCache(null);
              }}
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-[400px]">
        <div className={`space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
          {displayBills.map((bill) => {
          const showtimeInfo = bill.showTime ? new Date(bill.showTime).toLocaleString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          }) : 'N/A';

          return (
            <div key={bill.idBill} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 hover:border-neutral-700 transition-all shadow-xl">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-grow space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 font-bold uppercase">Khách hàng ID</p>
                        <p className="text-white font-mono">{bill.idAccount}</p>
                      </div>
                    </div>

                    <div className="px-4 py-2 bg-neutral-800 rounded-xl border border-neutral-700">
                      <p className="text-xs text-neutral-500 font-bold uppercase">Phim & Suất chiếu</p>
                      <p className="text-sm text-white font-semibold">
                        {bill.movieName} <span className="text-green-500 ml-2">({showtimeInfo})</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-neutral-500 font-bold uppercase">Mã hóa đơn</p>
                      <p className="text-green-500 font-mono font-bold">{bill.idBill}</p>
                    </div>
                  </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Thời gian đặt</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-200">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      {new Date(bill.createdAt).toLocaleString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Tổng tiền</p>
                    <div className="flex items-center gap-2 text-base font-bold text-green-500">
                      <CreditCard className="w-4.5 h-4.5" />
                      {bill.totalAmount.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div className="space-y-1 text-right md:text-left">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Số lượng vé</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-200 justify-end md:justify-start">
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" /></svg>
                      {bill.tickets?.length || 0} vé
                    </div>
                  </div>
                </div>

                {bill.tickets && bill.tickets.length > 0 && (
                  <div className="pt-4 flex flex-wrap gap-2">
                    {bill.tickets.map((ticket, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-medium text-neutral-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Ghế: <span className="font-bold text-white">{ticket.seatCode}</span>
                        <span className="text-neutral-500">|</span>
                        <span className="text-green-500">{ticket.price.toLocaleString('vi-VN')}đ</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

        {displayBills.length === 0 && (
          <div className="bg-neutral-900 rounded-2xl border border-dashed border-neutral-800 p-16 text-center">
            <svg className="w-16 h-16 text-neutral-800 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" />
            </svg>
            <p className="text-neutral-500 italic">Không tìm thấy hóa đơn nào.</p>
          </div>
        )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-10 h-10 rounded-xl font-bold transition-all ${
                  currentPage === i 
                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' 
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
