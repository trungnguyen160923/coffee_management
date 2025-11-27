package com.service.notification_service.events;

import java.math.BigDecimal;
import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LowStockEvent {
    private Integer branchId;
    private String branchName;
    private Integer ingredientId;
    private String ingredientName;
    private String ingredientSku;
    private BigDecimal quantity;
    private BigDecimal reservedQuantity;
    private BigDecimal availableQuantity;
    private BigDecimal threshold;
    private String unitCode;
    private String unitName;
    private Instant detectedAt;
    private String severity; // e.g. WARNING, URGENT
}

