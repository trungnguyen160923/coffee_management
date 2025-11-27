package com.service.notification_service.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import com.service.notification_service.events.LowStockEvent;
import com.service.notification_service.events.OutOfStockEvent;
import com.service.notification_service.service.InventoryNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryEventListener {

    private final InventoryNotificationService inventoryNotificationService;

    private static final String GROUP_ID = "${spring.kafka.consumer.group-id:notification-service}";
    private static final String LOW_STOCK_TOPIC = "${app.kafka.topics.inventory-low-stock:inventory.low.stock}";
    private static final String OUT_OF_STOCK_TOPIC = "${app.kafka.topics.inventory-out-of-stock:inventory.out.of.stock}";

    @KafkaListener(
        topics = LOW_STOCK_TOPIC,
        groupId = GROUP_ID,
        containerFactory = "inventoryLowStockKafkaListenerContainerFactory"
    )
    public void onLowStock(@Payload LowStockEvent event) {
        try {
            inventoryNotificationService.notifyLowStock(event);
        } catch (Exception ex) {
            log.error("[InventoryEventListener] ❌ Failed to process inventory.low.stock event: {}", event, ex);
        }
    }

    @KafkaListener(
        topics = OUT_OF_STOCK_TOPIC,
        groupId = GROUP_ID,
        containerFactory = "inventoryOutOfStockKafkaListenerContainerFactory"
    )
    public void onOutOfStock(@Payload OutOfStockEvent event) {
        try {
            inventoryNotificationService.notifyOutOfStock(event);
        } catch (Exception ex) {
            log.error("[InventoryEventListener] ❌ Failed to process inventory.out.of.stock event: {}", event, ex);
        }
    }
}

