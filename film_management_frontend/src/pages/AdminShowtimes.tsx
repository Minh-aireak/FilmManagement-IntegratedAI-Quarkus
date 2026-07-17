import React, { useEffect, useMemo, useState } from 'react';
import { movieService } from '../services/movie.service';
import { type Showtime, type Movie, type Room, type AddShowtimeRequest } from '../types';
import { useToast } from '../components/Toast';
import { Loader2, Trash2, Calendar, Clock, MapPin, Search, Plus, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useCache } from '../context/CacheContext';

const AdminShowtimes: React.FC = () => {
  const { adminShowtimesCache, setAdminShowtimesCache, clearShowtimesPageCache, setMovieDetailCache } = useCache();
  const [movies, setMovies] = useState<Movie[]>(adminShowtimesCache?.movies || []);
  const [rooms, setRooms] = useState<Room[]>(adminShowtimesCache?.rooms || []);
  const [isLoading, setIsLoading] = useState(!adminShowtimesCache);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>(adminShowtimesCache?.timeFilter || 'upcoming');
  const [selectedMovieId, setSelectedMovieId] = useState<string>(adminShowtimesCache?.movieId || 'all');
  const [selectedDate, setSelectedDate] = useState<string>(adminShowtimesCache?.date || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(adminShowtimesCache?.roomId || 'all');
  const [currentPage, setCurrentPage] = useState(adminShowtimesCache?.page || 0);
  const [totalPages, setTotalPages] = useState(adminShowtimesCache?.totalPages || 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const { showToast } = useToast();

  // Sử dụng useMemo để đồng bộ danh sách suất chiếu từ cache
  const showtimes = useMemo(() => adminShowtimesCache?.showtimes || [], [adminShowtimesCache]);

  useEffect(() => {
    fetchData();
  }, [timeFilter, selectedMovieId, selectedDate, selectedRoomId, currentPage]);

  const fetchData = async (force = false, silent = false) => {
    // Nếu đã có cache và các tham số khớp và không yêu cầu force refresh thì không fetch lại
    if (!force && adminShowtimesCache && 
        currentPage === adminShowtimesCache.page && 
        timeFilter === adminShowtimesCache.timeFilter &&
        selectedMovieId === (adminShowtimesCache.movieId || 'all') &&
        selectedDate === (adminShowtimesCache.date || '') &&
        selectedRoomId === (adminShowtimesCache.roomId || 'all') &&
        showtimes.length > 0) {
      setIsLoading(false);
      return;
    }

    try {
      if (!silent) setIsLoading(true);
      const [showtimesRes, moviesRes, roomsRes] = await Promise.all([
        movieService.getAllShowtimes(
          currentPage, 
          8, 
          timeFilter, 
          selectedMovieId === 'all' ? undefined : selectedMovieId,
          selectedDate || undefined,
          selectedRoomId === 'all' ? undefined : selectedRoomId
        ),
        movies.length === 0 ? movieService.getPageMovies(0, 100) : Promise.resolve(null),
        rooms.length === 0 ? movieService.getRooms() : Promise.resolve(null)
      ]);

      const newShowtimes = showtimesRes?.data || [];
      const newTotalPages = showtimesRes?.totalPages || 1;
      const newMovies = moviesRes ? moviesRes.data || [] : movies;
      const newRooms = roomsRes ? roomsRes || [] : rooms;

      setTotalPages(newTotalPages);
      setMovies(newMovies);
      setRooms(newRooms);

      // Cập nhật cache - showtimes sẽ tự động cập nhật qua useMemo
      setAdminShowtimesCache({
        showtimes: newShowtimes,
        movies: newMovies,
        rooms: newRooms,
        page: currentPage,
        totalPages: newTotalPages,
        timeFilter: timeFilter,
        movieId: selectedMovieId,
        date: selectedDate,
        roomId: selectedRoomId
      });
    } catch (err: any) {
      showToast('Không thể tải dữ liệu lịch chiếu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const [newShowtime, setNewShowtime] = useState<AddShowtimeRequest>({
    idMovie: '',
    idRoom: '',
    showTime: '',
    standardPrice: 0,
    vipPrice: 0,
    couplePrice: 0
  });

  const handleAddShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShowtime.idMovie || !newShowtime.idRoom || !newShowtime.showTime) {
      showToast('Vui lòng điền đầy đủ thông tin.', 'error');
      return;
    }

    if (newShowtime.standardPrice < 0 || newShowtime.vipPrice < 0 || newShowtime.couplePrice < 0) {
      showToast('Giá vé không được nhỏ hơn 0.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedShowtime: AddShowtimeRequest = {
        idMovie: newShowtime.idMovie,
        idRoom: newShowtime.idRoom,
        showTime: new Date(newShowtime.showTime).toISOString(),
        standardPrice: newShowtime.standardPrice,
        vipPrice: newShowtime.vipPrice,
        couplePrice: newShowtime.couplePrice
      };
      await movieService.createShowtime(formattedShowtime);
      showToast('Thêm suất chiếu thành công!', 'success');
      setShowAddModal(false);
      setNewShowtime({ 
        idMovie: '', 
        idRoom: '', 
        showTime: '', 
        standardPrice: 0, 
        vipPrice: 0, 
        couplePrice: 0 
      });
      
      // Xóa cache chi tiết phim liên quan để cập nhật suất chiếu mới
      if (newShowtime.idMovie) {
        setMovieDetailCache(newShowtime.idMovie, null);
      }
      clearShowtimesPageCache();
      
      // Fetch lại dữ liệu ngầm (silent) để cập nhật danh sách
      setCurrentPage(0);
      fetchData(true, true);
    } catch (err: any) {
      showToast('Không thể thêm suất chiếu. Vui lòng kiểm tra lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, movieId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa suất chiếu này?')) {
      const previousCache = adminShowtimesCache;
      try {
        // Optimistic Update: Xóa suất chiếu khỏi UI ngay lập tức
        if (adminShowtimesCache) {
          setAdminShowtimesCache({
            ...adminShowtimesCache,
            showtimes: adminShowtimesCache.showtimes.filter(st => st.idShowtime !== id)
          });
        }

        await movieService.deleteShowtime(id);
        showToast('Xóa suất chiếu thành công!', 'success');
        
        // Xóa các cache liên quan khác
        clearShowtimesPageCache();
        setMovieDetailCache(movieId, null);

        // Fetch lại dữ liệu ngầm (silent) để đảm bảo đồng bộ phân trang
        fetchData(true, true);
      } catch (err: any) {
        // Rollback nếu có lỗi
        setAdminShowtimesCache(previousCache);
        const errorMessage = err.response?.data?.message || 'Xóa suất chiếu thất bại.';
        showToast(errorMessage, 'error');
      }
    }
  };

  const getMovieName = (movieId: string, showtime?: Showtime) => {
    if (showtime?.movieName) return showtime.movieName;
    return movies.find(m => m.idMovie === movieId)?.nameMovie || 'Phim không xác định';
  };

  const getMovieImage = (movieId: string, showtime?: Showtime) => {
    if (showtime?.movieImage) return showtime.movieImage;
    return movies.find(m => m.idMovie === movieId)?.image || '';
  };

  const filteredShowtimes = showtimes.filter(st => {
    return getMovieName(st.idMovie, st).toLowerCase().includes(searchTerm.toLowerCase()) ||
           st.idRoom.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Admin Header
  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <Calendar className="w-10 h-10 text-green-500" /> Quản lý suất chiếu
          </h1>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="relative z-10 flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-green-600/20 active:scale-95 group/btn"
        >
          <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
          Thêm suất chiếu mới
        </button>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-2xl">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm nhanh..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value as any);
                setCurrentPage(0);
              }}
              className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all min-w-[150px]"
            >
              <option value="upcoming">Sắp tới</option>
              <option value="past">Đã qua</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Lọc theo phim</label>
              <select
                value={selectedMovieId}
                onChange={(e) => {
                  setSelectedMovieId(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="all">Tất cả phim</option>
                {movies.map(movie => (
                  <option key={movie.idMovie} value={movie.idMovie}>{movie.nameMovie}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Lọc theo ngày</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase ml-1">Lọc theo phòng</label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
              >
                <option value="all">Tất cả phòng</option>
                {rooms.map(room => (
                  <option key={room.idRoom} value={room.idRoom}>{room.idRoom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[400px]">
          <table className={`w-full text-left border-collapse transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-sm uppercase tracking-wider">
                <th className="px-4 py-4 font-medium">Phim</th>
                <th className="px-4 py-4 font-medium">Phòng chiếu</th>
                <th className="px-4 py-4 font-medium">Ngày chiếu</th>
                <th className="px-4 py-4 font-medium">Giờ chiếu</th>
                <th className="px-4 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredShowtimes.map((st) => (
                <tr 
                  key={st.idShowtime} 
                  className="hover:bg-neutral-800/30 transition-colors group"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-neutral-800">
                        <img 
                          src={getMovieImage(st.idMovie, st)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40x60?text=?')}
                        />
                      </div>
                      <span className="font-bold text-white group-hover:text-green-500 transition-colors">
                        {getMovieName(st.idMovie, st)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <MapPin className="w-4 h-4 text-green-500" />
                      {st.idRoom}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {format(new Date(st.showTime), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      {format(new Date(st.showTime), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {new Date(st.showTime) >= new Date() && (
                      <button 
                        onClick={() => handleDelete(st.idShowtime, st.idMovie)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredShowtimes.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-500 italic">
                    Không tìm thấy suất chiếu nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">Thêm suất chiếu</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddShowtime} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Chọn phim</label>
                <select
                  required
                  value={newShowtime.idMovie}
                  onChange={(e) => setNewShowtime({ ...newShowtime, idMovie: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
                >
                  <option value="">-- Chọn phim --</option>
                  {movies.map(movie => (
                    <option key={movie.idMovie} value={movie.idMovie}>{movie.nameMovie}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Phòng chiếu</label>
                <select
                  required
                  value={newShowtime.idRoom}
                  onChange={(e) => setNewShowtime({ ...newShowtime, idRoom: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
                >
                  <option value="">-- Chọn phòng chiếu --</option>
                  {rooms.map(room => (
                    <option key={room.idRoom} value={room.idRoom}>{room.idRoom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Thời gian chiếu</label>
                <input
                  type="datetime-local"
                  required
                  value={newShowtime.showTime}
                  onChange={(e) => setNewShowtime({ ...newShowtime, showTime: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2 uppercase">Giá Standard</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={newShowtime.standardPrice || ''}
                    onChange={(e) => setNewShowtime({ ...newShowtime, standardPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2 uppercase">Giá VIP</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={newShowtime.vipPrice || ''}
                    onChange={(e) => setNewShowtime({ ...newShowtime, vipPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2 uppercase">Giá Couple</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={newShowtime.couplePrice || ''}
                    onChange={(e) => setNewShowtime({ ...newShowtime, couplePrice: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShowtimes;

