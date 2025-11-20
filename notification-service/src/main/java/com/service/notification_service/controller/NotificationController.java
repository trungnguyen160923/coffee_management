package com.service.notification_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.service.notification_service.dto.ApiResponse;
import com.service.notification_service.dto.response.NotificationResponse;
import com.service.notification_service.events.OrderCreatedEvent;
import com.service.notification_service.service.NotificationQueryService;
import com.service.notification_service.service.OrderNotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationQueryService notificationQueryService;
    private final OrderNotificationService orderNotificationService;

    @GetMapping("/branch/{branchId}")
    public ApiResponse<List<NotificationResponse>> getByBranch(
            @PathVariable Integer branchId,
            @RequestParam(defaultValue = "50") int limit) {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationQueryService.getNotificationsByBranch(branchId, limit))
                .build();
    }

    @GetMapping("/user/{userId}")
    public ApiResponse<List<NotificationResponse>> getByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "50") int limit) {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationQueryService.getNotificationsByUser(userId, limit))
                .build();
    }

    @PostMapping("/orders")
    public ApiResponse<Void> triggerOrderNotification(@RequestBody OrderCreatedEvent request) throws Exception {
        orderNotificationService.notifyOrderCreated(request);
        return ApiResponse.<Void>builder().build();
    }
}

