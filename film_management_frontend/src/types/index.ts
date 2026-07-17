export interface Account {
  idAccount?: string;
  phone: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  gender: string;
  role: 'ADMIN' | 'CUSTOMER';
  active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  nameDisplay: string;
}

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  result: T;
}

export interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElement: number;
  data: T;
}

export interface MovieRequest {
  nameMovie: string;
  author: string;
  actors: string; 
  duration: string;
  language: string;
  description: string;
  image: string;
  idCategories: string[];
}

export interface Category {
  idCategory: string;
}

export interface Movie {
  idMovie: string;
  nameMovie: string;
  author: string;
  actors: string; 
  duration: string;
  language: string;
  description: string;
  image: string;
  createdAt: string;
  categories: Category[];
}

export interface Bill {
  idBill: string;
  idAccount: string;
  createdAt: string;
  totalAmount: number;
}

export interface AdminBillResponse {
  idBill: string;
  idAccount: string;
  createdAt: string;
  totalAmount: number;
  tickets: Ticket[];
  movieName: string;
  showTime: string;
}

export interface DashboardStatsResponse {
  totalMovies: number;
  totalTickets: number;
  totalRevenue: number;
  topMovies: {
     movieName: string;
     image: string;
     ticketCount: number;
     idMovie: string;
   }[];
  topTimeSlots: {
    label: string;
    count: number;
  }[];
}

export interface Ticket {
  idTicket: string;
  idBill: string;
  idShowtime: string;
  seatCode: string;
  price: number;
}

export interface Room {
  idRoom: string;
}

export interface RoomeSeat {
  idRoom: string;
  seatCode: string;
  typeSeat: 'STANDARD' | 'VIP' | 'COUPLE';
}

export interface Seat {
  id: string;
  roomId: string;
  row: string;
  column: number;
  type: 'STANDARD' | 'VIP' | 'COUPLE';
  price: number;
  isBooked?: boolean;
}

export interface Showtime {
  idShowtime: string;
  idMovie: string; 
  idRoom: string;
  showTime: string;
  movieName?: string;
  movieImage?: string;
}

export interface AddShowtimeRequest {
  idMovie: string;
  idRoom: string;
  showTime: string;
  standardPrice: number;
  vipPrice: number;
  couplePrice: number;
}

export interface ShowPrice {
  idShowtime: string;
  standardPrice: number;
  vipPrice: number;
  couplePrice: number;
}

export interface ShowtimeSeat {
  idShowtime: string;
  seatCode: string;
  status: 'AVAILABLE' | 'BOOKED';
}

export interface SeatStatusDTO {
  seatCode: string;
  typeSeat: 'STANDARD' | 'VIP' | 'COUPLE';
  status: string;
  price: number;
}

export interface BookingResponseDTO {
  bill: Bill;
  tickets: Ticket[];
}

export interface BookingRequest {
  idShowtime: string;
  seatCodes: string[];
}

