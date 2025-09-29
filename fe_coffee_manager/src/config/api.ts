// API Configuration
const API_BASE_URL = import.meta.env.API_BASE_URL || 'http://localhost:8000';
const REFRESH_ENDPOINT = '/api/auth-service/auth/refresh';
// seconds before expiry to proactively refresh
// For long-lived tokens (e.g., 3600s), 5 minutes is a sensible buffer
const REFRESH_SKEW_SEC = 300;

// HTTP Client với interceptors
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    const rawAccess = localStorage.getItem('coffee-token');
    const rawRefresh = localStorage.getItem('coffee-refresh');
    // Handle legacy storage where token was JSON-stringified
    this.token = this.parseMaybeJSONString(rawAccess);
    this.refreshToken = this.parseMaybeJSONString(rawRefresh);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('coffee-token', token);
    } else {
      localStorage.removeItem('coffee-token');
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem('coffee-refresh', token);
    } else {
      localStorage.removeItem('coffee-refresh');
    }
  }

  private parseMaybeJSONString(value: string | null): string | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : value;
    } catch {
      return value;
    }
  }

  // Decode JWT exp (seconds). Returns 0 if invalid
  private getTokenExp(token?: string | null): number {
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload?.exp === 'number' ? payload.exp : 0;
    } catch {
      return 0;
    }
  }

  private isAccessExpiringSoon(skewSec = REFRESH_SKEW_SEC): boolean {
    const exp = this.getTokenExp(this.token);
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return now > exp - skewSec;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token');
    if (this.isRefreshing) return; // caller coordinates single refresh via flag
    this.isRefreshing = true;
    try {
      const res = await fetch(`${this.baseURL}${REFRESH_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.refreshToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.code && data.code !== 1000)) {
        throw new Error('Refresh failed');
      }
      // Accept multiple possible shapes
      const newAccess = data?.result?.accessToken || data?.result?.token || data?.result || data?.accessToken || data?.token;
      if (!newAccess) throw new Error('No access token returned');
      this.setToken(newAccess);
      // Optional rotation: if server returns new refresh
      const newRefresh = data?.result?.refreshToken || data?.refreshToken;
      if (newRefresh) {
        this.setRefreshToken(newRefresh);
      } else {
        // One-token model: use access token as next refresh token
        this.setRefreshToken(newAccess);
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Proactive refresh if token is about to expire
    if (this.token && this.refreshToken && this.isAccessExpiringSoon()) {
      try { await this.refreshAccessToken(); } catch {}
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      let response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // If unauthorized, try one-time refresh then retry
        if (response.status === 401 && this.refreshToken) {
          try {
            if (!this.isRefreshing) await this.refreshAccessToken();
            // Retry with updated token
            const retryConfig: RequestInit = {
              ...config,
              headers: {
                ...(config.headers || {}),
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` })
              }
            };
            response = await fetch(url, retryConfig);
            if (!response.ok) {
              const retryErrData = await response.json().catch(() => ({}));
              const retryError = new Error(retryErrData.message || `HTTP error! status: ${response.status}`);
              (retryError as any).status = response.status;
              (retryError as any).code = retryErrData.code;
              (retryError as any).response = retryErrData;
              throw retryError;
            }
          } catch (e) {
            // refresh failed
            const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
            (error as any).status = response.status;
            (error as any).code = errorData.code;
            (error as any).response = errorData;
            // Notify app to force logout
            try { window.dispatchEvent(new CustomEvent('auth-refresh-failed', { detail: 'unauthenticated' })); } catch {}
            throw error;
          }
        } else {
          // Tạo error object với thông tin chi tiết
          const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
          (error as any).status = response.status;
          (error as any).code = errorData.code;
          (error as any).response = errorData;
          
          throw error;
        }
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Public: allow callers (AuthContext heartbeat) to refresh proactively
  async ensureFreshToken(skewSec = REFRESH_SKEW_SEC): Promise<void> {
    if (!this.token || !this.refreshToken) return;
    if (this.isAccessExpiringSoon(skewSec)) {
      try {
        await this.refreshAccessToken();
      } catch (e) {
        console.warn('[API] ensureFreshToken failed', e);
      }
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
