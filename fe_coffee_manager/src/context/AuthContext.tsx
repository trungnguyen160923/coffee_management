import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch } from '../types';
import { authService } from '../services';
import { apiClient } from '../config/api';
import { setLocalStorageItem, clearAllAuthData } from '../utils/localStorage';
import { processApiError } from '../utils/errorMessages';
import { decodeJWT, extractUserFromJWT } from '../utils/jwt';

interface AuthContextType {
  user: User | null;
  managerBranch: Branch | null;
  login: (email: string, password: string) => Promise<{ user: User; token: string; refreshToken?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Remove mock users - now using real API

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [managerBranch, setManagerBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem('coffee-token');
        const savedRefresh = localStorage.getItem('coffee-refresh') || savedToken; // one-token fallback
        
        if (savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
          // Set the token in API client
          apiClient.setToken(savedToken);
          apiClient.setRefreshToken(savedRefresh);
          
          // Call /me API to get current user information
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            
            // If user is a manager or staff, set branch info directly from user data
            if ((currentUser.role === 'manager' || currentUser.role === 'staff') && currentUser.branch) {
              setManagerBranch(currentUser.branch);
            } else {
            }
          } catch (error) {
            console.error('Failed to get current user:', error);
            // Fallback: derive minimal user from JWT to preserve routing/guards
            const payload = savedToken ? decodeJWT(savedToken) : null;
            if (payload) {
              const minimal = extractUserFromJWT(payload);
              const fallbackUser: User = {
                id: minimal.id,
                email: minimal.email,
                name: minimal.email.split('@')[0],
                role: minimal.role,
                avatar: '',
              };
              setUser(fallbackUser);
            } else {
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Do not clear tokens aggressively during init
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Heartbeat: proactively refresh token before expiry even when idle
  useEffect(() => {
    const interval = window.setInterval(() => {
      // Refresh if access token will expire within 5 minutes
      apiClient.ensureFreshToken(300);
    }, 20 * 60 * 1000); // check every 20min
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      
      // If user is a manager or staff, set branch info directly from user data
      if ((response.user.role === 'manager' || response.user.role === 'staff') && response.user.branch) {
        setManagerBranch(response.user.branch);
      }
      
      // Save both user and token to localStorage using helper functions
      setLocalStorageItem('coffee-user', response.user);
      setLocalStorageItem('coffee-token', response.token);
      
      // Return response để Login component có thể sử dụng
      return response;
    } catch (error: any) {
      // Sử dụng utility function để xử lý error message
      const errorMessage = processApiError(error);
      
      // Nếu là lỗi role không hợp lệ, clear auth data
      if (errorMessage.includes('does not have permission to access the management system')) {
        setUser(null);
        clearAllAuthData();
      }
      
      // Tạo error mới với message đã xử lý
      const processedError = new Error(errorMessage);
      (processedError as any).originalError = error;
      throw processedError;
    } finally {
      // Do not toggle global loading here to avoid unmounting Login during submit
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setManagerBranch(null);
      // Clear both user and token from localStorage using helper function
      clearAllAuthData();
    }
  };

  // Global handler: if refresh fails repeatedly and tokens are invalid, force logout
  useEffect(() => {
    const onRefreshFail = (e: any) => {
      if (e?.detail === 'unauthenticated') {
        setUser(null);
        clearAllAuthData();
        // Redirect to login
        window.location.href = '/';
      }
    };
    window.addEventListener('auth-refresh-failed', onRefreshFail as EventListener);
    return () => window.removeEventListener('auth-refresh-failed', onRefreshFail as EventListener);
  }, []);

  return (
    <AuthContext.Provider value={{ user, managerBranch, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}