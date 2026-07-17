import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type Showtime, type Movie } from '../types';
import { useCache } from '../context/CacheContext';

const DAYS = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

interface FilmWithShowtimes extends Movie {
  showtimes: Showtime[];
}

const Showtimes: React.FC = () => {
  const { showtimesPageCache, setShowtimesPageCache } = useCache();
  const [selectedDate, setSelectedDate] = useState(DAYS[0]);
  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  
  const currentCache = showtimesPageCache[formattedSelectedDate];
  
  const [filmsWithShowtimes, setFilmsWithShowtimes] = useState<FilmWithShowtimes[]>(currentCache?.films || []);
  const [isLoading, setIsLoading] = useState(!currentCache);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(currentCache?.page || 0);
  const [hasMore, setHasMore] = useState(currentCache ? currentCache.hasMore : true);
  const navigate = useNavigate();

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    }, {
      rootMargin: '100px',
      threshold: 0.1
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);

  // Handle date change
  useEffect(() => {
    const newFormattedDate = format(selectedDate, 'yyyy-MM-dd');
    const cache = showtimesPageCache[newFormattedDate];
    
    if (cache) {
      setFilmsWithShowtimes(cache.films);
      setPage(cache.page);
      setHasMore(cache.hasMore);
      setIsLoading(false);
    } else {
      setPage(0);
      setHasMore(true);
      setFilmsWithShowtimes([]);
      setIsLoading(true);
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchShowtimes = async () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      
      if (showtimesPageCache[dateKey] && page <= showtimesPageCache[dateKey].page) {
        setIsLoading(false);
        return;
      }

      try {
        if (page === 0) {
          setIsLoading(true);
        } else {
          setIsFetchingMore(true);
        }
        
        setError(null);
        
        let movies: Movie[] = [];
        let totalPages = 1;
        
        const pageResponse = await movieService.getMoviesByDate(dateKey, page, 10);
        movies = pageResponse?.data || [];
        totalPages = pageResponse?.totalPages || 1;
        const newHasMore = page < totalPages - 1;
        
        const moviesWithShowtimes = await Promise.all(
          movies.map(async (movie) => {
            const result = await movieService.getShowtimesByMovie(movie.idMovie, 0, 100);
            const showtimes = result?.data || [];
            
            // Lọc showtimes theo ngày được chọn
            const filteredShowtimes = showtimes.filter(st => {
              try {
                const stDate = new Date(st.showTime);
                const localDate = format(stDate, 'yyyy-MM-dd');
                const utcDate = stDate.toISOString().split('T')[0];
                return localDate === dateKey || utcDate === dateKey;
              } catch (e) {
                return false;
              }
            });
            return { ...movie, showtimes: filteredShowtimes };
          })
        );
        
        // Chỉ lấy những phim có suất chiếu trong ngày đã chọn
        const newFilms = moviesWithShowtimes.filter(f => f.showtimes.length > 0);
        
        let updatedFilms: FilmWithShowtimes[];
        if (page === 0) {
          updatedFilms = newFilms;
        } else {
          // Tránh trùng lặp phim khi load more
          const existingIds = new Set(filmsWithShowtimes.map(f => f.idMovie));
          const filteredNewFilms = newFilms.filter(f => !existingIds.has(f.idMovie));
          updatedFilms = [...filmsWithShowtimes, ...filteredNewFilms];
        }

        setFilmsWithShowtimes(updatedFilms);
        setHasMore(newHasMore);

        // Cập nhật cache
        setShowtimesPageCache(dateKey, {
          films: updatedFilms,
          page: page,
          hasMore: newHasMore
        });
      } catch (err: any) {
        console.error('Fetch showtimes error:', err);
        setError('Không thể tải lịch chiếu. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    };

    fetchShowtimes();
  }, [selectedDate, page]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Lịch chiếu phim</h1>
          <p className="text-neutral-400 mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500" />
            Aireak Cinema
          </p>
        </div>
      </div>

      <div className="flex justify-center relative">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide max-w-full">
          {DAYS.map((date) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            return (
              <button
                key={date.toString()}
                onClick={() => setSelectedDate(date)}
                disabled={isFetchingMore && page === 0}
                className={`flex flex-col items-center min-w-[100px] p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/20 scale-105'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                } ${isFetchingMore && page === 0 && !isSelected ? 'opacity-50' : ''}`}
              >
                <span className="text-xs font-medium uppercase tracking-wider">{format(date, 'EEEE', { locale: vi })}</span>
                <span className="text-xl font-bold mt-1">{format(date, 'dd/MM')}</span>
              </button>
            );
          })}
        </div>
        {isFetchingMore && page === 0 && (
          <div className="absolute -bottom-2 flex items-center gap-2 text-xs text-green-500 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang cập nhật...
          </div>
        )}
      </div>

      <div className={`space-y-6 transition-opacity duration-300 ${isFetchingMore && page === 0 ? 'opacity-50' : 'opacity-100'}`}>
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-12 text-center space-y-4">
            <p className="text-red-500 font-medium">{error}</p>
            <button 
              onClick={() => setPage(0)} 
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-bold"
            >
              Thử lại
            </button>
          </div>
        ) : filmsWithShowtimes.length > 0 ? (
          filmsWithShowtimes.map((film, index) => (
            <div 
              key={film.idMovie} 
              ref={index === filmsWithShowtimes.length - 1 ? lastElementRef : null}
              className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden group hover:border-green-500/30 transition-all shadow-lg"
            >
              <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-32 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800">
                  <img src={film.image} alt={film.nameMovie} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                
                <div className="flex-grow space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white hover:text-green-500 transition-colors cursor-pointer uppercase tracking-tight">
                        {film.nameMovie}
                      </h2>
                      <p className="text-xs text-neutral-500 mt-1">{film.language} • {film.duration} phút</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {film.showtimes.length > 0 ? (
                      film.showtimes.map((st) => (
                        <button
                          key={st.idShowtime}
                          onClick={() => navigate(`/seat-selection/${st.idShowtime}`)}
                          className="group/btn flex flex-col items-center p-3 rounded-lg border border-neutral-800 bg-neutral-800/50 hover:border-green-500 hover:bg-neutral-800 transition-all active:scale-95"
                        >
                          <span className="text-lg font-bold text-white group-hover/btn:text-green-500">
                            {format(new Date(st.showTime), 'HH:mm')}
                          </span>
                          <span className="text-[10px] text-neutral-500 mt-1 uppercase font-bold tracking-wider">{st.idRoom}</span>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full py-4 text-neutral-500 text-sm italic">
                        Không có suất chiếu nào trong ngày này.
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center pr-4">
                  <ChevronRight className="w-6 h-6 text-neutral-700 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">Không có suất chiếu nào cho ngày này.</p>
          </div>
        )}

        {isFetchingMore && page > 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        )}

        {!hasMore && filmsWithShowtimes.length > 0 && (
          <div className="text-center py-8 text-neutral-500 italic">
            Bạn đã xem hết lịch chiếu của ngày này.
          </div>
        )}
      </div>
    </div>
  );
};

export default Showtimes;
