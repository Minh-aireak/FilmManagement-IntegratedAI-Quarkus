import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Film as FilmIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type Movie, type Category } from '../types';
import { useToast } from '../components/Toast';
import { useCache } from '../context/CacheContext';

const AdminFilms: React.FC = () => {
  const { 
    adminFilmsCache, 
    setAdminFilmsCache, 
    clearFilmListCache, 
    setAdminShowtimesCache, 
    clearShowtimesPageCache,
    setMovieDetailCache 
  } = useCache();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(adminFilmsCache?.category || 'all');
  const [isLoading, setIsLoading] = useState(!adminFilmsCache);
  const [currentPage, setCurrentPage] = useState(adminFilmsCache?.page || 0);
  const [totalPages, setTotalPages] = useState(adminFilmsCache?.totalPages || 0);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Sử dụng useMemo để đồng bộ danh sách phim từ cache
  const films = useMemo(() => adminFilmsCache?.films || [], [adminFilmsCache]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await movieService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchFilms();
  }, [currentPage, selectedCategory]);

  const fetchFilms = async (force = false) => {
    // Nếu đã có cache và không yêu cầu force refresh thì không fetch lại
    if (!force && adminFilmsCache && 
        currentPage === adminFilmsCache.page && 
        films.length > 0 && 
        selectedCategory === (adminFilmsCache.category || 'all')) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const categoryParam = selectedCategory === 'all' ? undefined : selectedCategory;
      const pageResponse = await movieService.getPageMovies(currentPage, 8, categoryParam);
      
      const newFilms = pageResponse.data || [];
      const newTotalPages = pageResponse.totalPages || 1;
      
      setTotalPages(newTotalPages);

      // Cập nhật cache - films sẽ tự động cập nhật qua useMemo
      setAdminFilmsCache({
        films: newFilms,
        page: currentPage,
        totalPages: newTotalPages,
        category: selectedCategory
      });
    } catch (err: any) {
      showToast('Không thể tải danh sách phim.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(0);
    setAdminFilmsCache(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phim này?')) {
      try {
        await movieService.deleteMovie(id);
        
        // Xóa cache của trang Admin trước
        setAdminFilmsCache(null);
        // Xóa cache chi tiết phim này
        setMovieDetailCache(id, null);
        // Xóa cache của trang người dùng và các trang liên quan
        clearFilmListCache();
        setAdminShowtimesCache(null);
        clearShowtimesPageCache();

        showToast('Xóa phim thành công!', 'success');
        
        // Force fetch lại dữ liệu mới
        fetchFilms(true);
      } catch (err: any) {
        const message = 'Xóa phim thất bại: ' + (err.response?.data?.message || 'Lỗi không xác định');
        showToast(message, 'error');
        // Không thay đổi cache nếu xóa thất bại
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <FilmIcon className="w-10 h-10 text-green-500" /> Quản lý phim
          </h1>
        </div>
        <Link 
          to="/admin/movies/add" 
          className="relative z-10 flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-green-600/20 active:scale-95 group/btn"
        >
          <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
          Thêm phim mới
        </Link>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
              <Filter className="w-5 h-5" />
            </div>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="block w-full pl-10 pr-10 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white appearance-none outline-none transition-all cursor-pointer"
            >
              <option value="all">Tất cả thể loại</option>
              {categories.map(cat => (
                <option key={cat.idCategory} value={cat.idCategory}>
                  {cat.idCategory}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[400px]">
          <div className={`transition-opacity duration-300 ${isLoading && currentPage === 0 ? 'opacity-30' : 'opacity-100'}`}>
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-sm uppercase tracking-wider">
                <th className="px-4 py-4 font-medium">Phim</th>
                <th className="px-4 py-4 font-medium">Thể loại</th>
                <th className="px-4 py-4 font-medium">Thời lượng</th>
                <th className="px-4 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {films.map((movie) => (
                <tr 
                  key={movie.idMovie} 
                  className="hover:bg-neutral-800/30 transition-colors group"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-neutral-800">
                        {movie.image ? (
                          <img src={movie.image} alt={movie.nameMovie} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FilmIcon className="w-6 h-6 text-neutral-600" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-white group-hover:text-green-500 transition-colors">
                        {movie.nameMovie}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {movie.categories?.map((cat, i) => (
                        <span 
                          key={i} 
                          className="text-[10px] font-black text-green-500 border border-green-500/20 bg-green-500/5 px-2.5 py-0.5 rounded-lg uppercase tracking-tight whitespace-nowrap"
                        >
                          {cat.idCategory}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-400">{movie.duration} phút</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/admin/movies/edit/${movie.idMovie}`)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(movie.idMovie)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {films.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-neutral-500 italic">
                    Không tìm thấy bộ phim nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
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

export default AdminFilms;
