import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { NotificationPayload, useNotificationWebSocket } from './useNotificationWebSocket';
import { fetchBranchNotifications, fetchUserNotifications } from '../services/notificationService';
import { NotificationToast } from '../components/notifications/NotificationToast';

interface NotificationState extends NotificationPayload {
  isRead?: boolean;
}

interface UseNotificationsOptions {
  branchId?: number | null;
  userId?: number | null;
  enabled?: boolean;
}

export function useNotifications({ branchId, userId, enabled = true }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((noti) => (noti.id === notificationId ? { ...noti, isRead: true } : noti)),
    );
  }, []);

  const addNotification = useCallback((payload: NotificationPayload) => {
    setNotifications((prev) => [{ ...payload, isRead: false }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    let isActive = true;
    const fetchInitial = async () => {
      if (!enabled || (!branchId && !userId)) {
        setNotifications([]);
        return;
      }
      try {
        let data: { payload: NotificationPayload; read: boolean }[] = [];
        if (branchId) {
          const response = await fetchBranchNotifications(branchId, 50);
          data = response.map((item) => ({
            payload: {
              id: item.id,
              type: item.channel,
              title: item.title,
              content: item.content,
              branchId: item.branchId ?? undefined,
              userId: item.userId ?? undefined,
              createdAt: item.createdAt,
            },
            read: item.read,
          }));
        } else if (userId) {
          const response = await fetchUserNotifications(userId, 50);
          data = response.map((item) => ({
            payload: {
              id: item.id,
              type: item.channel,
              title: item.title,
              content: item.content,
              branchId: item.branchId ?? undefined,
              userId: item.userId ?? undefined,
              createdAt: item.createdAt,
            },
            read: item.read,
          }));
        }
        if (!isActive) return;
        setNotifications(
          data.map(({ payload, read }) => ({
            ...payload,
            isRead: read,
          })),
        );
      } catch (error) {
        console.error('[Notifications] Failed to fetch initial list', error);
      }
    };

    fetchInitial();

    return () => {
      isActive = false;
    };
  }, [branchId, userId, enabled]);

  const handleIncomingMessage = useCallback(
    (payload: NotificationPayload) => {
      addNotification(payload);
      toast.custom(
        (t) => (
          <NotificationToast
            visible={t.visible}
            title={payload.title ?? 'Thông báo mới'}
            content={payload.content}
          />
        ),
        { duration: 4000 },
      );
    },
    [addNotification],
  );

  const { isConnected, lastMessage } = useNotificationWebSocket({
    branchId,
    enabled,
    onMessage: handleIncomingMessage,
  });

  useEffect(() => {
    if (lastMessage) {
      addNotification(lastMessage);
    }
  }, [lastMessage, addNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    clearAll,
    addNotification,
  };
}

