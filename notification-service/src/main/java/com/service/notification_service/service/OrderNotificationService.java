package com.service.notification_service.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.entity.enums.NotificationStatus;
import com.service.notification_service.events.OrderCreatedEvent;
import com.service.notification_service.repository.NotificationRepository;
import com.service.notification_service.websocket.dto.NotificationMessage;
import com.service.notification_service.websocket.dto.NotificationType;
import com.service.notification_service.websocket.service.NotificationWebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderNotificationService {

    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketService notificationWebSocketService;
    private final StaffDirectoryService staffDirectoryService;

    public void notifyOrderCreated(OrderCreatedEvent event) throws Exception {
        Map<String, Object> metadata = Map.of(
                "orderId", event.getOrderId(),
                "branchId", event.getBranchId(),
                "customerName", event.getCustomerName(),
                "totalAmount", event.getTotalAmount());

        List<Integer> staffIds = staffDirectoryService.getStaffIdsByBranch(event.getBranchId());
        if (staffIds.isEmpty()) {
            log.warn("[OrderNotificationService] No staff found for branch {}. Broadcasting only.", event.getBranchId());
            broadcastToBranch(event, metadata);
            return;
        }

        for (Integer staffId : staffIds) {
            String notificationId = UUID.randomUUID().toString();
            Notification notification = Notification.builder()
                    .id(notificationId)
                    .userId(staffId.longValue())
                    .branchId(event.getBranchId())
                    .channel(NotificationChannel.WEBSOCKET)
                    .title("Đơn hàng mới #" + event.getOrderId())
                    .content(buildOrderCreatedContent(event))
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();

            notificationRepository.save(notification);

            NotificationMessage message = NotificationMessage.builder()
                    .id(notificationId)
                    .type(NotificationType.ORDER_CREATED)
                    .title(notification.getTitle())
                    .content(notification.getContent())
                    .branchId(event.getBranchId())
                    .userId(staffId)
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();

            notificationWebSocketService.sendToUser(staffId, message);
        }

        broadcastToBranch(event, metadata);

        log.info("[OrderNotificationService] Sent order {} notification to {} staff in branch {}",
                event.getOrderId(), staffIds.size(), event.getBranchId());
    }

    private void broadcastToBranch(OrderCreatedEvent event, Map<String, Object> metadata) {
        String notificationId = UUID.randomUUID().toString();
        NotificationMessage message = NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.ORDER_CREATED)
                .title("Đơn hàng mới #" + event.getOrderId())
                .content(buildOrderCreatedContent(event))
                .branchId(event.getBranchId())
                .metadata(metadata)
                .createdAt(java.time.Instant.now())
                .build();
        notificationWebSocketService.sendToBranchStaff(event.getBranchId(), message);
    }

    private String buildOrderCreatedContent(OrderCreatedEvent event) {
        String customerPart = event.getCustomerName() != null
                ? "Khách: " + event.getCustomerName()
                : "Khách lẻ";
        String amountPart = event.getTotalAmount() != null
                ? "Tổng tiền: " + event.getTotalAmount() + "đ"
                : "";
        return "%s • Đơn #%s • %s".formatted(customerPart, event.getOrderId(), amountPart);
    }
}


