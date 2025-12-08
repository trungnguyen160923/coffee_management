package com.service.notification_service.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.service.notification_service.dto.request.SendShiftNotificationRequest;
import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.websocket.dto.NotificationType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftNotificationService {

    private final NotificationDispatchService notificationDispatchService;

    public void sendShiftNotification(SendShiftNotificationRequest request) {
        try {
            // Determine if this should be saved to DB or WebSocket-only
            // Save to DB for important events that need history:
            // - Request created, approved, rejected, cancelled
            // - Assignment created, approved, rejected
            // - Shift published
            // WebSocket-only for real-time updates:
            // - Assignment deleted/unregistered (just UI update)
            // - Assignment checked in/out (can be both, but prefer WebSocket-only to avoid spam)
            
            boolean shouldSaveToDb = shouldSaveToDatabase(request.getType());
            
            if (shouldSaveToDb) {
                // Save to DB and send WebSocket
                notificationDispatchService.sendUserNotification(
                        request.getUserId(),
                        request.getBranchId(),
                        request.getTargetRole(),
                        NotificationChannel.WEBSOCKET,
                        null, // No template code, use fallback title/content
                        request.getType(),
                        request.getMetadata() != null ? request.getMetadata() : Map.of(),
                        request.getTitle() != null ? request.getTitle() : "Shift Update",
                        request.getContent() != null ? request.getContent() : "Your shift assignment has been updated"
                );
            } else {
                // WebSocket-only (no DB save) for real-time updates
                notificationDispatchService.sendWebSocketOnly(
                        request.getUserId(),
                        request.getBranchId(),
                        request.getTargetRole(),
                        request.getType(),
                        request.getMetadata() != null ? request.getMetadata() : Map.of(),
                        request.getTitle() != null ? request.getTitle() : "",
                        request.getContent() != null ? request.getContent() : ""
                );
            }
            
            log.info("[ShiftNotificationService] ✅ Sent shift notification: type={}, userId={}, branchId={}, saveToDb={}", 
                    request.getType(), request.getUserId(), request.getBranchId(), shouldSaveToDb);
        } catch (Exception e) {
            log.error("[ShiftNotificationService] ❌ Failed to send shift notification", e);
            // Don't throw - notification failures shouldn't break the main flow
        }
    }

    /**
     * Determine if notification should be saved to database
     * Returns true for important events that need history, false for real-time-only updates
     */
    private boolean shouldSaveToDatabase(NotificationType type) {
        if (type == null) {
            return false;
        }
        
        switch (type) {
            // Save to DB - important events
            case SHIFT_ASSIGNMENT_CREATED:
            case SHIFT_ASSIGNMENT_APPROVED:
            case SHIFT_ASSIGNMENT_REJECTED:
            case SHIFT_REQUEST_LEAVE_CREATED:
            case SHIFT_REQUEST_SWAP_CREATED:
            case SHIFT_REQUEST_OVERTIME_CREATED:
            case SHIFT_REQUEST_APPROVED:
            case SHIFT_REQUEST_REJECTED:
            case SHIFT_REQUEST_CANCELLED:
            case SHIFT_REQUEST_TARGET_RESPONDED:
            case SHIFT_PUBLISHED:
                return true;
            
            // WebSocket-only - real-time updates (no DB save to avoid duplicates)
            case SHIFT_ASSIGNMENT_DELETED:
            case SHIFT_ASSIGNMENT_UPDATED:
            case SHIFT_ASSIGNMENT_CHECKED_IN:
            case SHIFT_ASSIGNMENT_CHECKED_OUT:
            // Draft events - WebSocket-only (real-time updates, no DB spam)
            case SHIFT_DRAFT_CREATED:
            case SHIFT_DRAFT_UPDATED:
            case SHIFT_DRAFT_DELETED:
            default:
                return false;
        }
    }
}

