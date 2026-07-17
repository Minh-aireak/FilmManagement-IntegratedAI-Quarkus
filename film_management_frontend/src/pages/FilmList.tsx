import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, AlertCircle, Film, ArrowUp, TrendingUp as TrendingIcon } from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type Movie, type DashboardStatsResponse, type Category } from '../types';
import { useCache } from '../context/CacheContext';

// Memoized Hot Movies Section
const HotMoviesSection = React.memo(({ hotMovies, navigate }: { hotMovies: DashboardStatsResponse['topMovies'], navigate: any }) => {
  if (hotMovies.length === 0) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <TrendingIcon className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Phim Hot Trong Tháng</h2>
          <p className="text-neutral-500 text-sm font-medium">Những bộ phim được xem nhiều nhất hiện nay</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {hotMovies.map((movie, index) => (
          <div 
            key={index}
            className="group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border border-neutral-800 hover:border-red-500/50 transition-all"
            onClick={() => {
               if (movie.idMovie) navigate(`/movie/${movie.idMovie}`);
             }}
          >
            <img 
              src={movie.image} 
              alt={movie.movieName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
            
            <div className="absolute top-3 left-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black italic shadow-lg border border-red-400/50">
                #{index + 1}
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-black italic uppercase tracking-tighter line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                {movie.movieName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Memoized Category Filter Section
const CategoryFilter = React.memo(({ 
  categories, 
  selectedCategories, 
  onCategoryChange 
}: { 
  categories: Category[], 
  selectedCategories: string[], 
  onCategoryChange: (id: string) => void 
}) => {
  return (
    <div className="space-y-8 border-b border-neutral-800 pb-10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center shadow-inner border border-green-500/20">
          <Film className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Tất cả phim</h1>
          <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-0.5">Khám phá kho phim đa dạng</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            selectedCategories.length === 0
              ? 'bg-green-600 text-white shadow-[0_8px_20px_-4px_rgba(34,197,94,0.4)] scale-105'
              : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 border border-neutral-800'
          }`}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat.idCategory}
            onClick={() => onCategoryChange(cat.idCategory)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
              selectedCategories.includes(cat.idCategory)
                ? 'bg-green-600 text-white shadow-[0_8px_20px_-4px_rgba(34,197,94,0.4)] scale-105'
                : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 border border-neutral-800'
            }`}
          >
            {cat.idCategory}
          </button>
        ))}
      </div>
    </div>
  );
});

const FilmList: React.FC = () => {
  const { categoriesCache, setCategoriesCache, filmListCache, setFilmListCache, hotMoviesCache, setHotMoviesCache } = useCache();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [hotMovies, setHotMovies] = useState<DashboardStatsResponse['topMovies']>(hotMoviesCache || []);
  const [categories, setCategories] = useState<Category[]>(categoriesCache || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const categoryKey = useMemo(() => 
    selectedCategories.length > 0 ? selectedCategories.sort().join(',') : 'all'
  , [selectedCategories]);

  const cachedFilms = useMemo(() => filmListCache[categoryKey], [filmListCache, categoryKey]);

  const [isLoading, setIsLoading] = useState(!cachedFilms || (hotMovies.length === 0));
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(cachedFilms?.page || 0);
  const [hasMore, setHasMore] = useState(cachedFilms ? cachedFilms.hasMore : true);
  const navigate = useNavigate();
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cachedFilms && movies.length === 0) {
      setMovies(cachedFilms.movies);
    }
  }, [cachedFilms, movies.length]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, {
      rootMargin: '100px',
      threshold: 0.1
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const fetchPromises: [Promise<DashboardStatsResponse | null>, Promise<Category[]>] = [
          !hotMoviesCache ? movieService.getDashboardStats(new Date().getMonth() + 1, new Date().getFullYear()) : Promise.resolve(null),
          Promise.resolve(categoriesCache || movieService.getCategories())
        ];

        const [stats, cats] = await Promise.all(fetchPromises);
        
        if (stats) {
          setHotMovies(stats.topMovies);
          setHotMoviesCache(stats.topMovies);
        }
        
        if (!categoriesCache) {
          setCategories(cats as Category[]);
          setCategoriesCache(cats as Category[]);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, [categoriesCache, setCategoriesCache, hotMoviesCache, setHotMoviesCache]);

  useEffect(() => {
    const fetchFilms = async () => {
      // Sử dụng cachedData từ useMemo để đảm bảo tính đồng bộ
      const cachedData = cachedFilms;
      
      if (page === 0 && cachedData && movies.length === 0) {
        setMovies(cachedData.movies);
        setPage(cachedData.page);
        setHasMore(cachedData.hasMore);
        setIsLoading(false);
        return;
      }

      if (cachedData && page <= cachedData.page && movies.length > 0) {
        setIsLoading(false);
        return;
      }

      try {
        if (page === 0) {
          if (movies.length === 0) {
            setIsLoading(true);
          } else {
            setIsCategoryLoading(true);
          }
        } else {
          setIsFetchingMore(true);
        }

        const pageResponse = await movieService.getPageMovies(page, 10, categoryKey);
        const newHasMore = page < pageResponse.totalPages - 1;

        let updatedMovies: Movie[];
        if (page === 0) {
          updatedMovies = pageResponse.data;
          setMovies(updatedMovies);
        } else {
          const existingIds = new Set(movies.map(m => m.idMovie));
          const newMovies = pageResponse.data.filter(m => !existingIds.has(m.idMovie));
          updatedMovies = [...movies, ...newMovies];
          setMovies(updatedMovies);
        }
        
        setHasMore(newHasMore);
        setFilmListCache(categoryKey, {
          movies: updatedMovies,
          page: page,
          hasMore: newHasMore
        });
        
      } catch (err: any) {
        setError('Không thể tải danh sách phim. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
        setIsCategoryLoading(false);
        setIsFetchingMore(false);
      }
    };

    fetchFilms();
  }, [page, categoryKey, cachedFilms]);

  const handleCategoryChange = useCallback((catId: string) => {
    setSelectedCategories(prev => {
      let newCategories: string[];
      if (catId === 'all') {
        if (prev.length === 0) return prev;
        newCategories = [];
      } else {
        if (prev.includes(catId)) {
          newCategories = prev.filter(id => id !== catId);
        } else {
          newCategories = [...prev, catId];
        }
      }
      
      const newKey = newCategories.length > 0 ? newCategories.sort().join(',') : 'all';
      const cachedData = filmListCache[newKey];
      if (cachedData) {
        setMovies(cachedData.movies);
        setPage(cachedData.page);
        setHasMore(cachedData.hasMore);
      }
      return newCategories;
    });
    setPage(0);
  }, [filmListCache]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <HotMoviesSection hotMovies={hotMovies} navigate={navigate} />

      <div className="space-y-10" ref={categoriesRef}>
        <CategoryFilter 
          categories={categories} 
          selectedCategories={selectedCategories} 
          onCategoryChange={handleCategoryChange} 
        />

        <div className="relative min-h-[400px] flex flex-col">
          {movies.length > 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 transition-opacity duration-300 ${isCategoryLoading || isLoading ? 'opacity-30' : 'opacity-100'}`}>
              {movies.map((movie, index) => (
                <div
                  key={movie.idMovie}
                  ref={index === movies.length - 1 ? lastElementRef : null}
                  className="group relative bg-neutral-900 rounded-[2rem] overflow-hidden border border-neutral-800/50 hover:border-green-500/30 transition-all duration-500 hover:-translate-y-2 shadow-2xl cursor-pointer"
                  onClick={() => navigate(`/movie/${movie.idMovie}`)}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img
                      src={movie.image}
                      alt={movie.nameMovie}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-80" />
                  </div>

                  <div className="p-6 space-y-4 relative bg-neutral-900">
                    <div className="space-y-3">
                      <h3 className="text-xl font-black text-white line-clamp-1 italic uppercase tracking-tighter group-hover:text-green-500 transition-colors">
                        {movie.nameMovie}
                      </h3>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {movie.categories?.map((c) => (
                          <span key={c.idCategory} className="text-[10px] font-black text-green-500 border border-green-500/20 bg-green-500/5 px-2.5 py-0.5 rounded-lg uppercase tracking-tight">
                            {c.idCategory}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-amber-500 bg-amber-500/5 w-fit px-3 py-1 rounded-lg border border-amber-500/10">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-black uppercase tracking-[0.1em]">{movie.duration} phút</span>
                      </div>
                    </div>

                    <button className="w-full py-3.5 bg-neutral-800 group-hover:bg-green-600 text-neutral-300 group-hover:text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 border border-neutral-700/50 group-hover:border-green-500/50 group-hover:shadow-[0_10px_20px_-5px_rgba(34,197,94,0.3)]">
                      Đặt vé ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !isCategoryLoading && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-neutral-900/50 rounded-[2.5rem] border border-dashed border-neutral-800">
              <div className="w-20 h-20 bg-neutral-800 rounded-3xl flex items-center justify-center mb-6">
                <Film className="w-10 h-10 text-neutral-600" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">Không tìm thấy phim phù hợp</h3>
              <p className="text-neutral-500 text-sm font-medium">Vui lòng thử chọn tổ hợp thể loại khác</p>
              <button 
                onClick={() => handleCategoryChange('all')}
                className="mt-8 px-6 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-500 text-xs font-black uppercase tracking-widest rounded-xl border border-green-500/20 transition-all"
              >
                Xem tất cả phim
              </button>
            </div>
          )}
        </div>

        {isFetchingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        )}

        {!hasMore && movies.length > 0 && (
          <div className="text-center py-8 text-neutral-500 italic">
            Bạn đã xem hết danh sách phim.
          </div>
        )}
      </div>

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-4 bg-green-600 text-white rounded-2xl shadow-[0_10px_30px_-5px_rgba(34,197,94,0.5)] transition-all duration-500 z-[100] hover:scale-110 active:scale-95 border border-green-400/30 ${
          showScrollTop ? 'translate-y-0 opacity-100 visible' : 'translate-y-20 opacity-0 invisible'
        }`}
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );
};

export default FilmList;
