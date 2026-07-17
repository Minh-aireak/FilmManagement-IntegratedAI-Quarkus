import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8888';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const isAuthRequest = config.url?.includes('/auth/');
    
    if (!isAuthRequest) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const { token } = JSON.parse(userStr);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu có phản hồi từ server (ví dụ lỗi 400, 401)
    if (error.response) {
      const isAuthRequest = error.config?.url?.includes('/auth/');
      const isAlreadyOnLoginPage = window.location.pathname === '/login';

      if (error.response?.status === 401 && !isAuthRequest && !isAlreadyOnLoginPage) {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    // Nếu là lỗi kết nối mạng
    return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra Gateway.'));
  }
);

export default api;
