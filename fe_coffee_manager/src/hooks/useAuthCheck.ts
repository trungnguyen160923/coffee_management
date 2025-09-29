import { useState, useEffect } from 'react';

// Hook để kiểm tra trạng thái đăng nhập mà không gọi API
export function useAuthCheck() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = () => {
      const savedUser = localStorage.getItem('coffee-user');
      const savedToken = localStorage.getItem('coffee-token');
      
      // Chỉ set authenticated nếu có cả user và token
      setIsAuthenticated(!!(savedUser && savedToken));
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  return { isAuthenticated, isLoading };
}
