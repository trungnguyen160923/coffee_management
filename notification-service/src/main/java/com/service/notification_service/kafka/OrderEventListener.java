package com.service.notification_service.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.notification_service.events.OrderCreatedEvent;
import com.service.notification_service.service.OrderNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventListener {

    private final ObjectMapper objectMapper;
    private final OrderNotificationService orderNotificationService;

    private static final String ORDER_CREATED_TOPIC = "${app.kafka.topics.order-created:order.created}";
    private static final String GROUP_ID = "${spring.kafka.consumer.group-id:notification-service}";

    @KafkaListener(topics = ORDER_CREATED_TOPIC, groupId = GROUP_ID)
    public void onOrderCreated(@Payload String payload) {
        try {
            log.info("[OrderEventListener] Received order.created event: {}", payload);
            OrderCreatedEvent event = objectMapper.readValue(payload, OrderCreatedEvent.class);
            orderNotificationService.notifyOrderCreated(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process order.created payload: {}", payload, ex);
        }
    }
}

