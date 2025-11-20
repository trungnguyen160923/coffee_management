package com.service.notification_service.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.service.notification_service.dto.response.NotificationResponse;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;

    public List<NotificationResponse> getNotificationsByBranch(Integer branchId, int limit) {
        List<Notification> notifications = notificationRepository
                .findTop100ByBranchIdOrderByCreatedAtDesc(branchId);
        return notifications.stream()
                .limit(limit)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<NotificationResponse> getNotificationsByUser(Long userId, int limit) {
        List<Notification> notifications = notificationRepository
                .findTop100ByUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .limit(limit)
                .map(this::toResponse)
                .collect(Collectors.toList());
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
                .build();
    }
}

