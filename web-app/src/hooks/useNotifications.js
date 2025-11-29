import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotificationWebSocket } from './useNotificationWebSocket';
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { showToast } from '../utils/toast';

export function useNotifications({ userId, enabled = true, role }) {
  const [notifications, setNotifications] = useState([]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markAsRead = useCallback(async (notificationId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((noti) => (noti.id === notificationId ? { ...noti, isRead: true } : noti))
    );
    
    // Call API to mark as read
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      // Revert on error
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === notificationId ? { ...noti, isRead: false } : noti))
      );
      console.error('[Notifications] Failed to mark notification as read', error);
    }
  }, []);

  const addNotification = useCallback((payload) => {
    setNotifications((prev) => [{ ...payload, isRead: false }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    let isActive = true;
    const fetchInitial = async () => {
      if (!enabled || !userId) {
        setNotifications([]);
        return;
      }
      
      // Kiểm tra token trước khi gọi API
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[useNotifications] No token found, skipping fetch');
        return;
      }
      
      try {
        const response = await fetchUserNotifications(userId, 50, role);
        if (!isActive) return;
        setNotifications(
          response.map((item) => ({
            id: item.id,
            type: item.channel,
            title: item.title,
            content: item.content,
            branchId: item.branchId ?? undefined,
            userId: item.userId ?? undefined,
            createdAt: item.createdAt,
            isRead: item.read,
            metadata: item.metadata, // Include metadata for reservation/order navigation
          }))
        );
      } catch (error) {
        // Nếu 401, có thể token không hợp lệ - dispatch event để logout
        if (error.response?.status === 401) {
          console.warn('[Notifications] 401 Unauthorized - Token may be invalid');
          // Dispatch event để AuthContext xử lý logout
          window.dispatchEvent(new CustomEvent('tokenExpired'));
        } else {
          console.error('[Notifications] Failed to fetch initial list', error);
        }
      }
    };

    fetchInitial();

    return () => {
      isActive = false;
    };
  }, [userId, enabled, role]);

  const handleIncomingMessage = useCallback(
    (payload) => {
      addNotification(payload);
      // Show toast notification
      const title = payload.title || 'Thông báo mới';
      const content = payload.content || '';
      // Combine title and content for toast
      const message = content ? `${title}: ${content}` : title;
      showToast(message, 'success', 4000);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: content,
          icon: '/logo/logo.png',
        });
      }
    },
    [addNotification]
  );

  const { isConnected } = useNotificationWebSocket({
    userId,
    enabled,
    onMessage: handleIncomingMessage,
  });

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((noti) => ({ ...noti, isRead: true }))
    );
    
    // Call API to mark all as read
    try {
      await markAllNotificationsAsRead(undefined, userId);
    } catch (error) {
      // Revert on error - refetch from server
      const response = await fetchUserNotifications(userId, 50, role);
      setNotifications(response.map((item) => ({
        id: item.id,
        type: item.channel,
        title: item.title,
        content: item.content,
        branchId: item.branchId ?? undefined,
        userId: item.userId ?? undefined,
        createdAt: item.createdAt,
        isRead: item.read,
        metadata: item.metadata, // Include metadata for reservation/order navigation
      })));
      console.error('[Notifications] Failed to mark all notifications as read', error);
    }
  }, [userId, role]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
}

