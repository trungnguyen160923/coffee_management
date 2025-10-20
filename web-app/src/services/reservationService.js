import httpClient from '../configurations/httpClient';
import { API, CONFIG } from '../configurations/configuration';
import axios from 'axios';

export const reservationService = {
    createReservation: async (reservationData) => {
        const response = await httpClient.post(API.CREATE_RESERVATION, reservationData);
        return response.data;
    },

    getBranches: async () => {
        const response = await httpClient.get(API.GET_BRANCHES);
        return response.data;
    },

    getReservationsByCustomer: async (customerId) => {
        const response = await httpClient.get(`${API.GET_RESERVATIONS_BY_CUSTOMER}/${customerId}`);
        return response.data;
    },

    cancelReservation: async (reservationId) => {
        const response = await httpClient.put(`${API.CANCEL_RESERVATION}/${reservationId}/cancel`);
        return response.data;
    },

    getReservationByIdPublic: async (reservationId) => {
        // Create a separate axios instance for public endpoints without authentication
        const publicClient = axios.create({
            baseURL: CONFIG.API_GATEWAY,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await publicClient.get(`${API.GET_RESERVATION_BY_ID_PUBLIC}/${reservationId}`);
        return response.data;
    },

    cancelReservationPublic: async (reservationId) => {
        // Create a separate axios instance for public endpoints without authentication
        const publicClient = axios.create({
            baseURL: CONFIG.API_GATEWAY,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
            },
        });

        const response = await publicClient.put(`${API.CANCEL_RESERVATION_PUBLIC}/${reservationId}/cancel`);
        return response.data;
    }
};
