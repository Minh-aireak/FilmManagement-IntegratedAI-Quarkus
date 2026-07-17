import React, { useEffect, useState } from 'react';
import { User, Shield, ShieldAlert, Search, Loader2, Mail, Phone, Lock, Unlock, Filter } from 'lucide-react';
import { authService } from '../services/auth.service';
import { type Account } from '../types';
import { useToast } from '../components/Toast';
import { useCache } from '../context/CacheContext';

const AdminAccounts: React.FC = () => {
  const { adminAccountsCache, setAdminAccountsCache } = useCache();
  const [accounts, setAccounts] = useState<Account[]>(adminAccountsCache?.accounts || []);
  const [isLoading, setIsLoading] = useState(!adminAccountsCache);
  const [searchTerm, setSearchTerm] = useState(adminAccountsCache?.searchTerm || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>(adminAccountsCache?.statusFilter || 'all');
  const { showToast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    // Nếu đã có cache thì không fetch lại
    if (adminAccountsCache && accounts.length > 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.getAllAccounts();
      setAccounts(data);
      
      // Cập nhật cache
      setAdminAccountsCache({
        accounts: data,
        searchTerm: searchTerm,
        statusFilter: statusFilter
      });
    } catch (err: any) {
      showToast('Không thể tải danh sách tài khoản.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật cache khi search hoặc filter thay đổi
  useEffect(() => {
    if (accounts.length > 0) {
      setAdminAccountsCache({
        accounts: accounts,
        searchTerm: searchTerm,
        statusFilter: statusFilter
      });
    }
  }, [searchTerm, statusFilter, accounts]);

  const handleToggleStatus = async (account: Account) => {
    if (!account.idAccount) return;
    
    const actionText = account.active ? 'vô hiệu hóa' : 'kích hoạt';
    
    if (window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) {
      try {
        await authService.toggleActive(account.idAccount);
        showToast(`Đã ${actionText} tài khoản thành công!`, 'success');
        
        // Cập nhật state cục bộ và cache sẽ tự động được cập nhật qua useEffect
        const updatedAccounts = accounts.map(acc => 
          acc.idAccount === account.idAccount ? { ...acc, active: !account.active } : acc
        );
        setAccounts(updatedAccounts);
      } catch (err: any) {
        showToast(`Thao tác thất bại. Vui lòng thử lại.`, 'error');
      }
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = `${acc.firstName} ${acc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && acc.active) || 
      (statusFilter === 'locked' && !acc.active);
      
    return matchesSearch && matchesStatus;
  });

  // Chỉ hiện loading toàn trang khi lần đầu tải
  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
        <p className="mt-4 text-neutral-300 font-medium">Đang tải danh sách tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <Shield className="w-10 h-10 text-green-500" /> Quản lý người dùng
          </h1>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-neutral-500 outline-none transition-all"
            />
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
              <Filter className="w-5 h-5" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full pl-10 pr-10 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white appearance-none outline-none transition-all cursor-pointer font-bold"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[400px]">
          {/* Loading overlay khi cập nhật dữ liệu */}
          {isLoading && accounts.length > 0 && (
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                <p className="text-white font-bold text-sm tracking-widest uppercase italic">Đang tải...</p>
              </div>
            </div>
          )}

          <table className={`w-full text-left border-collapse transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-300 text-sm uppercase tracking-wider">
                <th className="px-4 py-4 font-semibold">Người dùng</th>
                <th className="px-4 py-4 font-semibold">Liên hệ</th>
                <th className="px-4 py-4 font-semibold">Trạng thái</th>
                <th className="px-4 py-4 font-semibold">Quyền hạn</th>
                <th className="px-4 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredAccounts.map((acc) => (
                <tr 
                  key={acc.idAccount} 
                  className={`transition-colors group ${
                    acc.active 
                      ? 'hover:bg-neutral-800/40' 
                      : 'bg-red-500/[0.03] hover:bg-red-500/[0.06]'
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border ${
                        acc.active 
                          ? 'border-green-500/30 text-green-500' 
                          : 'border-red-500/30 text-red-500'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-bold transition-colors ${
                          acc.active ? 'text-white group-hover:text-green-400' : 'text-neutral-300'
                        }`}>
                          {acc.lastName} {acc.firstName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 text-lg font-semibold text-neutral-200">
                        <Mail className="w-5 h-5 text-green-500" /> {acc.email}
                      </div>
                      <div className="flex items-center gap-2.5 text-lg font-semibold text-neutral-200">
                        <Phone className="w-5 h-5 text-green-500" /> {acc.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      acc.active 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {acc.active ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      acc.role === 'ADMIN' 
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' 
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                    }`}>
                      {acc.role === 'ADMIN' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleToggleStatus(acc)}
                        className={`p-2 rounded-lg transition-all ${
                          acc.active 
                            ? 'bg-green-500/10 hover:bg-green-500/20 text-green-500' 
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                        }`}
                        title={acc.active ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                      >
                        {acc.active ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAccounts;
