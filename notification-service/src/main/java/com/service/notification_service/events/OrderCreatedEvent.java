package com.service.notification_service.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import lombok.Data;

@Data
public class OrderCreatedEvent {
    private Integer orderId;
    private Integer branchId;
    private Integer customerId;
    private String customerName;
    private String customerEmail;
    private String phone;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private Instant createdAt;
    private List<OrderItemSummary> items;

    @Data
    public static class OrderItemSummary {
        private Integer pdId;
        private String productName;
        private Integer quantity;
    }
}

