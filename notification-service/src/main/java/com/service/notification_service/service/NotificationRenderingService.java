package com.service.notification_service.service;

import java.util.Map;

public interface NotificationRenderingService {

    RenderedNotification render(String templateCode, Map<String, Object> data);

    record RenderedNotification(String subject, String content) {
    }
}


