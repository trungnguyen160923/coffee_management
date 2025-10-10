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
  }
};