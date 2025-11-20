package com.service.notification_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.service.notification_service.entity.PushSubscription;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
}

