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
        // Token hết hạn hoặc không hợp lệ - chỉ redirect nếu không phải API public
        clearAuthData();
        
        // Dispatch event để thông báo cho các component khác
        window.dispatchEvent(new CustomEvent('tokenExpired'));
        
        // Chuyển hướng về trang login nếu không phải trang login
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;
