import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Film, LogOut, User as UserIcon, Shield, 
  LayoutDashboard, Clapperboard, Tags, Calendar, 
  Ticket, Users, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useToast } from './Toast';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { clearCache } = useCache();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isAdmin = user?.role === 'ADMIN';
  const isAdminPath = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    clearCache();
    showToast('Đã đăng xuất thành công', 'success');
    navigate('/login');
  };

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', color: 'text-blue-500' },
    { icon: Clapperboard, label: 'Quản lý phim', path: '/admin/movies', color: 'text-green-500' },
    { icon: Tags, label: 'Thể loại', path: '/admin/categories', color: 'text-purple-500' },
    { icon: Calendar, label: 'Suất chiếu', path: '/admin/showtimes', color: 'text-orange-500' },
    { icon: Ticket, label: 'Vé & Hóa đơn', path: '/admin/bookings', color: 'text-pink-500' },
    { icon: Users, label: 'Người dùng', path: '/admin/accounts', color: 'text-cyan-500' },
  ];

  // Nếu là Admin và đang ở trang Admin, dùng layout Sidebar
  if (isAdmin && isAdminPath) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-neutral-900/50 border-r border-neutral-800 transition-all duration-300 flex flex-col sticky top-0 h-screen z-50`}>
          <div className="p-6 flex items-center justify-between">
            {isSidebarOpen && (
              <Link to="/" className="flex items-center space-x-2 text-green-500">
                <Film className="w-8 h-8 text-green-500" />
                <span className="text-xl font-black italic tracking-tighter">Aireak Cinema</span>
              </Link>
            )}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-grow px-4 space-y-2 mt-4">
            {adminMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-green-600/10 text-green-500 border border-green-500/20' 
                      : 'hover:bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-500' : item.color}`} />
                  {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
                  {isActive && isSidebarOpen && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-neutral-800">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all group"
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="font-bold text-sm">Đăng xuất</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-grow flex flex-col">
          <header className="h-16 border-b border-neutral-800 bg-neutral-900/30 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center space-x-4">
            </div>
            
            <div className="flex items-center space-x-6">
              <Link to="/profile" className="flex items-center space-x-3 pl-6 border-l border-neutral-800 group transition-all">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white leading-none group-hover:text-green-500 transition-colors">{user.nameDisplay}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">Quản trị viên</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-green-500/50 transition-all">
                  <Shield className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
            </div>
          </header>

          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Layout mặc định cho User
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 text-primary-500">
              <Film className="w-8 h-8 text-green-500" />
              <span className="text-xl font-bold tracking-tighter uppercase italic font-black">AIREAK CINEMA</span>
            </Link>

            <nav className="hidden md:flex space-x-8">
              <Link to="/" className={`hover:text-green-500 transition-colors font-bold ${location.pathname === '/' ? 'text-green-500' : 'text-neutral-400'}`}>Phim</Link>
              <Link to="/showtimes" className={`hover:text-green-500 transition-colors font-bold ${location.pathname === '/showtimes' ? 'text-green-500' : 'text-neutral-400'}`}>Lịch chiếu</Link>
              {user && (
                <Link to="/history" className={`hover:text-green-500 transition-colors font-bold ${location.pathname === '/history' ? 'text-green-500' : 'text-neutral-400'}`}>Lịch sử</Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {user && user.nameDisplay ? (
                <div className="flex items-center space-x-6">
                  {isAdmin && (
                    <Link to="/admin/movies" className="flex items-center space-x-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl transition-all font-bold text-sm">
                      <Shield className="w-4 h-4" />
                      <span>Trang Quản trị</span>
                    </Link>
                  )}
                  <Link 
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-1 bg-neutral-800 border border-neutral-700 hover:border-green-500/50 rounded-full transition-all group"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-white">
                      {user.nameDisplay}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login" className="px-4 py-2 text-sm font-bold hover:text-green-500 transition-colors text-neutral-400">Đăng nhập</Link>
                  <Link to="/register" className="px-6 py-2 text-sm font-black italic bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-lg shadow-green-600/20 uppercase tracking-widest">Đăng ký</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
