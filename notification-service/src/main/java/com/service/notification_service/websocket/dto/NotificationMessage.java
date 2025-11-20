package com.service.notification_service.websocket.dto;

import java.time.Instant;
import java.util.Map;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NotificationMessage {
    String id;
    NotificationType type;
    String title;
    String content;
    Integer userId;
    Integer branchId;
    Map<String, Object> metadata;
    Instant createdAt;
}

