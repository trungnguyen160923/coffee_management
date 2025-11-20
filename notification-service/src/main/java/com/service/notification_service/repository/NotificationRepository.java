package com.service.notification_service.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.service.notification_service.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findTop100ByBranchIdOrderByCreatedAtDesc(Integer branchId);
    List<Notification> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
}

