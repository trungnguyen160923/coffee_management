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
}

export async function fetchBranchNotifications(branchId: number, limit = 50) {
  const response = await apiClient.get<{
    result: NotificationDto[];
  }>(`/api/notification-service/notifications/branch/${branchId}?limit=${limit}`);
  return response.result;
}

export async function fetchUserNotifications(userId: number, limit = 50) {
  const response = await apiClient.get<{
    result: NotificationDto[];
  }>(`/api/notification-service/notifications/user/${userId}?limit=${limit}`);
  return response.result;
}

