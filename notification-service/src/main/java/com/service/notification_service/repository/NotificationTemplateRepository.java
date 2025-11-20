package com.service.notification_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.service.notification_service.entity.NotificationTemplate;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, Long> {
}

