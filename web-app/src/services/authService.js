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
    const response = await httpClient.get(API.GET_ME);
    return response.data;
  }
};