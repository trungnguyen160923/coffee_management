import apiClient from '../config/api';

export interface NotificationDto {
  id: string;
  userId: number;
  branchId?: number | null;
  title: string;
  content: string;
  channel: string;
  status: string;
  read: boolean;
  createdAt: string;
  metadata?: string | null; // JSON string containing orderId, reservationId, etc.
}

export async function fetchBranchNotifications(branchId: number, limit = 50, role?: string) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (role) {
    params.append('role', role);
  }
  const response = await apiClient.get<{
    result: NotificationDto[];
  }>(`/api/notification-service/notifications/branch/${branchId}?${params.toString()}`);
  return response.result;
}

export async function fetchUserNotifications(userId: number, limit = 50, role?: string) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (role) {
    params.append('role', role);
  }
  const response = await apiClient.get<{
    result: NotificationDto[];
  }>(`/api/notification-service/notifications/user/${userId}?${params.toString()}`);
  return response.result;
}

export async function markNotificationAsRead(notificationId: string) {
  await apiClient.put(`/api/notification-service/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsRead(branchId?: number, userId?: number) {
  if (branchId) {
    await apiClient.put(`/api/notification-service/notifications/branch/${branchId}/read-all`);
  } else if (userId) {
    await apiClient.put(`/api/notification-service/notifications/user/${userId}/read-all`);
  }
}

