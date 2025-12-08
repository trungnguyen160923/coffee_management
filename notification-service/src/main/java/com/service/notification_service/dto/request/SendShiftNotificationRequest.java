package com.service.notification_service.dto.request;

import java.util.Map;

import com.service.notification_service.websocket.dto.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendShiftNotificationRequest {
    private Integer userId;
    private Integer branchId;
    private String targetRole; // "STAFF" or "MANAGER"
    private NotificationType type;
    private String title;
    private String content;
    private Map<String, Object> metadata;
}

