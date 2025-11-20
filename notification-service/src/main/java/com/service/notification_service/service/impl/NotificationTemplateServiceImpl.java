package com.service.notification_service.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.service.notification_service.entity.NotificationTemplate;
import com.service.notification_service.repository.NotificationTemplateRepository;
import com.service.notification_service.service.NotificationTemplateService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private final NotificationTemplateRepository notificationTemplateRepository;

    @Override
    public List<NotificationTemplate> getAllTemplates() {
        return notificationTemplateRepository.findAll();
    }
}

