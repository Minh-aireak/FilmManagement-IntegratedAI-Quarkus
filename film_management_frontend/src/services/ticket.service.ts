import api from './api';
import { type BookingResponseDTO, type BookingRequest, type Bill, type PageResponse, type AdminBillResponse, type SeatStatusDTO } from '../types';

export const bookingService = {

  getBookedSeats: async (idShowtime: string) => {
    const response = await api.get<string[]>(`/bookings/seats/${idShowtime}`);
    return response.data;
  },

  getSeatStatuses: async (idShowtime: string) => {
    const response = await api.get<SeatStatusDTO[]>(`/bookings/seats/status/${idShowtime}`);
    return response.data;
  },

  bookTickets: async (bookingRequest: BookingRequest) => {
    const response = await api.post<BookingResponseDTO>('/bookings', bookingRequest, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  getBillDetail: async (idBill: string) => {
    const response = await api.get<BookingResponseDTO>(`/tickets/bills/${idBill}`);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get<Bill[]>(`/tickets/history`);
    return response.data;
  },

  cancelBooking: async (idBill: string) => {
    const response = await api.delete<string>(`/tickets/cancel/${idBill}`);
    return response.data;
  },

  getAllBills: async (page: number, size: number, searchTerm?: string, idMovie?: string, idShowtime?: string) => {
    const response = await api.get<PageResponse<AdminBillResponse[]>>('/tickets/admin/bills', {
      params: { 
        page, 
        size,
        searchTerm: searchTerm || undefined,
        idMovie: idMovie !== 'all' ? idMovie : undefined,
        idShowtime: idShowtime !== 'all' ? idShowtime : undefined
      }
    });
    return response.data;
  },
};
