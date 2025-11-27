import { useCallback, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { CONFIG } from '../configurations/configuration';

const WS_ENDPOINT = '/notification-service/ws';

const buildSockJsUrl = (baseUrl) => {
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

export function useNotificationWebSocket({ userId, enabled = true, onMessage }) {
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const disconnect = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const handleMessage = useCallback(
    (frame) => {
      try {
        const parsed = JSON.parse(frame.body);
        setLastMessage(parsed);
        if (onMessage) {
          onMessage(parsed);
        }
      } catch (error) {
        console.warn('[WebSocket] Failed to parse notification payload', error);
      }
    },
    [onMessage]
  );

  useEffect(() => {
    if (!enabled || !userId) {
      disconnect();
      return;
    }

    const token = localStorage.getItem('token');
    const sockJsUrl = buildSockJsUrl(CONFIG.API_GATEWAY);

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    client.onConnect = () => {
      setIsConnected(true);
      // Subscribe to user-specific queue
      subscriptionRef.current = client.subscribe(`/queue/user.${userId}`, handleMessage);
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
  }, [userId, enabled, handleMessage, disconnect]);

  return {
    isConnected,
    lastMessage,
    disconnect,
  };
}

