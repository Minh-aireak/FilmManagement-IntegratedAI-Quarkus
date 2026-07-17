import api from './api';
import { type MovieRequest, type Movie, type Showtime, type ApiResponse, type Category, type PageResponse, type Room, type AddShowtimeRequest, type DashboardStatsResponse } from '../types';

export const movieService = {
  getPageMovies: async (page: number, size: number, category?: string) => {
    const response = await api.get<ApiResponse<PageResponse<Movie[]>>>('/movies', {
    params: {
      page,
      size,
      category
    }
  });
    return response.data.result;
  },

  getShowtimesByMovie: async (idMovie: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponse<Showtime[]>>>(`/showtimes/${idMovie}`, {
      params: {
        page,
        size
      }
    });
    return response.data.result;
  },

  getMoviesByDate: async (date: string, page: number, size: number) => {
    const response = await api.get<ApiResponse<PageResponse<Movie[]>>>(`/movies/date/${date}`, {
    params: {
      page,
      size
    }
  });
    return response.data.result;
  },

  getAllShowtimes: async (page: number, size: number, status: string = 'upcoming', movieId?: string, date?: string, roomId?: string) => {
    const response = await api.get<ApiResponse<PageResponse<Showtime[]>>>('/showtimes', {
    params: {
      page,
      size,
      status,
      movieId,
      date,
      roomId
    }
  });
    return response.data.result;
  },

  getMovieById: async (idMovie: string) => {
    const response = await api.get<ApiResponse<Movie>>(`/movies/${idMovie}`);
    return response.data.result;
  },
  
  createMovie: async (movieData: MovieRequest) => {
    const response = await api.post<ApiResponse<Movie>>('/movies', movieData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.result;
  },

  updateMovie: async (idMovie: string, movieData: MovieRequest) => {
    const response = await api.put<ApiResponse<Movie>>(`/movies/${idMovie}`, movieData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.result;
  },

  deleteMovie: async (idMovie: string) => {
    const response = await api.delete<ApiResponse<void>>(`/movies/${idMovie}`);
    return response.data.result;
  },

  getCategories: async () => {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    return response.data.result;
  },

  createCategory: async (idCategory: string) => {
    const response = await api.post<ApiResponse<Category>>(`/categories?idCategory=${idCategory}`, {}, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.result;
  },

  deleteCategory: async (idCategory: string) => {
    const response = await api.delete<ApiResponse<void>>(`/categories?idCategory=${idCategory}`);
    return response.data.result;
  },

  createShowtime: async (showtimeData: AddShowtimeRequest) => {
    const response = await api.post<ApiResponse<Showtime>>('/showtimes', showtimeData, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.result;
  },

  deleteShowtime: async (idShowtime: string) => {
    const response = await api.delete<ApiResponse<void>>(`/showtimes/${idShowtime}`);
    return response.data.result;
  },

  getRooms: async () => {
    const response = await api.get<ApiResponse<Room[]>>('/rooms');
    return response.data.result;
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<string>>(
      '/images/upload',
      formData
    );
    return response.data.result;
  },

  getDashboardStats: async (month: number, year: number) => {
    const response = await api.get<ApiResponse<DashboardStatsResponse>>('/stats/dashboard', {
      params: { month, year }
    });
    return response.data.result;
  }
};
