package com.service.catalog.messaging;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.service.catalog.events.LowStockEvent;
import com.service.catalog.events.OutOfStockEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.inventory-low-stock:inventory.low.stock}")
    private String lowStockTopic;

    @Value("${app.kafka.topics.inventory-out-of-stock:inventory.out.of.stock}")
    private String outOfStockTopic;

    public void publishLowStock(LowStockEvent event) {
        try {
            kafkaTemplate.send(lowStockTopic, buildKey(event.getBranchId(), event.getIngredientId()), event);
            log.info("[InventoryEventProducer] Published low stock event for branch {} ingredient {}", event.getBranchId(),
                    event.getIngredientId());
        } catch (Exception ex) {
            log.error("[InventoryEventProducer] Failed to publish low stock event {}", event, ex);
        }
    }

    public void publishOutOfStock(OutOfStockEvent event) {
        try {
            kafkaTemplate.send(outOfStockTopic, buildKey(event.getBranchId(), event.getIngredientId()), event);
            log.info("[InventoryEventProducer] Published out of stock event for branch {} ingredient {}", event.getBranchId(),
                    event.getIngredientId());
        } catch (Exception ex) {
            log.error("[InventoryEventProducer] Failed to publish out of stock event {}", event, ex);
        }
    }

    private String buildKey(Integer branchId, Integer ingredientId) {
        return "%s-%s".formatted(
                branchId != null ? branchId : "unknown",
                ingredientId != null ? ingredientId : "unknown");
    }
}

