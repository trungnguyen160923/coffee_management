import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const authService = {
  login: async (email, password) => {
    const response = await httpClient.post(API.LOGIN, {
      email,
      password
    });
    return response.data;
  },

  logout: async () => {
    const response = await httpClient.post(API.LOGOUT);
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await httpClient.get(`${API.GET_USER_BY_ID}/${userId}`);
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await httpClient.post(API.CREATE_CUSTOMER, customerData);
    return response.data;
  },

  getMyProfile: async () => {
    const response = await httpClient.get(API.MY_INFO);
    return response.data;
  },

  getMe: async () => {
    console.log('[authService] getMe() called');
    // Đảm bảo token được gửi trong request
    const token = localStorage.getItem('token');
    console.log('[authService] Token from localStorage', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'null'
    });
    
    const config = token ? {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } : {};
    console.log('[authService] Request config', {
      url: API.GET_ME,
      hasConfig: !!config,
      hasAuthHeader: !!config.headers?.Authorization
    });
    
    console.log('[authService] Sending GET request to', API.GET_ME);
    const response = await httpClient.get(API.GET_ME, config);
    console.log('[authService] Response received', {
      status: response.status,
      hasData: !!response.data,
      data: response.data
    });
    return response.data;
  }
};