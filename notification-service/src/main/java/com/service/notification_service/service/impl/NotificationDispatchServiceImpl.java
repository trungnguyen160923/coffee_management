package com.service.notification_service.service.impl;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.entity.enums.NotificationStatus;
import com.service.notification_service.repository.NotificationRepository;
import com.service.notification_service.service.NotificationDispatchService;
import com.service.notification_service.service.NotificationRenderingService;
import com.service.notification_service.websocket.dto.NotificationMessage;
import com.service.notification_service.websocket.dto.NotificationType;
import com.service.notification_service.websocket.service.NotificationWebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDispatchServiceImpl implements NotificationDispatchService {

    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;
    private final NotificationRenderingService notificationRenderingService;
    private final NotificationWebSocketService notificationWebSocketService;

    @Override
    public void sendUserNotification(
            Integer userId,
            Integer branchId,
            String targetRole,
            NotificationChannel channel,
            String templateCode,
            NotificationType type,
            Map<String, Object> metadata,
            String fallbackTitle,
            String fallbackContent) {

        try {
            NotificationRenderingService.RenderedNotification rendered =
                    notificationRenderingService.render(templateCode, metadata);

            String title = rendered.subject() != null ? rendered.subject() : fallbackTitle;
            String content = rendered.content() != null ? rendered.content() : fallbackContent;

            String notificationId = UUID.randomUUID().toString();

            Notification notification = Notification.builder()
                    .id(notificationId)
                    .userId(userId != null ? userId.longValue() : null)
                    .branchId(branchId)
                    .targetRole(targetRole)
                    .channel(channel)
                    .templateCode(templateCode)
                    .title(title)
                    .content(content)
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();

            notificationRepository.save(notification);

            NotificationMessage message = NotificationMessage.builder()
                    .id(notificationId)
                    .type(type)
                    .title(title)
                    .content(content)
                    .branchId(branchId)
                    .userId(userId)
                    .metadata(metadata)
                    .createdAt(Instant.now())
                    .build();

            if (userId != null) {
                notificationWebSocketService.sendToUser(userId, message);
            } else if (branchId != null) {
                if (targetRole != null && targetRole.equalsIgnoreCase("MANAGER")) {
                    notificationWebSocketService.sendToBranchManagers(branchId, message);
                } else {
                    notificationWebSocketService.sendToBranchStaff(branchId, message);
                }
            } else {
                log.warn("[NotificationDispatchService] No recipient (userId/branchId) specified, skipping WebSocket send");
            }
        } catch (Exception e) {
            log.error("[NotificationDispatchService] ❌ Failed to send user notification", e);
        }
    }
}


