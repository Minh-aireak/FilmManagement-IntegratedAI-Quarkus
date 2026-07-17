import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Loader2, Save, Shield, UserCircle } from 'lucide-react';
import { authService } from '../services/auth.service';
import { type Account } from '../types';
import { useToast } from '../components/Toast';
import { useCache } from '../context/CacheContext';

const Profile: React.FC = () => {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { profileCache, setProfileCache } = useCache();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (profileCache) {
      setAccount(profileCache);
      setIsLoading(false);
    } else {
      fetchProfile();
    }
  }, [profileCache]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      // Gọi api lấy thông tin tài khoản (backend tự lấy ID từ token)
      const myAccount = await authService.getAccountById();
      setAccount(myAccount);
      setProfileCache(myAccount); // Lưu vào cache
    } catch (err: any) {
      showToast('Không thể tải thông tin tài khoản.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    try {
      setIsSaving(true);
      const response = await authService.updateAccount(account);
      
      if (response && response.success === false) {
        showToast(response.message || 'Cập nhật thất bại.', 'error');
        return;
      }

      showToast('Cập nhật thông tin thành công!', 'success');
      // Xóa cache để fetchProfile lấy dữ liệu mới nhất
      setProfileCache(null);
      fetchProfile();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Cập nhật thất bại.';
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
        <p className="mt-4 text-neutral-400">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Thông tin tài khoản</h1>
          <p className="text-neutral-400 mt-2">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
        </div>
        <div className="w-20 h-20 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center justify-center">
          <User className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-xl">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-neutral-800 rounded-full mx-auto flex items-center justify-center border-4 border-neutral-800 shadow-inner">
                <User className="w-12 h-12 text-neutral-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{account?.firstName} {account?.lastName}</h2>
                <p className="text-sm text-green-500 font-bold uppercase tracking-wider mt-1">
                  {account?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-neutral-800 pt-6">
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <Mail className="w-4 h-4 text-neutral-500" />
                <span className="truncate">{account?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <Phone className="w-4 h-4 text-neutral-500" />
                <span>{account?.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <UserCircle className="w-4 h-4 text-neutral-500" />
                <span>Giới tính: <span className="text-white">{account?.gender}</span></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <Shield className="w-4 h-4 text-neutral-500" />
                <span>Trạng thái: <span className="text-green-500 font-bold">{account?.active ? 'Đang hoạt động' : 'Bị khóa'}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUpdate} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Họ</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    value={account?.firstName || ''}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Nhập họ"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Tên</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    value={account?.lastName || ''}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Nhập tên"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Số điện thoại</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="tel"
                    value={account?.phone || ''}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Ngày sinh</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="date"
                    value={account?.dateOfBirth ? account.dateOfBirth.split('T')[0] : ''}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Giới tính</label>
                <div className="relative group">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors pointer-events-none" />
                  <select
                    value={account?.gender || 'Nam'}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, gender: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1">Địa chỉ</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    value={account?.address || ''}
                    onChange={(e) => setAccount(prev => prev ? { ...prev, address: e.target.value } : null)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 text-white font-black italic uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
