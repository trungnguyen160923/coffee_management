package com.service.notification_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.service.notification_service.dto.ApiResponse;
import com.service.notification_service.dto.response.NotificationResponse;
import com.service.notification_service.events.OrderCreatedEvent;
import com.service.notification_service.events.ReservationCreatedEvent;
import com.service.notification_service.service.NotificationQueryService;
import com.service.notification_service.service.OrderNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationQueryService notificationQueryService;
    private final OrderNotificationService orderNotificationService;

    @GetMapping("/branch/{branchId}")
    public ApiResponse<List<NotificationResponse>> getByBranch(
            @PathVariable Integer branchId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String role) {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationQueryService.getNotificationsByBranch(branchId, limit, role))
                .build();
    }

    @GetMapping("/user/{userId}")
    public ApiResponse<List<NotificationResponse>> getByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String role) {
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(notificationQueryService.getNotificationsByUser(userId, limit, role))
                .build();
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable String id) {
        notificationQueryService.markAsRead(id);
        return ApiResponse.<Void>builder().build();
    }

    @PutMapping("/branch/{branchId}/read-all")
    public ApiResponse<Void> markAllAsReadByBranch(@PathVariable Integer branchId) {
        notificationQueryService.markAllAsReadByBranch(branchId);
        return ApiResponse.<Void>builder().build();
    }

    @PutMapping("/user/{userId}/read-all")
    public ApiResponse<Void> markAllAsReadByUser(@PathVariable Long userId) {
        notificationQueryService.markAllAsReadByUser(userId);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/orders")
    public ApiResponse<Void> triggerOrderNotification(@RequestBody OrderCreatedEvent request) throws Exception {
        orderNotificationService.notifyOrderCreated(request);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/reservations")
    public ApiResponse<Void> triggerReservationNotification(@RequestBody ReservationCreatedEvent request) throws Exception {
        orderNotificationService.notifyReservationCreated(request);
        return ApiResponse.<Void>builder().build();
    }
}

