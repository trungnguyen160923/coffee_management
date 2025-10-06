import { apiClient } from '../config/api';
import { User } from '../types';
import { API_ENDPOINTS } from '../config/constants';
import { decodeJWT, extractUserFromJWT } from '../utils/jwt';

// Auth API interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  refreshToken?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  branchId?: string;
}

export interface AuthService {
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  register: (userData: RegisterRequest) => Promise<User>;
  refreshToken: () => Promise<LoginResponse>;
  getCurrentUser: () => Promise<User>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

// Auth Service Implementation
export const authService: AuthService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<{
      code: number;
      result: {
        token: string;
        expiryTime: string;
      };
    }>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    
    // Extract token from nested result
    const token = response.result.token;
    
    // Store token in API client (one-token model: use access token as refresh token too)
    apiClient.setToken(token);
    apiClient.setRefreshToken(token);
    
    // Decode JWT to check role first
    const payload = decodeJWT(token);
    if (!payload) {
      throw new Error('Invalid token format');
    }
    
    const userInfo = extractUserFromJWT(payload);
    
    // Check if user role is valid for management system BEFORE calling /me API
    const validRoles = ['admin', 'manager', 'staff'];
    if (!validRoles.includes(userInfo.role)) {
      // If customer tries to access, call logout API and clear data
      try {
        await this.logout();
      } catch (error) {
        console.error('Logout API failed:', error);
        // Continue with clearing local data even if logout API fails
      }
      
      // Clear token and user data immediately
      apiClient.setToken(null);
      localStorage.removeItem('coffee-user');
      localStorage.removeItem('coffee-token');
      throw new Error('Your account does not have permission to access the management system');
    }
    
    // Only call /me API if role is valid
    const userResponse = await this.getCurrentUser();
    
    return {
      token,
      user: userResponse,
      refreshToken: undefined
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token regardless of API call success
      apiClient.setToken(null);
    }
  },

  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response;
  },

  async refreshToken(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH);
    apiClient.setToken(response.token);
    return response;
  },

  async getCurrentUser(): Promise<User> {
    // Call /me API to get user information
    const response = await apiClient.get<{
      code: number;
      result: {
        user_id: number;
        email: string;
        fullname: string;
        phoneNumber: string;
        dob: string | null;
        avatarUrl: string | null;
        bio: string | null;
        role: {
          roleId: number;
          name: string;
        };
        identityCard: string | null;
        branch: {
          branchId: number;
          name: string;
          address: string;
          phone: string;
          managerUserId: number;
          openHours: string;
          endHours: string;
          createAt: string;
          updateAt: string;
        } | null;
        hireDate: string | null;
        position: string | null;
        salary: number | null;
        adminLevel: number | null;
        notes: string | null;
      };
    }>(API_ENDPOINTS.AUTH.ME);
    
    const userData = response.result;
    
    // Convert role name to lowercase for frontend
    const roleName = userData.role.name.toLowerCase();
    
    return {
      id: userData.user_id.toString(),
      email: userData.email,
      name: userData.fullname,
      role: roleName as 'admin' | 'manager' | 'staff',
      avatar: userData.avatarUrl || '',
      branchId: userData.branch?.branchId?.toString(),
      branch: userData.branch || undefined,
      // Map all backend fields
      user_id: userData.user_id,
      fullname: userData.fullname,
      phoneNumber: userData.phoneNumber,
      dob: userData.dob || undefined,
      avatarUrl: userData.avatarUrl || undefined,
      bio: userData.bio || undefined,
      identityCard: userData.identityCard || undefined,
      hireDate: userData.hireDate || undefined,
      position: userData.position || undefined,
      salary: userData.salary || undefined,
      adminLevel: userData.adminLevel || undefined,
      notes: userData.notes || undefined
    };
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      oldPassword,
      newPassword,
    });
  },
};

export default authService;
