package com.service.notification_service.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.notification_service.entity.Notification;
import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.entity.enums.NotificationStatus;
import com.service.notification_service.events.LowStockEvent;
import com.service.notification_service.events.OutOfStockEvent;
import com.service.notification_service.repository.NotificationRepository;
import com.service.notification_service.websocket.dto.NotificationMessage;
import com.service.notification_service.websocket.dto.NotificationType;
import com.service.notification_service.websocket.service.NotificationWebSocketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryNotificationService {

    private static final String TARGET_ROLE_MANAGER = "MANAGER";
    private static final String LOW_STOCK_TEMPLATE_CODE = "LOW_STOCK_ALERT_EMAIL";
    private static final String OUT_OF_STOCK_TEMPLATE_CODE = "OUT_OF_STOCK_ALERT_EMAIL";

    private final ObjectMapper objectMapper;
    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketService notificationWebSocketService;
    private final StaffDirectoryService staffDirectoryService;

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

        Map<String, Object> metadata = Map.of(
                "branchId", payload.branchId(),
                "branchName", payload.branchName(),
                "ingredientId", payload.ingredientId(),
                "ingredientName", payload.ingredientName(),
                "unitCode", payload.unitCode(),
                "unitName", payload.unitName(),
                "availableQuantity", payload.availableQuantity(),
                "threshold", payload.threshold(),
                "severity", payload.severity(),
                "detectedAt", payload.detectedAt()
        );

        saveBranchNotification(payload, templateCode, title, content, metadata);
        dispatchWebSocket(payload, type, title, content, metadata);
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

    private void dispatchWebSocket(
            InventoryAlertPayload payload,
            NotificationType type,
            String title,
            String content,
            Map<String, Object> metadata) {

        List<Integer> managerIds = staffDirectoryService.getManagerIdsByBranch(payload.branchId());
        if (CollectionUtils.isEmpty(managerIds)) {
            log.warn("[InventoryNotificationService] ⚠️ No managers found for branch {}. Broadcasting to branch staff instead.",
                    payload.branchId());
            NotificationMessage fallbackMessage = NotificationMessage.builder()
                    .id(UUID.randomUUID().toString())
                    .type(type)
                    .title(title)
                    .content(content)
                    .branchId(payload.branchId())
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();
            notificationWebSocketService.sendToBranchStaff(payload.branchId(), fallbackMessage);
            return;
        }

        managerIds.forEach(managerId -> {
            NotificationMessage message = NotificationMessage.builder()
                    .id(UUID.randomUUID().toString())
                    .type(type)
                    .title(title)
                    .content(content)
                    .branchId(payload.branchId())
                    .userId(managerId)
                    .metadata(metadata)
                    .createdAt(java.time.Instant.now())
                    .build();
            notificationWebSocketService.sendToUser(managerId, message);
        });
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

