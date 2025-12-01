package com.service.notification_service.service.impl;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.service.notification_service.entity.NotificationTemplate;
import com.service.notification_service.repository.NotificationTemplateRepository;
import com.service.notification_service.service.NotificationRenderingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationRenderingServiceImpl implements NotificationRenderingService {

    private final NotificationTemplateRepository notificationTemplateRepository;

    @Override
    public RenderedNotification render(String templateCode, Map<String, Object> data) {
        if (templateCode == null) {
            log.warn("[NotificationRenderingService] templateCode is null, skipping template rendering");
            return new RenderedNotification(null, null);
        }

        NotificationTemplate template = notificationTemplateRepository.findByCode(templateCode)
                .orElse(null);

        if (template == null) {
            log.warn("[NotificationRenderingService] Template not found for code: {}", templateCode);
            return new RenderedNotification(null, null);
        }

        String renderedSubject = renderString(template.getSubject(), data);
        String renderedContent = renderString(template.getContent(), data);

        return new RenderedNotification(renderedSubject, renderedContent);
    }

    private String renderString(String template, Map<String, Object> data) {
        if (template == null || data == null || data.isEmpty()) {
            return template;
        }
        String result = template;
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String placeholder = "${" + entry.getKey() + "}";
            String value = entry.getValue() != null ? entry.getValue().toString() : "";
            result = result.replace(placeholder, value);
        }
        return result;
    }
}


