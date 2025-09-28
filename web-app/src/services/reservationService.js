import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

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
    }
};
