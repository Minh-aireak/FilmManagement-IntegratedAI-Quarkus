import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, AlertCircle, Image as ImageIcon, Film as MovieIcon, Clock, Languages, User, Users, Tag, X, Check, Upload } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { useToast } from '../components/Toast';
import { useCache } from '../context/CacheContext';
import { type Category } from '../types';

const AddFilm: React.FC = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const { showToast } = useToast();
  const { setAdminFilmsCache, clearFilmListCache, setAdminShowtimesCache, clearShowtimesPageCache } = useCache();
  
  const [formData, setFormData] = useState({
    idMovie: '',
    nameMovie: '',
    author: '',
    actors: '',
    duration: '',
    language: '',
    description: '',
    image: '',
    categories: [] as Category[]
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableCategories();
    if (isEditMode) {
      fetchFilmDetails();
    }
  }, [id]);

  const fetchAvailableCategories = async () => {
    try {
      const categories = await movieService.getCategories();
      setAvailableCategories(categories);
    } catch (err: any) {
      showToast('Không thể tải danh sách thể loại.', 'error');
    }
  };

  const fetchFilmDetails = async () => {
    try {
      const movie = await movieService.getMovieById(id!);
      setFormData({
        idMovie: movie.idMovie,
        nameMovie: movie.nameMovie,
        author: movie.author,
        actors: movie.actors,
        duration: movie.duration,
        language: movie.language,
        description: movie.description,
        image: movie.image,
        categories: movie.categories || []
      });
    } catch (err: any) {
      const message = 'Không thể tải thông tin phim.';
      setError(message);
      showToast(message, 'error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleCategoryToggle = (categoryName: string) => {
    setFormData(prev => {
      const isSelected = prev.categories.some(c => c.idCategory === categoryName);
      if (isSelected) {
        return {
          ...prev,
          categories: prev.categories.filter(c => c.idCategory !== categoryName)
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, { idCategory: categoryName }]
        };
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Xóa URL image cũ nếu có để ưu tiên hiển thị file vừa chọn
      setFormData(prev => ({ ...prev, image: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let imageUrl = formData.image;

      if (selectedFile) {
        try {
          const uploadRes = await movieService.uploadImage(selectedFile);
          imageUrl = typeof uploadRes === 'string' ? uploadRes : (uploadRes as any).url || uploadRes;
        } catch (uploadErr: any) {
          const serverMessage = uploadErr.response?.data?.message || uploadErr.message;
          throw new Error(`Không thể tải ảnh lên server: ${serverMessage}`);
        }
      }

      if (!imageUrl && !isEditMode) {
        throw new Error('Vui lòng chọn ảnh poster cho phim.');
      }

      const movieData = {
        nameMovie: formData.nameMovie,
        author: formData.author,
        actors: formData.actors,
        duration: formData.duration.toString(),
        language: formData.language,
        description: formData.description,
        image: imageUrl,
        idCategories: formData.categories.map(c => c.idCategory)
      };
      
      if (isEditMode) {
        await movieService.updateMovie(id!, movieData);
        showToast('Cập nhật phim thành công!', 'success');
      } else {
        await movieService.createMovie(movieData);
        showToast('Thêm phim thành công!', 'success');
      }

      // Xóa cache để danh sách phim được cập nhật lại
      setAdminFilmsCache(null);
      clearFilmListCache();
      setAdminShowtimesCache(null);
      clearShowtimesPageCache();
      
      navigate('/admin/movies');
    } catch (err: any) {
      const message = err.message || err.response?.data?.message || 'Đã xảy ra lỗi khi lưu phim.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/movies')}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại danh sách
        </button>
        <h1 className="text-3xl font-bold text-white">{isEditMode ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Preview */}
        <div className="space-y-6">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Poster Phim</h3>
            <div className="aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex items-center justify-center relative group">
              {(previewUrl || formData.image) ? (
                <img 
                  src={previewUrl || formData.image} 
                  alt="Poster preview" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600?text=Invalid+URL';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-600">
                  <ImageIcon className="w-12 h-12" />
                  <span className="text-xs">Chưa có ảnh</span>
                </div>
              )}
              
              {/* Overlay upload button */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-all active:scale-95">
                  <Upload className="w-6 h-6" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Thay đổi ảnh</span>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Hoặc nhập URL ảnh</label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={(e) => {
                  handleChange(e);
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                placeholder="https://example.com/poster.jpg"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-600 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
          
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 shadow-2xl space-y-4">
             {formData.idMovie && (
               <div className="flex items-center gap-2 text-neutral-400">
                  <div className="w-4 h-4 text-orange-500 font-mono text-xs leading-none flex items-center justify-center">ID</div>
                  <span className="text-xs font-mono uppercase">ID: {formData.idMovie}</span>
               </div>
             )}
             <div className="flex items-center gap-2 text-neutral-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{formData.duration || '0'} phút</span>
             </div>
             <div className="flex items-center gap-2 text-neutral-400">
                <Languages className="w-4 h-4" />
                <span className="text-sm truncate">{formData.language || 'Chưa chọn ngôn ngữ'}</span>
             </div>
             <div className="flex items-center gap-2 text-neutral-400">
                <User className="w-4 h-4" />
                <span className="text-sm truncate">Đạo diễn: {formData.author || 'N/A'}</span>
             </div>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-2xl space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Tên phim</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                    <MovieIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="nameMovie"
                    required
                    value={formData.nameMovie}
                    onChange={handleChange}
                    placeholder="Nhập tên phim..."
                    className="block w-full pl-10 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-neutral-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Mô tả phim</label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả phim..."
                  className="block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-neutral-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Đạo diễn</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="author"
                      required
                      value={formData.author}
                      onChange={handleChange}
                      placeholder="Tên đạo diễn..."
                      className="block w-full pl-10 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Ngôn ngữ</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                      <Languages className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="language"
                      required
                      value={formData.language}
                      onChange={handleChange}
                      placeholder="Tiếng Việt, Phụ đề..."
                      className="block w-full pl-10 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Thời lượng (phút)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                      <Clock className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="duration"
                      required
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="120"
                      className="block w-full pl-10 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Diễn viên</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
                      <Users className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      name="actors"
                      required
                      value={formData.actors}
                      onChange={handleChange}
                      placeholder="Tên các diễn viên..."
                      className="block w-full pl-10 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="space-y-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <Tag className="w-5 h-5 text-green-500" />
                  <span>Thể loại phim</span>
                </div>

                {/* Selected Categories */}
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                  {formData.categories.length > 0 ? (
                    formData.categories.map((cat) => (
                      <span 
                        key={cat.idCategory}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/5 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-tight rounded-lg group animate-in zoom-in-95 duration-200"
                      >
                        {cat.idCategory}
                        <button
                          type="button"
                          onClick={() => handleCategoryToggle(cat.idCategory)}
                          className="hover:text-green-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500 italic">Chưa chọn thể loại nào</span>
                  )}
                </div>

                {/* Categories Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {availableCategories.map((cat) => {
                    const isSelected = formData.categories.some(c => c.idCategory === cat.idCategory);
                    return (
                      <button
                        key={cat.idCategory}
                        type="button"
                        onClick={() => handleCategoryToggle(cat.idCategory)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                          isSelected
                            ? 'bg-green-600 border-green-500 text-white shadow-[0_8px_20px_-4px_rgba(34,197,94,0.4)] scale-105'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                        }`}
                      >
                        <span>{cat.idCategory}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                  {availableCategories.length === 0 && (
                    <div className="col-span-full py-4 text-center text-neutral-500 text-xs italic">
                      Đang tải danh sách thể loại...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {isLoading ? 'Đang lưu...' : 'Lưu bộ phim'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddFilm;
