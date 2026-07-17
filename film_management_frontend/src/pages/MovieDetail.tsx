import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MapPin, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type Showtime, type Movie } from '../types';
import { useCache } from '../context/CacheContext';

const MovieDetail: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const navigate = useNavigate();
  const { movieDetailCache, setMovieDetailCache } = useCache();
  
  const cachedData = movieId ? movieDetailCache[movieId] : null;
  
  const [movie, setMovie] = useState<Movie | null>(cachedData?.movie || null);
  const [allShowtimes, setAllShowtimes] = useState<Showtime[]>(cachedData?.showtimes || []);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movieId) return;
      
      try {
        if (!cachedData) setIsLoading(true);
        setError(null);
        
        // 1. Fetch movie info
        const movieData = await movieService.getMovieById(movieId);
        if (!movieData) {
          setError('Không tìm thấy thông tin phim.');
          return;
        }

        // 2. Fetch all showtimes for this movie
        const result = await movieService.getShowtimesByMovie(movieId, 0, 100);
        const validShowtimes = result?.data || [];
        
        // Sắp xếp showtimes theo thời gian giảm dần (mới nhất lên đầu) theo API
        const sortedShowtimes = [...validShowtimes].sort((a, b) => 
          new Date(b.showTime).getTime() - new Date(a.showTime).getTime()
        );
        
        setMovie(movieData);
        setAllShowtimes(sortedShowtimes);
        setMovieDetailCache(movieId, { movie: movieData, showtimes: sortedShowtimes });
        
      } catch (err) {
        console.error('Fetch movie detail error:', err);
        setError('Không thể tải thông tin phim. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovieData();
  }, [movieId]);

  // Nhóm showtimes theo ngày
  const groupedShowtimes = allShowtimes.reduce((acc, st) => {
    const date = format(new Date(st.showTime), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(st);
    return acc;
  }, {} as Record<string, Showtime[]>);

  // Lấy danh sách ngày đã sắp xếp giảm dần
   const sortedDates = Object.keys(groupedShowtimes).sort((a, b) => b.localeCompare(a));

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <p className="text-red-500 font-medium mb-4">{error || 'Đã có lỗi xảy ra'}</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-all flex items-center gap-2 mx-auto"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Nút quay lại */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Quay lại</span>
      </button>

      {/* Thông tin phim (Hero section) */}
      <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0">
          <img 
            src={movie?.image} 
            alt={movie?.nameMovie} 
            className="w-full h-full object-cover blur-md opacity-20 scale-110" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent" />
        </div>
        
        <div className="relative p-6 md:p-12 flex flex-col md:flex-row gap-10 items-center md:items-start">
          {/* Poster */}
          <div className="w-48 md:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-neutral-700 flex-shrink-0 z-10 transform -rotate-1 md:hover:rotate-0 transition-transform duration-500">
            <img 
              src={movie?.image} 
              alt={movie?.nameMovie} 
              className="w-full h-full object-cover" 
            />
          </div>
          
          {/* Details */}
          <div className="flex-grow space-y-6 z-10 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {movie?.categories?.map(cat => (
                <span key={cat.idCategory} className="px-4 py-1.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  {cat.idCategory}
                </span>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
              {movie?.nameMovie}
            </h1>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-neutral-300">
              <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-lg border border-neutral-700">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="font-bold">{movie?.duration} phút</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-lg border border-neutral-700">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="font-bold">Aireak Cinema</span>
              </div>
              <div className="px-3 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-xs font-black text-neutral-400">
                {movie?.language}
              </div>
            </div>

            <div className="space-y-4 max-w-3xl">
              <p className="text-neutral-400 text-base md:text-lg leading-relaxed italic">
                "{movie?.description}"
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-800/50">
                <div>
                  <p className="text-[10px] uppercase font-black text-neutral-500 tracking-widest mb-1">Đạo diễn</p>
                  <p className="text-white font-bold">{movie?.author}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-neutral-500 tracking-widest mb-1">Diễn viên</p>
                  <p className="text-white font-bold">{movie?.actors}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lịch chiếu Section */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Suất chiếu hiện có</h2>
              <p className="text-neutral-500 text-sm font-medium">Chọn suất chiếu phù hợp để đặt vé</p>
            </div>
          </div>
        </div>

        {/* Showtimes Grouped by Date */}
        <div className="space-y-6">
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <div key={date} className="bg-neutral-900/50 rounded-[2rem] border border-neutral-800 overflow-hidden">
                <div className="bg-neutral-800/50 px-8 py-4 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <span className="text-lg font-black text-white uppercase tracking-wider">
                      {format(new Date(date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                    {groupedShowtimes[date].length} suất chiếu
                  </span>
                </div>
                
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-4">
                    {groupedShowtimes[date].map((st) => (
                      <button
                        key={st.idShowtime}
                        onClick={() => navigate(`/seat-selection/${st.idShowtime}`)}
                        className="group flex flex-col items-center min-w-[120px] p-4 rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-green-500 hover:bg-green-500/5 transition-all active:scale-95 shadow-lg"
                      >
                        <span className="text-xl font-black text-white group-hover:text-green-500 transition-colors">
                          {format(new Date(st.showTime), 'HH:mm')}
                        </span>
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-neutral-800 rounded-md">
                          <span className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">
                            {st.idRoom}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-neutral-900/50 rounded-[2rem] border border-neutral-800 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-600">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-neutral-500 font-bold italic">
                Hiện tại phim chưa có lịch chiếu chính thức. Vui lòng quay lại sau!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
