import { useCallback, useEffect, useRef, useState } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../config/api';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  content: string;
  branchId?: number | null;
  userId?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface UseNotificationWebSocketOptions {
  branchId?: number | null;
  userId?: number | null;
  enabled?: boolean;
  subscribeBranch?: boolean;
  subscribeUserQueue?: boolean;
  role?: string; // 'staff' | 'manager' | ...
  onMessage?: (message: NotificationPayload) => void;
}

const WS_ENDPOINT = '/api/notification-service/ws';

const buildSockJsUrl = (baseUrl: string): string => {
  if (!baseUrl) {
    return `${window.location.origin}${WS_ENDPOINT}`;
  }
  if (baseUrl.startsWith('http')) {
    return `${baseUrl}${WS_ENDPOINT}`;
  }
  if (baseUrl.startsWith('//')) {
    return `${window.location.protocol}${baseUrl}${WS_ENDPOINT}`;
  }
  if (baseUrl.startsWith('ws')) {
    return baseUrl.replace(/^ws/, 'http') + WS_ENDPOINT;
  }
  return `http://${baseUrl}${WS_ENDPOINT}`;
};

export function useNotificationWebSocket({
  branchId,
  userId,
  enabled = true,
  subscribeBranch,
  subscribeUserQueue,
  role,
  onMessage,
}: UseNotificationWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationPayload | null>(null);
  const normalizedRole = role?.toLowerCase();

  const shouldSubscribeBranch = Boolean(subscribeBranch ?? branchId);
  const shouldSubscribeUserQueue = Boolean(subscribeUserQueue ?? userId);

  const disconnect = useCallback(() => {
    if (subscriptionRef.current.length) {
      subscriptionRef.current.forEach((sub) => sub?.unsubscribe());
    }
    subscriptionRef.current = [];
    clientRef.current?.deactivate();
    clientRef.current = null;
    setIsConnected(false);
  }, []);

  const handleMessage = useCallback(
    (frame: IMessage) => {
      try {
        const parsed: NotificationPayload = JSON.parse(frame.body);
        setLastMessage(parsed);
        onMessage?.(parsed);
      } catch (error) {
        console.warn('[WebSocket] Failed to parse notification payload', error);
      }
    },
    [onMessage],
  );

  useEffect(() => {
    if (
      !enabled ||
      (!shouldSubscribeBranch && !shouldSubscribeUserQueue) ||
      (!branchId && !userId)
    ) {
      disconnect();
      return;
    }

    const sockJsUrl = buildSockJsUrl(API_BASE_URL);

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });

    client.onConnect = () => {
      setIsConnected(true);
      const subs: StompSubscription[] = [];
      if (shouldSubscribeBranch && branchId) {
        const destination =
          normalizedRole === 'manager'
            ? `/topic/manager.${branchId}`
            : `/topic/staff.${branchId}`;
        subs.push(client.subscribe(destination, handleMessage));
      }
      if (shouldSubscribeUserQueue && userId) {
        subs.push(client.subscribe(`/queue/user.${userId}`, handleMessage));
      }
      subscriptionRef.current = subs;
    };

    client.onStompError = (frame) => {
      console.error('[WebSocket] STOMP error', frame);
      setIsConnected(false);
    };

    client.onWebSocketClose = () => {
      setIsConnected(false);
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      disconnect();
    };
  }, [
    branchId,
    userId,
    enabled,
    shouldSubscribeBranch,
    shouldSubscribeUserQueue,
    handleMessage,
    disconnect,
  ]);

  return {
    isConnected,
    lastMessage,
    disconnect,
  };
}

