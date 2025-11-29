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
  const token = localStorage.getItem('token');
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    
    // Debug: Log token được thêm vào header (chỉ log một phần để không expose full token)
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      console.log('[httpClient] Adding token to request:', config.url, 'Token prefix:', token.substring(0, 20) + '...');
    }
    
    // Nếu đã đăng nhập, thêm X-User-Id vào header
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.userId) {
          config.headers['X-User-Id'] = userData.userId.toString();
        }
      } catch (e) {
        console.warn('Failed to parse user data for X-User-Id header', e);
      }
    }
  } else {
    // Debug: Log khi không có token hoặc token hết hạn
    console.warn('[httpClient] No valid token for request:', config.url, {
      hasToken: !!token,
      isExpired: token ? isTokenExpired(token) : 'N/A'
    });
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
