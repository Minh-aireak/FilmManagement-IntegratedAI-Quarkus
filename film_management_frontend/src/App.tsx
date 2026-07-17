import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import FilmList from './pages/FilmList';
import MovieDetail from './pages/MovieDetail';
import Showtimes from './pages/Showtimes';
import SeatSelection from './pages/SeatSelection';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminFilms from './pages/AdminFilms';
import AddFilm from './pages/AddFilm';
import AdminAccounts from './pages/AdminAccounts';
import AdminBookings from './pages/AdminBookings';
import AdminDashboard from './pages/AdminDashboard';
import AdminCategories from './pages/AdminCategories';
import AdminShowtimes from './pages/AdminShowtimes';
import BillDetail from './pages/BillDetail';
import History from './pages/History';
import Profile from './pages/Profile';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { CacheProvider } from './context/CacheContext';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CacheProvider>
          <Router>
            <Layout>
              <Routes>
              <Route path="/" element={<FilmList />} />
              <Route path="/movie/:movieId" element={<MovieDetail />} />
            <Route path="/showtimes" element={<Showtimes />} />
            <Route path="/seat-selection/:showtimeId" element={<SeatSelection />} />
            <Route path="/bill-detail/:billId" element={<BillDetail />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/movies" element={<AdminFilms />} />
              <Route path="/admin/movies/add" element={<AddFilm />} />
              <Route path="/admin/movies/edit/:id" element={<AddFilm />} />
              <Route path="/admin/accounts" element={<AdminAccounts />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/showtimes" element={<AdminShowtimes />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </CacheProvider>
    </AuthProvider>
  </ToastProvider>
);
}

export default App;
