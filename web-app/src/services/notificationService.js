import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const notificationService = {
  notifyOrderCreated: async (payload) => {
    try {
      await httpClient.post(API.NOTIFY_ORDER_CREATED, payload);
    } catch (error) {
      console.error('Failed to notify order created:', error);
    }
  },
};

export default notificationService;


