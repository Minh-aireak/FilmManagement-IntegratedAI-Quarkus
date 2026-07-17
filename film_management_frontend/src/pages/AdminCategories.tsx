import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Tag, Loader2, X } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type Category } from '../types';
import { useToast } from '../components/Toast';

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await movieService.getCategories();
      setCategories(data);
    } catch (err) {
      showToast('Không thể tải danh sách thể loại', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryId.trim()) return;

    try {
      setIsSubmitting(true);
      await movieService.createCategory(newCategoryId.trim());
      showToast('Thêm thể loại thành công!', 'success');
      setNewCategoryId('');
      setIsAdding(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thêm thể loại thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (idCategory: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thể loại "${idCategory}"?`)) return;

    try {
      await movieService.deleteCategory(idCategory);
      showToast('Xóa thể loại thành công!', 'success');
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể xóa thể loại này (có thể đang được sử dụng)', 'error');
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.idCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <Tag className="w-10 h-10 text-green-500" /> Quản lý thể loại
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="relative z-10 flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-lg shadow-green-600/20 active:scale-95 group/btn"
        >
          <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
          Thêm thể loại
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Tổng thể loại</p>
              <h3 className="text-2xl font-black text-white italic tracking-tighter">{categories.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Tìm kiếm thể loại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-gradient-to-r from-green-500/5 to-transparent">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-green-500" /> Thêm thể loại mới
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-neutral-400 uppercase tracking-widest">Tên / Mã thể loại</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: HANHDONG, KINHDI..."
                  className="w-full px-4 py-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-neutral-600 font-mono uppercase"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative min-h-[300px]">
        {/* Loading overlay */}
        {isLoading && categories.length > 0 && (
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-3xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              <p className="text-white font-bold text-sm tracking-widest uppercase italic">Đang tải...</p>
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
          {isLoading && categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
              <p className="text-neutral-400 font-bold tracking-widest uppercase italic">Đang khởi tạo dữ liệu...</p>
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <div 
                  key={cat.idCategory} 
                  className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 hover:border-purple-500/30 transition-all group flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                      <Tag className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight italic uppercase">{cat.idCategory}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.idCategory)}
                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa thể loại"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-900 rounded-3xl border border-dashed border-neutral-800 p-20 text-center">
              <Tag className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
              <p className="text-neutral-500 italic">Không tìm thấy thể loại nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;
