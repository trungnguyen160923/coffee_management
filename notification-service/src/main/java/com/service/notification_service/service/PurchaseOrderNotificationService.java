package com.service.notification_service.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.service.notification_service.entity.enums.NotificationChannel;
import com.service.notification_service.events.PurchaseOrderSupplierResponseEvent;
import com.service.notification_service.websocket.dto.NotificationType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderNotificationService {

    private static final String TARGET_ROLE_MANAGER = "MANAGER";
    private static final String TEMPLATE_CONFIRMED = "PO_SUPPLIER_CONFIRMED_WS";
    private static final String TEMPLATE_CANCELLED = "PO_SUPPLIER_CANCELLED_WS";

    private final NotificationDispatchService notificationDispatchService;

    public void notifySupplierResponse(PurchaseOrderSupplierResponseEvent event) {
        if (event == null || event.getBranchId() == null) {
            log.warn("[PurchaseOrderNotificationService] Invalid event payload: {}", event);
            return;
        }

        String status = event.getStatus();
        boolean isConfirmed = "SUPPLIER_CONFIRMED".equalsIgnoreCase(status);

        String templateCode = isConfirmed ? TEMPLATE_CONFIRMED : TEMPLATE_CANCELLED;
        String fallbackTitle = buildFallbackTitle(event, isConfirmed);
        String fallbackContent = buildFallbackContent(event, isConfirmed);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("poId", event.getPoId());
        metadata.put("poNumber", event.getPoNumber());
        metadata.put("branchId", event.getBranchId());
        if (event.getBranchName() != null) {
            metadata.put("branchName", event.getBranchName());
        }
        if (event.getSupplierName() != null) {
            metadata.put("supplierName", event.getSupplierName());
        }
        if (event.getStatus() != null) {
            metadata.put("status", event.getStatus());
        }
        if (event.getTotalAmount() != null) {
            metadata.put("totalAmount", event.getTotalAmount());
        }
        if (event.getExpectedDeliveryAt() != null) {
            metadata.put("expectedDeliveryAt", event.getExpectedDeliveryAt());
        }
        if (event.getSupplierResponse() != null) {
            metadata.put("supplierResponse", event.getSupplierResponse());
        }

        // Manager-level notification: branchId + role = MANAGER (userId sẽ được lọc ở frontend bằng branch)
        notificationDispatchService.sendUserNotification(
                null,
                event.getBranchId(),
                TARGET_ROLE_MANAGER,
                NotificationChannel.WEBSOCKET,
                templateCode,
                NotificationType.SYSTEM_ALERT,
                metadata,
                fallbackTitle,
                fallbackContent
        );
    }

    private String buildFallbackTitle(PurchaseOrderSupplierResponseEvent event, boolean confirmed) {
        if (confirmed) {
            return "Nhà cung cấp đã xác nhận PO " + event.getPoNumber();
        }
        return "Nhà cung cấp đã hủy PO " + event.getPoNumber();
    }

    private String buildFallbackContent(PurchaseOrderSupplierResponseEvent event, boolean confirmed) {
        String supplier = event.getSupplierName() != null ? event.getSupplierName() : "Nhà cung cấp";
        String branch = event.getBranchName() != null ? event.getBranchName() : ("Chi nhánh #" + event.getBranchId());
        if (confirmed) {
            return "%s đã xác nhận đơn mua hàng %s cho %s. Tổng giá trị: %s."
                    .formatted(supplier, event.getPoNumber(), branch,
                            event.getTotalAmount() != null ? event.getTotalAmount() : "N/A");
        }
        String reason = event.getSupplierResponse() != null ? event.getSupplierResponse() : "Không có lý do cụ thể";
        return "%s đã hủy đơn mua hàng %s cho %s. Lý do: %s."
                .formatted(supplier, event.getPoNumber(), branch, reason);
    }
}


