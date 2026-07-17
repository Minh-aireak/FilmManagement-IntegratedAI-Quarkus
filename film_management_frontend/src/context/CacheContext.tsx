import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { type Movie, type Showtime, type Room, type Account, type Category, type AdminBillResponse, type DashboardStatsResponse, type Bill } from '../types';

interface FilmListCache {
  [category: string]: {
    movies: Movie[];
    page: number;
    hasMore: boolean;
  };
}

interface AdminFilmsCache {
  films: Movie[];
  page: number;
  totalPages: number;
  category?: string;
}

interface AdminShowtimesCache {
  showtimes: Showtime[];
  movies: Movie[];
  rooms: Room[];
  page: number;
  totalPages: number;
  timeFilter: 'upcoming' | 'past';
  movieId?: string;
  date?: string;
  roomId?: string;
}

interface AdminAccountsCache {
  accounts: Account[];
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'locked';
}

interface AdminBookingsCache {
  bills: AdminBillResponse[];
  page: number;
  totalPages: number;
  searchTerm: string;
}

interface FilmWithShowtimes extends Movie {
  showtimes: Showtime[];
}

interface ShowtimesPageCache {
  [date: string]: {
    films: FilmWithShowtimes[];
    page: number;
    hasMore: boolean;
  };
}

interface MovieDetailCache {
  [movieId: string]: {
    movie: Movie;
    showtimes: Showtime[];
  };
}

interface CacheContextType {
  filmListCache: FilmListCache;
  setFilmListCache: (category: string, data: { movies: Movie[], page: number, hasMore: boolean } | null) => void;
  adminFilmsCache: AdminFilmsCache | null;
  setAdminFilmsCache: (data: AdminFilmsCache | null) => void;
  adminShowtimesCache: AdminShowtimesCache | null;
  setAdminShowtimesCache: (data: AdminShowtimesCache | null) => void;
  adminAccountsCache: AdminAccountsCache | null;
    setAdminAccountsCache: (data: AdminAccountsCache | null) => void;
    adminBookingsCache: AdminBookingsCache | null;
    setAdminBookingsCache: (data: AdminBookingsCache | null) => void;
    showtimesPageCache: ShowtimesPageCache;
  setShowtimesPageCache: (date: string, data: { films: FilmWithShowtimes[], page: number, hasMore: boolean } | null) => void;
  movieDetailCache: MovieDetailCache;
  setMovieDetailCache: (movieId: string, data: { movie: Movie, showtimes: Showtime[] } | null) => void;
  profileCache: Account | null;
  setProfileCache: (data: Account | null) => void;
  categoriesCache: Category[] | null;
    setCategoriesCache: (data: Category[] | null) => void;
    hotMoviesCache: DashboardStatsResponse['topMovies'] | null;
    setHotMoviesCache: (data: DashboardStatsResponse['topMovies'] | null) => void;
    historyCache: Bill[] | null;
    setHistoryCache: (data: Bill[] | null) => void;
    clearFilmListCache: () => void;
  clearShowtimesPageCache: () => void;
  clearCache: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filmListCache, setFilmListCacheInternal] = useState<FilmListCache>({});
  const [adminFilmsCache, setAdminFilmsCache] = useState<AdminFilmsCache | null>(null);
  const [adminShowtimesCache, setAdminShowtimesCache] = useState<AdminShowtimesCache | null>(null);
  const [adminAccountsCache, setAdminAccountsCache] = useState<AdminAccountsCache | null>(null);
  const [adminBookingsCache, setAdminBookingsCache] = useState<AdminBookingsCache | null>(null);
  const [showtimesPageCache, setShowtimesPageCacheInternal] = useState<ShowtimesPageCache>({});
  const [movieDetailCache, setMovieDetailCacheInternal] = useState<MovieDetailCache>({});
  const [profileCache, setProfileCache] = useState<Account | null>(null);
  const [categoriesCache, setCategoriesCache] = useState<Category[] | null>(null);
  const [hotMoviesCache, setHotMoviesCache] = useState<DashboardStatsResponse['topMovies'] | null>(null);
  const [historyCache, setHistoryCache] = useState<Bill[] | null>(null);

  const setFilmListCache = (category: string, data: { movies: Movie[], page: number, hasMore: boolean } | null) => {
    setFilmListCacheInternal(prev => {
      if (data === null) {
        const newCache = { ...prev };
        delete newCache[category];
        return newCache;
      }
      return {
        ...prev,
        [category]: data
      };
    });
  };

  const setShowtimesPageCache = (date: string, data: { films: FilmWithShowtimes[], page: number, hasMore: boolean } | null) => {
    setShowtimesPageCacheInternal(prev => {
      if (data === null) {
        const newCache = { ...prev };
        delete newCache[date];
        return newCache;
      }
      return {
        ...prev,
        [date]: data
      };
    });
  };

  const setMovieDetailCache = (movieId: string, data: { movie: Movie, showtimes: Showtime[] } | null) => {
    setMovieDetailCacheInternal(prev => {
      if (data === null) {
        const newCache = { ...prev };
        delete newCache[movieId];
        return newCache;
      }
      return {
        ...prev,
        [movieId]: data
      };
    });
  };

  const clearFilmListCache = () => {
    setFilmListCacheInternal({});
  };

  const clearShowtimesPageCache = () => {
    setShowtimesPageCacheInternal({});
  };

  const clearCache = () => {
    setFilmListCacheInternal({});
    setAdminFilmsCache(null);
    setAdminShowtimesCache(null);
    setAdminAccountsCache(null);
    setAdminBookingsCache(null);
    setShowtimesPageCacheInternal({});
    setMovieDetailCacheInternal({});
    setProfileCache(null);
    setCategoriesCache(null);
    setHotMoviesCache(null);
    setHistoryCache(null);
  };

  const value = useMemo(() => ({
    filmListCache,
    setFilmListCache,
    adminFilmsCache,
    setAdminFilmsCache,
    adminShowtimesCache,
    setAdminShowtimesCache,
    adminAccountsCache,
    setAdminAccountsCache,
    adminBookingsCache,
    setAdminBookingsCache,
    showtimesPageCache,
    setShowtimesPageCache,
    movieDetailCache,
    setMovieDetailCache,
    profileCache,
    setProfileCache,
    categoriesCache,
    setCategoriesCache,
    hotMoviesCache,
    setHotMoviesCache,
    historyCache,
    setHistoryCache,
    clearFilmListCache,
    clearShowtimesPageCache,
    clearCache
  }), [
    filmListCache, 
    adminFilmsCache, 
    adminShowtimesCache, 
    adminAccountsCache, 
    adminBookingsCache, 
    showtimesPageCache, 
    movieDetailCache, 
    profileCache, 
    categoriesCache, 
    hotMoviesCache, 
    historyCache
  ]);

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};
