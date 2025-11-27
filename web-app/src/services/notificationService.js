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
  notifyReservationCreated: async (payload) => {
    try {
      await httpClient.post(API.NOTIFY_RESERVATION_CREATED, payload);
    } catch (error) {
      console.error('Failed to notify reservation created:', error);
    }
  },
};

export async function fetchUserNotifications(userId, limit = 50, role) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (role) {
    params.append('role', role);
  }
  const response = await httpClient.get(
    `/notification-service/notifications/user/${userId}?${params.toString()}`
  );
  return response.data.result || [];
}

export async function markNotificationAsRead(notificationId) {
  await httpClient.put(`/notification-service/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsRead(branchId, userId) {
  if (branchId) {
    await httpClient.put(`/notification-service/notifications/branch/${branchId}/read-all`);
  } else if (userId) {
    await httpClient.put(`/notification-service/notifications/user/${userId}/read-all`);
  }
}

export default notificationService;


