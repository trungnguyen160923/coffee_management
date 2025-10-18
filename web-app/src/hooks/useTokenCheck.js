import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkAndCleanExpiredToken } from '../utils/tokenUtils';

/**
 * Hook để kiểm tra token định kỳ và tự động logout khi token hết hạn
 */
export const useTokenCheck = () => {
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Kiểm tra token mỗi 30 giây
    const interval = setInterval(() => {
      if (!checkAndCleanExpiredToken()) {
        // Token đã hết hạn, logout
        logout();
      }
    }, 30000); // 30 giây

    // Kiểm tra ngay khi component mount
    if (!checkAndCleanExpiredToken()) {
      logout();
    }

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);
};
