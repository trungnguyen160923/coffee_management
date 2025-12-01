package com.service.notification_service.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import com.service.notification_service.events.OrderCreatedEvent;
import com.service.notification_service.events.OrderCompletedEvent;
import com.service.notification_service.events.ReservationCreatedEvent;
import com.service.notification_service.service.OrderNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventListener {

    private final OrderNotificationService orderNotificationService;

    private static final String ORDER_CREATED_TOPIC = "${app.kafka.topics.order-created:order.created}";
    private static final String ORDER_COMPLETED_TOPIC = "${app.kafka.topics.order-completed:order.completed}";
    private static final String ORDER_CANCELLED_TOPIC = "${app.kafka.topics.order-cancelled:order.cancelled}";
    private static final String RESERVATION_CREATED_TOPIC = "${app.kafka.topics.reservation-created:reservation.created}";
    private static final String RESERVATION_CONFIRMED_TOPIC = "${app.kafka.topics.reservation-confirmed:reservation.confirmed}";
    private static final String RESERVATION_CANCELLED_TOPIC = "${app.kafka.topics.reservation-cancelled:reservation.cancelled}";
    private static final String GROUP_ID = "${spring.kafka.consumer.group-id:notification-service}";

    @KafkaListener(
        topics = ORDER_CREATED_TOPIC,
        groupId = GROUP_ID,
        containerFactory = "orderCreatedKafkaListenerContainerFactory"
    )
    public void onOrderCreated(@Payload OrderCreatedEvent event) {
        try {
            orderNotificationService.notifyOrderCreated(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process order.created event for orderId: {}", event.getOrderId(), ex);
        }
    }

    @KafkaListener(
        topics = ORDER_COMPLETED_TOPIC, 
        groupId = GROUP_ID,
        containerFactory = "orderCompletedKafkaListenerContainerFactory"
    )
    public void onOrderCompleted(@Payload OrderCompletedEvent event) {
        try {
            if (event == null || event.getOrderId() == null) {
                log.warn("[OrderEventListener] Received invalid OrderCompletedEvent, skipping");
                return;
            }
            orderNotificationService.notifyOrderCompleted(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process order.completed event for orderId: {}", 
                    event != null ? event.getOrderId() : "unknown", ex);
        }
    }

    @KafkaListener(
        topics = ORDER_CANCELLED_TOPIC, 
        groupId = GROUP_ID,
        containerFactory = "orderCompletedKafkaListenerContainerFactory"
    )
    public void onOrderCancelled(@Payload OrderCompletedEvent event) {
        try {
            if (event == null || event.getOrderId() == null) {
                log.warn("[OrderEventListener] Received invalid OrderCancelledEvent, skipping");
                return;
            }
            orderNotificationService.notifyOrderCancelled(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process order.cancelled event for orderId: {}", 
                    event != null ? event.getOrderId() : "unknown", ex);
        }
    }

    @KafkaListener(
        topics = RESERVATION_CREATED_TOPIC, 
        groupId = GROUP_ID,
        containerFactory = "reservationCreatedKafkaListenerContainerFactory"
    )
    public void onReservationCreated(@Payload ReservationCreatedEvent event) {
        try {
            if (event == null || event.getReservationId() == null) {
                log.warn("[OrderEventListener] Received invalid ReservationCreatedEvent, skipping");
                return;
            }
            orderNotificationService.notifyReservationCreated(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process reservation.created event for reservationId: {}", 
                    event != null ? event.getReservationId() : "unknown", ex);
        }
    }

    @KafkaListener(
        topics = RESERVATION_CONFIRMED_TOPIC, 
        groupId = GROUP_ID,
        containerFactory = "reservationCreatedKafkaListenerContainerFactory"
    )
    public void onReservationConfirmed(@Payload ReservationCreatedEvent event) {
        try {
            if (event == null || event.getReservationId() == null) {
                log.warn("[OrderEventListener] Received invalid ReservationConfirmedEvent, skipping");
                return;
            }
            orderNotificationService.notifyReservationConfirmed(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process reservation.confirmed event for reservationId: {}", 
                    event != null ? event.getReservationId() : "unknown", ex);
        }
    }

    @KafkaListener(
        topics = RESERVATION_CANCELLED_TOPIC, 
        groupId = GROUP_ID,
        containerFactory = "reservationCreatedKafkaListenerContainerFactory"
    )
    public void onReservationCancelled(@Payload ReservationCreatedEvent event) {
        try {
            if (event == null || event.getReservationId() == null) {
                log.warn("[OrderEventListener] Received invalid ReservationCancelledEvent, skipping");
                return;
            }
            orderNotificationService.notifyReservationCancelled(event);
        } catch (Exception ex) {
            log.error("[OrderEventListener] Failed to process reservation.cancelled event for reservationId: {}", 
                    event != null ? event.getReservationId() : "unknown", ex);
        }
    }
}

