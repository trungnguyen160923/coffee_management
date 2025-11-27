import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { NotificationPayload, useNotificationWebSocket } from './useNotificationWebSocket';
import { fetchBranchNotifications, fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { NotificationToast } from '../components/notifications/NotificationToast';

interface NotificationState extends NotificationPayload {
  isRead?: boolean;
}

interface UseNotificationsOptions {
  branchId?: number | null;
  userId?: number | null;
  enabled?: boolean;
  role?: string; // User role: 'staff', 'manager', etc.
}

export function useNotifications({ branchId, userId, enabled = true, role }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const normalizedRole = role?.toLowerCase();
  const subscribeBranchFeed = Boolean(branchId && normalizedRole !== 'manager');
  const subscribeUserFeed = Boolean(userId && (!subscribeBranchFeed || normalizedRole === 'manager'));

  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((noti) => (noti.id === notificationId ? { ...noti, isRead: true } : noti)),
    );
    
    // Call API to mark as read
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      // Revert on error
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === notificationId ? { ...noti, isRead: false } : noti)),
      );
      console.error('[Notifications] Failed to mark notification as read', error);
    }
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
        if (subscribeBranchFeed && branchId) {
          const response = await fetchBranchNotifications(branchId, 50, role);
          data = response.map((item) => {
            let metadata: Record<string, unknown> | undefined;
            try {
              if (item.metadata) {
                metadata = JSON.parse(item.metadata);
              }
            } catch (e) {
              // Ignore parse errors
            }
            return {
              payload: {
                id: item.id,
                type: item.channel,
                title: item.title,
                content: item.content,
                branchId: item.branchId ?? undefined,
                userId: item.userId ?? undefined,
                createdAt: item.createdAt,
                metadata,
              },
              read: item.read,
            };
          });
        } else if (subscribeUserFeed && userId) {
          const response = await fetchUserNotifications(userId, 50, role);
          data = response.map((item) => {
            let metadata: Record<string, unknown> | undefined;
            try {
              if (item.metadata) {
                metadata = JSON.parse(item.metadata);
              }
            } catch (e) {
              // Ignore parse errors
            }
            return {
              payload: {
                id: item.id,
                type: item.channel,
                title: item.title,
                content: item.content,
                branchId: item.branchId ?? undefined,
                userId: item.userId ?? undefined,
                createdAt: item.createdAt,
                metadata,
              },
              read: item.read,
            };
          });
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
  }, [branchId, userId, enabled, role, subscribeBranchFeed, subscribeUserFeed]);

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

  const { isConnected } = useNotificationWebSocket({
    branchId: subscribeBranchFeed ? branchId : undefined,
    userId: subscribeUserFeed ? userId : undefined,
    enabled,
    subscribeBranch: subscribeBranchFeed,
    subscribeUserQueue: subscribeUserFeed,
    onMessage: handleIncomingMessage,
  });

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((noti) => ({ ...noti, isRead: true }))
    );
    
    // Call API to mark all as read
    try {
      if (subscribeBranchFeed && branchId) {
        await markAllNotificationsAsRead(branchId, undefined);
      } else if (subscribeUserFeed && userId) {
        await markAllNotificationsAsRead(undefined, userId);
      } else {
        await markAllNotificationsAsRead(branchId || undefined, userId || undefined);
      }
    } catch (error) {
      // Revert on error - refetch from server
      if (subscribeBranchFeed && branchId) {
        const response = await fetchBranchNotifications(branchId, 50);
        setNotifications(response.map((item) => ({
          id: item.id,
          type: item.channel,
          title: item.title,
          content: item.content,
          branchId: item.branchId ?? undefined,
          userId: item.userId ?? undefined,
          createdAt: item.createdAt,
          isRead: item.read,
        })));
      } else if (subscribeUserFeed && userId) {
        const response = await fetchUserNotifications(userId, 50);
        setNotifications(response.map((item) => ({
          id: item.id,
          type: item.channel,
          title: item.title,
          content: item.content,
          branchId: item.branchId ?? undefined,
          userId: item.userId ?? undefined,
          createdAt: item.createdAt,
          isRead: item.read,
        })));
      }
      console.error('[Notifications] Failed to mark all notifications as read', error);
    }
  }, [branchId, userId, subscribeBranchFeed, subscribeUserFeed]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
}

