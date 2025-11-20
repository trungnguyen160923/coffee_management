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
  enabled?: boolean;
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
  enabled = true,
  onMessage,
}: UseNotificationWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationPayload | null>(null);

  const disconnect = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
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
    if (!enabled || !branchId) {
      disconnect();
      return;
    }

    const token = localStorage.getItem('coffee-token');
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
      subscriptionRef.current = client.subscribe(`/topic/staff.${branchId}`, handleMessage);
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
  }, [branchId, enabled, handleMessage, disconnect]);

  return {
    isConnected,
    lastMessage,
    disconnect,
  };
}

