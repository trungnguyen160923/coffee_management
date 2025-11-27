import httpClient from '../configurations/httpClient';
import { API, CONFIG } from '../configurations/configuration';
import axios from 'axios';

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
    },

    cancelOrder: async (orderId) => {
        const response = await httpClient.put(`${API.CANCEL_ORDER}/${orderId}/status?status=CANCELLED`);
        return response.data;
    },

    getOrderByIdPublic: async (orderId) => {
        // Create a separate axios instance for public endpoints without authentication
        const publicClient = axios.create({
            baseURL: CONFIG.API_GATEWAY,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await publicClient.get(`${API.GET_ORDER_BY_ID_PUBLIC}/${orderId}`);
        return response.data;
    },

    cancelOrderPublic: async (orderId) => {
        const response = await httpClient.put(`${API.CANCEL_ORDER_PUBLIC}/${orderId}/cancel`);
        return response.data;
    }
};

export default orderService;


