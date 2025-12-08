package com.service.notification_service.service.impl;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
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

            // Check for duplicate notification in the last 5 minutes
            // Duplicate = same type, same userId/branchId, same metadata key (assignmentId/requestId)
            if (shouldCheckDuplicate(type, metadata)) {
                LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
                List<Notification> recentNotifications = userId != null
                        ? notificationRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId.longValue())
                        : (branchId != null 
                            ? notificationRepository.findTop100ByBranchIdOrderByCreatedAtDesc(branchId)
                            : List.of());
                
                // Check if there's a recent duplicate based on metadata key
                String metadataKey = extractMetadataKey(metadata, type);
                if (metadataKey != null) {
                    boolean isDuplicate = recentNotifications.stream()
                            .filter(n -> n.getCreatedAt().isAfter(fiveMinutesAgo))
                            .anyMatch(n -> {
                                try {
                                    // Parse metadata and compare key
                                    if (n.getMetadata() != null) {
                                        Map<String, Object> existingMetadata = objectMapper.readValue(
                                                n.getMetadata(), 
                                                objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
                                        String existingKey = extractMetadataKey(existingMetadata, type);
                                        // Compare keys and also check if title matches (same event type)
                                        return metadataKey.equals(existingKey) && 
                                               n.getTitle() != null && n.getTitle().equals(title);
                                    }
                                } catch (Exception e) {
                                    // Ignore parse errors
                                }
                                return false;
                            });
                    
                    if (isDuplicate) {
                        log.warn("[NotificationDispatchService] ⚠️ Duplicate notification detected, skipping DB save: type={}, metadataKey={}", 
                                type, metadataKey);
                        // Still send WebSocket but skip DB save
                        String messageId = UUID.randomUUID().toString();
                        NotificationMessage message = NotificationMessage.builder()
                                .id(messageId)
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
                        }
                        return; // Skip DB save
                    }
                }
            }

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

    @Override
    public void sendWebSocketOnly(
            Integer userId,
            Integer branchId,
            String targetRole,
            NotificationType type,
            Map<String, Object> metadata,
            String title,
            String content) {
        try {
            // Generate ID for WebSocket message only (not saved to DB)
            String messageId = UUID.randomUUID().toString();

            NotificationMessage message = NotificationMessage.builder()
                    .id(messageId)
                    .type(type)
                    .title(title != null ? title : "")
                    .content(content != null ? content : "")
                    .branchId(branchId)
                    .userId(userId)
                    .metadata(metadata != null ? metadata : Map.of())
                    .createdAt(Instant.now())
                    .build();

            // Send WebSocket only, no database save
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
            log.error("[NotificationDispatchService] ❌ Failed to send WebSocket-only notification", e);
        }
    }

    /**
     * Check if we should check for duplicates for this notification type
     */
    private boolean shouldCheckDuplicate(NotificationType type, Map<String, Object> metadata) {
        if (type == null || metadata == null) {
            return false;
        }
        
        // Only check duplicates for shift-related notifications that have unique identifiers
        return type.name().startsWith("SHIFT_") && 
               (metadata.containsKey("assignmentId") || 
                metadata.containsKey("requestId") || 
                metadata.containsKey("shiftId"));
    }

    /**
     * Extract a unique key from metadata for duplicate detection
     */
    private String extractMetadataKey(Map<String, Object> metadata, NotificationType type) {
        if (metadata == null || type == null) {
            return null;
        }
        
        // Create a unique key based on type and relevant IDs
        StringBuilder key = new StringBuilder(type.name());
        
        if (metadata.containsKey("assignmentId")) {
            key.append("_assignment_").append(metadata.get("assignmentId"));
        }
        if (metadata.containsKey("requestId")) {
            key.append("_request_").append(metadata.get("requestId"));
        }
        if (metadata.containsKey("shiftId")) {
            key.append("_shift_").append(metadata.get("shiftId"));
        }
        
        return key.length() > type.name().length() ? key.toString() : null;
    }
}


