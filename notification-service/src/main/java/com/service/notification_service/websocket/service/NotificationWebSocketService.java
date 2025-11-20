package com.service.notification_service.websocket.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.service.notification_service.websocket.dto.NotificationMessage;
import com.service.notification_service.websocket.dto.NotificationType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    private static final String STAFF_TOPIC_TEMPLATE = "/topic/staff.%s";
    private static final String USER_QUEUE_TEMPLATE = "/queue/user.%s";
    private static final String BROADCAST_TOPIC = "/topic/broadcast";

    public void sendToBranchStaff(Integer branchId, NotificationMessage message) {
        if (branchId == null) {
            throw new IllegalArgumentException("branchId is required to send staff notification");
        }
        messagingTemplate.convertAndSend(
                STAFF_TOPIC_TEMPLATE.formatted(branchId),
                message);
    }

    public void sendToUser(Integer userId, NotificationMessage message) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required to send user notification");
        }
        messagingTemplate.convertAndSend(
                USER_QUEUE_TEMPLATE.formatted(userId),
                message);
    }

    public void broadcast(NotificationMessage message) {
        messagingTemplate.convertAndSend(BROADCAST_TOPIC, message);
    }

    public NotificationMessage buildOrderCreatedMessage(String notificationId,
            Integer branchId,
            Integer userId,
            String title,
            String content) {
        return NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.ORDER_CREATED)
                .branchId(branchId)
                .userId(userId)
                .title(title)
                .content(content)
                .createdAt(java.time.Instant.now())
                .build();
    }
}

