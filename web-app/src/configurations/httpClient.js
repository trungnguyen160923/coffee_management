import axios from "axios";
import { CONFIG } from "./configuration";
import { isTokenExpired, clearAuthData } from "../utils/tokenUtils";

const httpClient = axios.create({
  baseURL: CONFIG.API_GATEWAY,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor để thêm token, user_id và guestId vào header
httpClient.interceptors.request.use((config) => {
  // Đảm bảo headers object tồn tại
  if (!config.headers) {
    config.headers = {};
  }
  
  const token = localStorage.getItem('token');
  if (token && !isTokenExpired(token)) {
    // Đảm bảo token được thêm vào header
    config.headers.Authorization = `Bearer ${token}`;
    
    // Nếu đã đăng nhập, thêm X-User-Id vào header
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.userId) {
          config.headers['X-User-Id'] = userData.userId.toString();
        }
      } catch (e) {
        // Silent fail
      }
    }
  }
  
  // Tự động thêm X-Guest-Id nếu chưa có trong header
  // Luôn thêm guestId để đảm bảo nhất quán, kể cả khi đã đăng nhập
  if (!config.headers['X-Guest-Id']) {
    let guestId = localStorage.getItem('guestId');
    if (!guestId) {
      // Tạo guestId mới nếu chưa có
      guestId = `GUEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestId', guestId);
    }
    config.headers['X-Guest-Id'] = guestId;
  }
  
  return config;
});

// Response interceptor để xử lý token hết hạn
httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Kiểm tra xem có phải API public không cần token
      const isPublicAPI = error.config?.url?.includes('/stocks/') || 
                         error.config?.url?.includes('/products/') ||
                         error.config?.url?.includes('/branches') ||
                         error.config?.url?.includes('/reviews') ||
                         error.config?.url?.includes('/order-service/branches') ||
                         error.config?.url?.includes('/order-service/reviews');
      
      if (!isPublicAPI) {
        // Kiểm tra xem có phải lỗi do thiếu token (không phải token hết hạn)
        const token = localStorage.getItem('token');
        if (!token) {
          // Không có token - có thể là request được gọi trước khi login hoàn tất
          // Không xóa auth data, chỉ log warning
          console.warn('[httpClient] 401 Unauthorized - No token found. Request may have been called before login completed.');
          return Promise.reject(error);
        }
        
        // Có token nhưng vẫn 401 - có thể token hết hạn hoặc không hợp lệ
        // Kiểm tra xem token có hết hạn không
        if (isTokenExpired(token)) {
          // Token hết hạn - xóa auth data và redirect
          clearAuthData();
          window.dispatchEvent(new CustomEvent('tokenExpired'));
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        } else {
          // Token còn hiệu lực nhưng vẫn 401 - token không hợp lệ hoặc không được backend chấp nhận
          // Xóa auth data và logout ngay
          console.warn('[httpClient] 401 Unauthorized - Token is valid but request was rejected. Logging out. URL:', error.config?.url);
          clearAuthData();
          window.dispatchEvent(new CustomEvent('tokenExpired'));
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;
