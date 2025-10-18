import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidToken, checkAndCleanExpiredToken } from '../utils/tokenUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra authentication khi component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData && isValidToken(token)) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } else {
        // Token hết hạn hoặc không hợp lệ
        checkAndCleanExpiredToken();
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Lắng nghe event tokenExpired từ httpClient
    const handleTokenExpired = () => {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/auth/login');
    };

    window.addEventListener('tokenExpired', handleTokenExpired);

    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [navigate]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cartId');
    // Không xóa guestId để giữ cart cho guest user
    // localStorage.removeItem('guestId');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/auth/login');
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
