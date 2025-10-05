import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const orderService = {
    createOrder: async (payload) => {
        const response = await httpClient.post(API.CREATE_ORDER, payload);
        return response.data.result;
    },

    createGuestOrder: async (payload) => {
        const response = await httpClient.post(API.CREATE_GUEST_ORDER, payload);
        return response.data.result;
    },

    getOrdersByCustomer: async (customerId) => {
        const response = await httpClient.get(`${API.GET_ORDERS_BY_CUSTOMER}/${customerId}`);
        return response.data;
    }
};

export default orderService;


