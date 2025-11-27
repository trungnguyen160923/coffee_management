package com.service.notification_service.websocket.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.service.notification_service.websocket.dto.NotificationMessage;
import com.service.notification_service.websocket.dto.NotificationType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
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
        String destination = STAFF_TOPIC_TEMPLATE.formatted(branchId);
        log.info("[NotificationWebSocketService] 📤 Sending WebSocket message to branch staff");
        log.info("  Destination: {}", destination);
        log.info("  MessageId: {}, Type: {}, Title: {}", 
                message.getId(), message.getType(), message.getTitle());
        messagingTemplate.convertAndSend(destination, message);
        log.info("[NotificationWebSocketService] ✅ WebSocket message sent to {}", destination);
    }

    public void sendToUser(Integer userId, NotificationMessage message) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required to send user notification");
        }
        String destination = USER_QUEUE_TEMPLATE.formatted(userId);
        log.info("[NotificationWebSocketService] 📤 Sending WebSocket message to user");
        log.info("  Destination: {}", destination);
        log.info("  UserId: {}, MessageId: {}, Type: {}, Title: {}", 
                userId, message.getId(), message.getType(), message.getTitle());
        messagingTemplate.convertAndSend(destination, message);
        log.info("[NotificationWebSocketService] ✅ WebSocket message sent to {}", destination);
    }

    public void broadcast(NotificationMessage message) {
        log.info("[NotificationWebSocketService] 📤 Broadcasting WebSocket message to all");
        log.info("  Destination: {}", BROADCAST_TOPIC);
        log.info("  MessageId: {}, Type: {}, Title: {}", 
                message.getId(), message.getType(), message.getTitle());
        messagingTemplate.convertAndSend(BROADCAST_TOPIC, message);
        log.info("[NotificationWebSocketService] ✅ Broadcast message sent");
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

