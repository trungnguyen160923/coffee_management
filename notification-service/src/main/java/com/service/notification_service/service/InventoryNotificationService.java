package com.service.notification_service.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.entity.enums.NotificationStatus;
import com.service.notification_service.events.LowStockEvent;
import com.service.notification_service.events.OutOfStockEvent;
import com.service.notification_service.repository.NotificationRepository;
import com.service.notification_service.service.NotificationDispatchService;
import com.service.notification_service.websocket.dto.NotificationType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryNotificationService {

    private static final String TARGET_ROLE_MANAGER = "MANAGER";
    private static final String LOW_STOCK_TEMPLATE_CODE = "LOW_STOCK_ALERT_WS";
    private static final String OUT_OF_STOCK_TEMPLATE_CODE = "OUT_OF_STOCK_ALERT_WS";

    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;
    private final NotificationDispatchService notificationDispatchService;

    public void notifyLowStock(LowStockEvent event) {
        if (event == null || event.getBranchId() == null || event.getIngredientId() == null) {
            log.warn("[InventoryNotificationService] ⚠️ Invalid LowStockEvent payload: {}", event);
            return;
        }

        InventoryAlertPayload payload = InventoryAlertPayload.from(
                event.getBranchId(),
                event.getBranchName(),
                event.getIngredientId(),
                event.getIngredientName(),
                event.getUnitCode(),
                event.getUnitName(),
                event.getAvailableQuantity(),
                event.getThreshold(),
                event.getDetectedAt(),
                event.getSeverity()
        );

        String title = "Tồn kho thấp - " + payload.ingredientName();
        String content = buildLowStockContent(payload);

        handleInventoryAlert(
                payload,
                NotificationType.LOW_STOCK_ALERT,
                LOW_STOCK_TEMPLATE_CODE,
                title,
                content
        );
    }

    public void notifyOutOfStock(OutOfStockEvent event) {
        if (event == null || event.getBranchId() == null || event.getIngredientId() == null) {
            log.warn("[InventoryNotificationService] ⚠️ Invalid OutOfStockEvent payload: {}", event);
            return;
        }

        InventoryAlertPayload payload = InventoryAlertPayload.from(
                event.getBranchId(),
                event.getBranchName(),
                event.getIngredientId(),
                event.getIngredientName(),
                event.getUnitCode(),
                event.getUnitName(),
                event.getAvailableQuantity(),
                event.getThreshold(),
                event.getDetectedAt(),
                null
        );

        String title = "Hết hàng - " + payload.ingredientName();
        String content = buildOutOfStockContent(payload);

        handleInventoryAlert(
                payload,
                NotificationType.OUT_OF_STOCK_ALERT,
                OUT_OF_STOCK_TEMPLATE_CODE,
                title,
                content
        );
    }

    private void handleInventoryAlert(
            InventoryAlertPayload payload,
            NotificationType type,
            String templateCode,
            String title,
            String content) {

        // Kiểm tra xem đã gửi thông báo cho nguyên liệu này trong vòng 1 giờ qua chưa
        if (hasRecentNotification(payload.branchId(), payload.ingredientId())) {
            log.debug("[InventoryNotificationService] ⏭️ Skipping duplicate inventory alert for branch {} ingredient {} (already notified in last hour)", 
                    payload.branchId(), payload.ingredientId());
            return;
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("branchId", payload.branchId());
        if (payload.branchName() != null) {
            metadata.put("branchName", payload.branchName());
        }
        metadata.put("ingredientId", payload.ingredientId());
        if (payload.ingredientName() != null) {
            metadata.put("ingredientName", payload.ingredientName());
        }
        if (payload.unitCode() != null) {
            metadata.put("unitCode", payload.unitCode());
        }
        if (payload.unitName() != null) {
            metadata.put("unitName", payload.unitName());
        }
        if (payload.availableQuantity() != null) {
            metadata.put("availableQuantity", payload.availableQuantity());
        }
        if (payload.threshold() != null) {
            metadata.put("threshold", payload.threshold());
        }
        if (payload.severity() != null) {
            metadata.put("severity", payload.severity());
        }
        if (payload.detectedAt() != null) {
            metadata.put("detectedAt", payload.detectedAt());
        }

        // Lưu 1 bản ghi branch-level cho manager
        saveBranchNotification(payload, templateCode, title, content, metadata);

        // Gửi WebSocket cho manager theo branch (topic /topic/manager.{branchId})
        notificationDispatchService.sendUserNotification(
                null,
                payload.branchId(),
                TARGET_ROLE_MANAGER,
                NotificationChannel.WEBSOCKET,
                templateCode,
                type,
                metadata,
                title,
                content
        );
    }

    /**
     * Kiểm tra xem đã có thông báo cho nguyên liệu này trong vòng 1 giờ qua chưa
     */
    private boolean hasRecentNotification(Integer branchId, Integer ingredientId) {
        if (branchId == null || ingredientId == null) {
            return false;
        }
        
        try {
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            List<Notification> recentNotifications = notificationRepository.findRecentInventoryNotifications(
                    branchId, ingredientId, oneHourAgo);
            return !recentNotifications.isEmpty();
        } catch (Exception e) {
            log.warn("[InventoryNotificationService] Failed to check for recent notifications: {}", e.getMessage());
            return false; // Nếu có lỗi, cho phép gửi thông báo để đảm bảo không bỏ sót
        }
    }

    private void saveBranchNotification(
            InventoryAlertPayload payload,
            String templateCode,
            String title,
            String content,
            Map<String, Object> metadata) {
        try {
            String notificationId = UUID.randomUUID().toString();
            Notification notification = Notification.builder()
                    .id(notificationId)
                    .userId(null)
                    .branchId(payload.branchId())
                    .targetRole(TARGET_ROLE_MANAGER)
                    .channel(NotificationChannel.WEBSOCKET)
                    .templateCode(templateCode)
                    .title(title)
                    .content(content)
                    .metadata(objectMapper.writeValueAsString(metadata))
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("[InventoryNotificationService] ❌ Failed to save inventory notification for branch {}", 
                    payload.branchId(), e);
        }
    }

    private String buildLowStockContent(InventoryAlertPayload payload) {
        return "Nguyên liệu %s còn %s %s (ngưỡng %s). Vui lòng kiểm tra và nhập hàng."
                .formatted(
                        payload.ingredientName(),
                        formatQuantity(payload.availableQuantity()),
                        payload.unitCode(),
                        formatQuantity(payload.threshold())
                );
    }

    private String buildOutOfStockContent(InventoryAlertPayload payload) {
        return "Nguyên liệu %s đã hết hàng. Vui lòng ưu tiên nhập kho."
                .formatted(payload.ingredientName());
    }

    private String formatQuantity(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private record InventoryAlertPayload(
            Integer branchId,
            String branchName,
            Integer ingredientId,
            String ingredientName,
            String unitCode,
            String unitName,
            BigDecimal availableQuantity,
            BigDecimal threshold,
            java.time.Instant detectedAt,
            String severity) {

        static InventoryAlertPayload from(
                Integer branchId,
                String branchName,
                Integer ingredientId,
                String ingredientName,
                String unitCode,
                String unitName,
                BigDecimal availableQuantity,
                BigDecimal threshold,
                java.time.Instant detectedAt,
                String severity) {
            return new InventoryAlertPayload(
                    branchId,
                    branchName,
                    ingredientId,
                    ingredientName,
                    unitCode,
                    unitName,
                    availableQuantity,
                    threshold,
                    detectedAt,
                    severity
            );
        }
    }
}

