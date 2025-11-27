package com.service.notification_service.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCompletedEvent {
    private Integer orderId;
    private Integer branchId;
    private Integer customerId;
    private String customerName;
    private String customerEmail;
    private String phone;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private Instant completedAt;
}

