package com.service.catalog.messaging;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.service.catalog.events.PurchaseOrderSupplierResponseEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.purchase-order-supplier-response:po.supplier.response}")
    private String supplierResponseTopic;

    public void publishSupplierResponse(PurchaseOrderSupplierResponseEvent event) {
        try {
            kafkaTemplate.send(supplierResponseTopic, buildKey(event.getBranchId(), event.getPoId()), event);
            log.info("[PurchaseOrderEventProducer] Published supplier response event for po {} branch {} status {}",
                    event.getPoNumber(), event.getBranchId(), event.getStatus());
        } catch (Exception ex) {
            log.error("[PurchaseOrderEventProducer] Failed to publish supplier response event {}", event, ex);
        }
    }

    private String buildKey(Integer branchId, Integer poId) {
        return "%s-%s".formatted(
                branchId != null ? branchId : "unknown",
                poId != null ? poId : "unknown");
    }
}


