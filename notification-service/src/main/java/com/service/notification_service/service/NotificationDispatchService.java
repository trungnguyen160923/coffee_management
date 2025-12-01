package com.service.notification_service.service;

import java.util.Map;

import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.websocket.dto.NotificationType;

public interface NotificationDispatchService {

    void sendUserNotification(
            Integer userId,
            Integer branchId,
            String targetRole,
            NotificationChannel channel,
            String templateCode,
            NotificationType type,
            Map<String, Object> metadata,
            String fallbackTitle,
            String fallbackContent);
}


