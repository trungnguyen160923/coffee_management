package com.service.notification_service.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import com.service.notification_service.events.PurchaseOrderSupplierResponseEvent;
import com.service.notification_service.service.PurchaseOrderNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class PurchaseOrderEventListener {

    private final PurchaseOrderNotificationService purchaseOrderNotificationService;

    private static final String GROUP_ID = "${spring.kafka.consumer.group-id:notification-service}";
    private static final String PO_SUPPLIER_RESPONSE_TOPIC = "${app.kafka.topics.po-supplier-response:po.supplier.response}";

    @KafkaListener(
            topics = PO_SUPPLIER_RESPONSE_TOPIC,
            groupId = GROUP_ID,
            containerFactory = "poSupplierResponseKafkaListenerContainerFactory"
    )
    public void onSupplierResponse(@Payload PurchaseOrderSupplierResponseEvent event) {
        try {
            if (event == null || event.getPoId() == null) {
                log.warn("[PurchaseOrderEventListener] Received invalid PurchaseOrderSupplierResponseEvent, skipping");
                return;
            }
            purchaseOrderNotificationService.notifySupplierResponse(event);
        } catch (Exception ex) {
            log.error("[PurchaseOrderEventListener] ❌ Failed to process po.supplier.response event for poId: {}",
                    event != null ? event.getPoId() : "unknown", ex);
        }
    }
}


