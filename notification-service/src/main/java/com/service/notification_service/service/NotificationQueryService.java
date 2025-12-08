package com.service.notification_service.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.service.notification_service.dto.response.NotificationResponse;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;

    public List<NotificationResponse> getNotificationsByBranch(Integer branchId, int limit, String userRole) {
        if (branchId == null) {
            log.error("[NotificationQueryService] BranchId is null");
            throw new IllegalArgumentException("BranchId cannot be null");
        }
        try {
            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
            
            List<Notification> notifications = notificationRepository
                    .findTop100ByBranchIdOrderByCreatedAtDesc(branchId);
            return notifications.stream()
                    .filter(n -> {
                        LocalDateTime createdAt = n.getCreatedAt();
                        if (createdAt == null || createdAt.isBefore(startOfDay) || createdAt.isAfter(endOfDay)) {
                            return false;
                        }
                        // Only show branch-level notifications (userId == null)
                        // Staff receives notifications when: userId == null AND targetRole matches
                        if (n.getUserId() != null) {
                            return false; // Skip user-specific notifications (they are fetched via getNotificationsByUser)
                        }
                        // Filter by role: show notification if targetRole is null (all roles) or matches userRole
                        String targetRole = n.getTargetRole();
                        return targetRole == null || targetRole.equalsIgnoreCase(userRole);
                    })
                    .limit(limit)
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[NotificationQueryService] Failed to fetch notifications for branchId: {}", branchId, e);
            throw new RuntimeException("Failed to fetch notifications for branchId: " + branchId, e);
        }
    }

    public List<NotificationResponse> getNotificationsByUser(Long userId, int limit, String userRole) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        
        List<Notification> notifications = notificationRepository
                .findTop100ByUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .filter(n -> {
                    LocalDateTime createdAt = n.getCreatedAt();
                    if (createdAt == null || createdAt.isBefore(startOfDay) || createdAt.isAfter(endOfDay)) {
                        return false;
                    }
                    // Filter by role: show notification if targetRole is null (all roles) or matches userRole
                    String targetRole = n.getTargetRole();
                    return targetRole == null || targetRole.equalsIgnoreCase(userRole);
                })
                .limit(limit)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void markAsRead(String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setRead(Boolean.TRUE);
            notification.setReadAt(java.time.LocalDateTime.now());
            notificationRepository.save(notification);
        });
    }

    public void markAllAsReadByBranch(Integer branchId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        LocalDateTime now = LocalDateTime.now();
        
        List<Notification> notifications = notificationRepository.findTop100ByBranchIdOrderByCreatedAtDesc(branchId);
        notifications.stream()
                .filter(n -> {
                    LocalDateTime createdAt = n.getCreatedAt();
                    return createdAt != null && 
                           !createdAt.isBefore(startOfDay) && 
                           !createdAt.isAfter(endOfDay) &&
                           !Boolean.TRUE.equals(n.getRead());
                })
                .forEach(notification -> {
                    notification.setRead(Boolean.TRUE);
                    notification.setReadAt(now);
                });
        notificationRepository.saveAll(notifications);
    }

    public void markAllAsReadByUser(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        LocalDateTime now = LocalDateTime.now();
        
        List<Notification> notifications = notificationRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId);
        notifications.stream()
                .filter(n -> {
                    LocalDateTime createdAt = n.getCreatedAt();
                    return createdAt != null && 
                           !createdAt.isBefore(startOfDay) && 
                           !createdAt.isAfter(endOfDay) &&
                           !Boolean.TRUE.equals(n.getRead());
                })
                .forEach(notification -> {
                    notification.setRead(Boolean.TRUE);
                    notification.setReadAt(now);
                });
        notificationRepository.saveAll(notifications);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .branchId(notification.getBranchId())
                .title(notification.getTitle())
                .content(notification.getContent())
                .channel(notification.getChannel())
                .status(notification.getStatus())
                .read(Boolean.TRUE.equals(notification.getRead()))
                .createdAt(notification.getCreatedAt())
                .metadata(notification.getMetadata()) // Keep as String, frontend will parse
                .targetRole(notification.getTargetRole())
                .build();
    }
}

