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
import com.service.notification_service.events.OrderCompletedEvent;
import com.service.notification_service.events.ReservationCreatedEvent;
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

        // Save 1 notification for branch (not per staff) to reduce DB records
        saveBranchNotification(event, metadata);

        // Get staff list to send WebSocket notifications
        List<Integer> staffIds = staffDirectoryService.getStaffIdsByBranch(event.getBranchId());
        
        // Send WebSocket to each staff member (but only 1 record in DB)
        for (Integer staffId : staffIds) {
            String notificationId = UUID.randomUUID().toString();
            NotificationMessage message = NotificationMessage.builder()
                    .id(notificationId)
                    .type(NotificationType.ORDER_CREATED)
                    .title("Đơn hàng mới #" + event.getOrderId())
                    .content(buildOrderCreatedContent(event))
                    .branchId(event.getBranchId())
                    .userId(staffId)
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();

            notificationWebSocketService.sendToUser(staffId, message);
        }

        // Also broadcast to branch topic
        broadcastToBranch(event, metadata);
    }

    /**
     * Save 1 notification for branch (not per staff) to reduce DB records
     * userId = null means it's a branch-level notification, not assigned to specific user
     */
    private void saveBranchNotification(OrderCreatedEvent event, Map<String, Object> metadata) {
        try {
            String notificationId = UUID.randomUUID().toString();
            Notification notification = Notification.builder()
                    .id(notificationId)
                    .userId(null) // NULL = branch-level notification (not assigned to specific user)
                    .branchId(event.getBranchId())
                    .targetRole("STAFF") // Order notifications are for staff only
                    .channel(NotificationChannel.WEBSOCKET)
                    .title("Đơn hàng mới #" + event.getOrderId())
                    .content(buildOrderCreatedContent(event))
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("[OrderNotificationService] Failed to save branch notification for branch {}", 
                    event.getBranchId(), e);
        }
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

    public void notifyOrderCompleted(OrderCompletedEvent event) throws Exception {
        if (event.getCustomerId() == null) {
            log.error("[OrderNotificationService] CustomerId is null for orderId: {}", event.getOrderId());
            return;
        }

        Map<String, Object> metadata = Map.of(
                "orderId", event.getOrderId(),
                "branchId", event.getBranchId(),
                "totalAmount", event.getTotalAmount());

        // Save notification for user (branchId = null because this is user-specific notification)
        String notificationId = UUID.randomUUID().toString();
        Notification notification = Notification.builder()
                .id(notificationId)
                .userId(event.getCustomerId().longValue())
                .branchId(null) // NULL for user-specific notifications
                .targetRole("CUSTOMER") // Customer-specific notifications
                .channel(NotificationChannel.WEBSOCKET)
                .title("Đơn hàng #" + event.getOrderId() + " đã hoàn thành")
                .content(buildOrderCompletedContent(event))
                .metadata(objectMapper.writeValueAsString(metadata))
                .status(NotificationStatus.SENT)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send WebSocket notification to user
        NotificationMessage message = NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.ORDER_STATUS_UPDATED)
                .title("Đơn hàng #" + event.getOrderId() + " đã hoàn thành")
                .content(buildOrderCompletedContent(event))
                .branchId(event.getBranchId())
                .userId(event.getCustomerId())
                .metadata(metadata)
                .createdAt(java.time.Instant.now())
                .build();

        notificationWebSocketService.sendToUser(event.getCustomerId(), message);
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

    public void notifyOrderCancelled(OrderCompletedEvent event) throws Exception {
        if (event.getCustomerId() == null) {
            log.error("[OrderNotificationService] CustomerId is null for orderId: {}", event.getOrderId());
            return;
        }

        Map<String, Object> metadata = Map.of(
                "orderId", event.getOrderId(),
                "branchId", event.getBranchId(),
                "totalAmount", event.getTotalAmount());

        // Save notification for user (branchId = null because this is user-specific notification)
        String notificationId = UUID.randomUUID().toString();
        Notification notification = Notification.builder()
                .id(notificationId)
                .userId(event.getCustomerId().longValue())
                .branchId(null) // NULL for user-specific notifications
                .targetRole("CUSTOMER") // Customer-specific notifications
                .channel(NotificationChannel.WEBSOCKET)
                .title("Đơn hàng #" + event.getOrderId() + " đã bị hủy")
                .content(buildOrderCancelledContent(event))
                .metadata(objectMapper.writeValueAsString(metadata))
                .status(NotificationStatus.SENT)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send WebSocket notification to user
        NotificationMessage message = NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.ORDER_STATUS_UPDATED)
                .title("Đơn hàng #" + event.getOrderId() + " đã bị hủy")
                .content(buildOrderCancelledContent(event))
                .branchId(event.getBranchId())
                .userId(event.getCustomerId())
                .metadata(metadata)
                .createdAt(java.time.Instant.now())
                .build();

        notificationWebSocketService.sendToUser(event.getCustomerId(), message);
    }

    private String buildOrderCompletedContent(OrderCompletedEvent event) {
        String amountPart = event.getTotalAmount() != null
                ? "Tổng tiền: " + event.getTotalAmount() + "đ"
                : "";
        return "Đơn hàng #%s của bạn đã được hoàn thành. %s".formatted(event.getOrderId(), amountPart);
    }

    private String buildOrderCancelledContent(OrderCompletedEvent event) {
        String amountPart = event.getTotalAmount() != null
                ? "Tổng tiền: " + event.getTotalAmount() + "đ"
                : "";
        return "Đơn hàng #%s của bạn đã bị hủy. %s".formatted(event.getOrderId(), amountPart);
    }

    public void notifyReservationCreated(ReservationCreatedEvent event) throws Exception {
        Map<String, Object> metadata = Map.of(
                "reservationId", event.getReservationId(),
                "branchId", event.getBranchId(),
                "customerName", event.getCustomerName() != null ? event.getCustomerName() : "Khách lẻ",
                "partySize", event.getPartySize() != null ? event.getPartySize() : 1,
                "reservedAt", event.getReservedAt() != null ? event.getReservedAt().toString() : "");

        // Save 1 notification for branch (not per staff) to reduce DB records
        saveBranchReservationNotification(event, metadata);

        // Get staff list to send WebSocket notifications
        List<Integer> staffIds = staffDirectoryService.getStaffIdsByBranch(event.getBranchId());
        
        // Send WebSocket to each staff member (but only 1 record in DB)
        for (Integer staffId : staffIds) {
            String notificationId = UUID.randomUUID().toString();
            NotificationMessage message = NotificationMessage.builder()
                    .id(notificationId)
                    .type(NotificationType.RESERVATION_CREATED)
                    .title("Đặt bàn mới #" + event.getReservationId())
                    .content(buildReservationCreatedContent(event))
                    .branchId(event.getBranchId())
                    .userId(staffId)
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();

            notificationWebSocketService.sendToUser(staffId, message);
        }

        // Also broadcast to branch topic
        broadcastReservationToBranch(event, metadata);
    }

    /**
     * Save 1 notification for branch (not per staff) to reduce DB records
     * userId = null means it's a branch-level notification, not assigned to specific user
     */
    private void saveBranchReservationNotification(ReservationCreatedEvent event, Map<String, Object> metadata) {
        try {
            String notificationId = UUID.randomUUID().toString();
            Notification notification = Notification.builder()
                    .id(notificationId)
                    .userId(null) // NULL = branch-level notification (not assigned to specific user)
                    .branchId(event.getBranchId())
                    .targetRole("STAFF") // Reservation notifications are for staff only
                    .channel(NotificationChannel.WEBSOCKET)
                    .title("Đặt bàn mới #" + event.getReservationId())
                    .content(buildReservationCreatedContent(event))
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("[OrderNotificationService] ❌ Failed to save branch reservation notification for branch {}", 
                    event.getBranchId(), e);
        }
    }

    private void broadcastReservationToBranch(ReservationCreatedEvent event, Map<String, Object> metadata) {
        try {
            String notificationId = UUID.randomUUID().toString();
            NotificationMessage message = NotificationMessage.builder()
                    .id(notificationId)
                    .type(NotificationType.RESERVATION_CREATED)
                    .title("Đặt bàn mới #" + event.getReservationId())
                    .content(buildReservationCreatedContent(event))
                    .branchId(event.getBranchId())
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();
            notificationWebSocketService.sendToBranchStaff(event.getBranchId(), message);
        } catch (Exception e) {
            log.error("[OrderNotificationService] ❌ Failed to broadcast reservation to branch {}", 
                    event.getBranchId(), e);
        }
    }

    private String buildReservationCreatedContent(ReservationCreatedEvent event) {
        String customerPart = event.getCustomerName() != null
                ? "Khách: " + event.getCustomerName()
                : "Khách lẻ";
        String partySizePart = event.getPartySize() != null
                ? "Số người: " + event.getPartySize()
                : "";
        String timePart = event.getReservedAt() != null
                ? "Thời gian: " + event.getReservedAt().toString()
                : "";
        return "%s • Đặt bàn #%s • %s • %s".formatted(customerPart, event.getReservationId(), partySizePart, timePart);
    }

    public void notifyReservationConfirmed(ReservationCreatedEvent event) throws Exception {
        if (event.getCustomerId() == null) {
            log.error("[OrderNotificationService] CustomerId is null for reservationId: {}", event.getReservationId());
            return;
        }

        Map<String, Object> metadata = Map.of(
                "reservationId", event.getReservationId(),
                "branchId", event.getBranchId(),
                "partySize", event.getPartySize() != null ? event.getPartySize() : 1,
                "reservedAt", event.getReservedAt() != null ? event.getReservedAt().toString() : "");

        // Save notification for user (branchId = null because this is user-specific notification)
        String notificationId = UUID.randomUUID().toString();
        Notification notification = Notification.builder()
                .id(notificationId)
                .userId(event.getCustomerId().longValue())
                .branchId(null) // NULL for user-specific notifications
                .targetRole("CUSTOMER") // Customer-specific notifications
                .channel(NotificationChannel.WEBSOCKET)
                .title("Đặt bàn #" + event.getReservationId() + " đã được xác nhận")
                .content(buildReservationConfirmedContent(event))
                .metadata(objectMapper.writeValueAsString(metadata))
                .status(NotificationStatus.SENT)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send WebSocket notification to user
        NotificationMessage message = NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.RESERVATION_CREATED)
                .title("Đặt bàn #" + event.getReservationId() + " đã được xác nhận")
                .content(buildReservationConfirmedContent(event))
                .branchId(event.getBranchId())
                .userId(event.getCustomerId())
                .metadata(metadata)
                .createdAt(java.time.Instant.now())
                .build();

        notificationWebSocketService.sendToUser(event.getCustomerId(), message);
    }

    public void notifyReservationCancelled(ReservationCreatedEvent event) throws Exception {
        if (event.getCustomerId() == null) {
            log.error("[OrderNotificationService] CustomerId is null for reservationId: {}", event.getReservationId());
            return;
        }

        Map<String, Object> metadata = Map.of(
                "reservationId", event.getReservationId(),
                "branchId", event.getBranchId(),
                "partySize", event.getPartySize() != null ? event.getPartySize() : 1,
                "reservedAt", event.getReservedAt() != null ? event.getReservedAt().toString() : "");

        // Save notification for user (branchId = null because this is user-specific notification)
        String notificationId = UUID.randomUUID().toString();
        Notification notification = Notification.builder()
                .id(notificationId)
                .userId(event.getCustomerId().longValue())
                .branchId(null) // NULL for user-specific notifications
                .targetRole("CUSTOMER") // Customer-specific notifications
                .channel(NotificationChannel.WEBSOCKET)
                .title("Đặt bàn #" + event.getReservationId() + " đã bị hủy")
                .content(buildReservationCancelledContent(event))
                .metadata(objectMapper.writeValueAsString(metadata))
                .status(NotificationStatus.SENT)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        // Send WebSocket notification to user
        NotificationMessage message = NotificationMessage.builder()
                .id(notificationId)
                .type(NotificationType.RESERVATION_CREATED)
                .title("Đặt bàn #" + event.getReservationId() + " đã bị hủy")
                .content(buildReservationCancelledContent(event))
                .branchId(event.getBranchId())
                .userId(event.getCustomerId())
                .metadata(metadata)
                .createdAt(java.time.Instant.now())
                .build();

        notificationWebSocketService.sendToUser(event.getCustomerId(), message);
    }

    private String buildReservationConfirmedContent(ReservationCreatedEvent event) {
        String timePart = event.getReservedAt() != null
                ? "Thời gian: " + event.getReservedAt().toString()
                : "";
        return "Đặt bàn #%s của bạn đã được xác nhận. %s".formatted(event.getReservationId(), timePart);
    }

    private String buildReservationCancelledContent(ReservationCreatedEvent event) {
        String timePart = event.getReservedAt() != null
                ? "Thời gian: " + event.getReservedAt().toString()
                : "";
        return "Đặt bàn #%s của bạn đã bị hủy. %s".formatted(event.getReservationId(), timePart);
    }
}


