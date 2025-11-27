package orderservice.order_service.service;

import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.events.OrderCreatedEvent;
import orderservice.order_service.events.OrderCompletedEvent;
import orderservice.order_service.events.ReservationCreatedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public OrderEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    
    private static final String ORDER_CREATED_TOPIC = "order.created";
    private static final String ORDER_COMPLETED_TOPIC = "order.completed";
    private static final String ORDER_CANCELLED_TOPIC = "order.cancelled";
    private static final String RESERVATION_CREATED_TOPIC = "reservation.created";
    private static final String RESERVATION_CONFIRMED_TOPIC = "reservation.confirmed";
    private static final String RESERVATION_CANCELLED_TOPIC = "reservation.cancelled";

    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing order.created event ===");
            log.info("OrderId: {}", event.getOrderId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("TotalAmount: {}", event.getTotalAmount());
            log.info("PaymentMethod: {}", event.getPaymentMethod());
            log.info("Topic: {}", ORDER_CREATED_TOPIC);
            
            // Send object directly, JsonSerializer will handle serialization
            kafkaTemplate.send(ORDER_CREATED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published order.created event to topic '{}' for orderId: {}", 
                    ORDER_CREATED_TOPIC, event.getOrderId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish order.created event for orderId: {}", 
                    event.getOrderId(), e);
            // Don't throw exception to avoid breaking order creation flow
        }
    }

    public void publishOrderCompleted(OrderCompletedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing order.completed event ===");
            log.info("OrderId: {}", event.getOrderId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("TotalAmount: {}", event.getTotalAmount());
            log.info("Topic: {}", ORDER_COMPLETED_TOPIC);
            
            kafkaTemplate.send(ORDER_COMPLETED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published order.completed event to topic '{}' for orderId: {}", 
                    ORDER_COMPLETED_TOPIC, event.getOrderId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish order.completed event for orderId: {}", 
                    event.getOrderId(), e);
            // Don't throw exception to avoid breaking order status update flow
        }
    }

    public void publishOrderCancelled(OrderCompletedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing order.cancelled event ===");
            log.info("OrderId: {}", event.getOrderId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("TotalAmount: {}", event.getTotalAmount());
            log.info("Topic: {}", ORDER_CANCELLED_TOPIC);
            
            kafkaTemplate.send(ORDER_CANCELLED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published order.cancelled event to topic '{}' for orderId: {}", 
                    ORDER_CANCELLED_TOPIC, event.getOrderId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish order.cancelled event for orderId: {}", 
                    event.getOrderId(), e);
            // Don't throw exception to avoid breaking order status update flow
        }
    }

    public void publishReservationCreated(ReservationCreatedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing reservation.created event ===");
            log.info("ReservationId: {}", event.getReservationId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("ReservedAt: {}", event.getReservedAt());
            log.info("PartySize: {}", event.getPartySize());
            log.info("Topic: {}", RESERVATION_CREATED_TOPIC);
            
            kafkaTemplate.send(RESERVATION_CREATED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published reservation.created event to topic '{}' for reservationId: {}", 
                    RESERVATION_CREATED_TOPIC, event.getReservationId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish reservation.created event for reservationId: {}", 
                    event.getReservationId(), e);
            // Don't throw exception to avoid breaking reservation creation flow
        }
    }

    public void publishReservationConfirmed(ReservationCreatedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing reservation.confirmed event ===");
            log.info("ReservationId: {}", event.getReservationId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("Topic: {}", RESERVATION_CONFIRMED_TOPIC);
            
            kafkaTemplate.send(RESERVATION_CONFIRMED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published reservation.confirmed event to topic '{}' for reservationId: {}", 
                    RESERVATION_CONFIRMED_TOPIC, event.getReservationId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish reservation.confirmed event for reservationId: {}", 
                    event.getReservationId(), e);
            // Don't throw exception to avoid breaking reservation status update flow
        }
    }

    public void publishReservationCancelled(ReservationCreatedEvent event) {
        try {
            log.info("=== [OrderEventProducer] Publishing reservation.cancelled event ===");
            log.info("ReservationId: {}", event.getReservationId());
            log.info("BranchId: {}", event.getBranchId());
            log.info("CustomerId: {}", event.getCustomerId());
            log.info("CustomerName: {}", event.getCustomerName());
            log.info("Topic: {}", RESERVATION_CANCELLED_TOPIC);
            
            kafkaTemplate.send(RESERVATION_CANCELLED_TOPIC, event);
            log.info("[OrderEventProducer] ✅ Successfully published reservation.cancelled event to topic '{}' for reservationId: {}", 
                    RESERVATION_CANCELLED_TOPIC, event.getReservationId());
            log.info("=== [OrderEventProducer] Event published successfully ===");
        } catch (Exception e) {
            log.error("[OrderEventProducer] ❌ Failed to publish reservation.cancelled event for reservationId: {}", 
                    event.getReservationId(), e);
            // Don't throw exception to avoid breaking reservation cancellation flow
        }
    }
}

