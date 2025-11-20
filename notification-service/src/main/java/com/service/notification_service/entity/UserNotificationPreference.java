package com.service.notification_service.entity;

import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_notification_preferences")
public class UserNotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "email_enabled")
    private Boolean emailEnabled = Boolean.TRUE;

    @Column(name = "sms_enabled")
    private Boolean smsEnabled = Boolean.FALSE;

    @Column(name = "push_enabled")
    private Boolean pushEnabled = Boolean.TRUE;

    @Column(name = "websocket_enabled")
    private Boolean websocketEnabled = Boolean.TRUE;

    @Column(name = "push_sound_enabled")
    private Boolean pushSoundEnabled = Boolean.TRUE;

    @Column(name = "push_vibration_enabled")
    private Boolean pushVibrationEnabled = Boolean.TRUE;

    @Column(name = "order_notifications")
    private Boolean orderNotifications = Boolean.TRUE;

    @Column(name = "inventory_notifications")
    private Boolean inventoryNotifications = Boolean.FALSE;

    @Column(name = "system_notifications")
    private Boolean systemNotifications = Boolean.TRUE;

    @Column(name = "quiet_hours_from")
    private LocalTime quietHoursFrom;

    @Column(name = "quiet_hours_to")
    private LocalTime quietHoursTo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}

