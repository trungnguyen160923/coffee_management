package com.service.notification_service.dto.response;

import java.time.LocalDateTime;

import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.entity.enums.NotificationStatus;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NotificationResponse {
    String id;
    Long userId;
    Integer branchId;
    String title;
    String content;
    NotificationChannel channel;
    NotificationStatus status;
    boolean read;
    LocalDateTime createdAt;
    String metadata; // JSON string containing orderId, reservationId, etc.
    String targetRole; // "STAFF", "MANAGER", or null for all roles
}

