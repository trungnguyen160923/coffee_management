package com.service.notification_service.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.notification_service.dto.ApiResponse;
import com.service.notification_service.entity.NotificationTemplate;
import com.service.notification_service.service.NotificationTemplateService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/notification-templates")
@RequiredArgsConstructor
public class NotificationTemplateController {

    private final NotificationTemplateService notificationTemplateService;

    @GetMapping("/test")
    public ResponseEntity<ApiResponse<List<NotificationTemplate>>> getAllTemplates() {
        List<NotificationTemplate> templates = notificationTemplateService.getAllTemplates();
        ApiResponse<List<NotificationTemplate>> response = ApiResponse.<List<NotificationTemplate>>builder()
                .message("Fetch notification templates successfully")
                .result(templates)
                .build();
        return ResponseEntity.ok(response);
    }
}

