package com.service.catalog.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PoDetailReceiptStatus {
    private Integer poDetailId;
    private Integer ingredientId;
    private String ingredientName;
    private BigDecimal orderedQty;
    private BigDecimal receivedQty;
    private BigDecimal damageQty;
    private BigDecimal remainingQty;
    private String status; // FULLY_RECEIVED, PARTIALLY_RECEIVED, NOT_RECEIVED
    private String unitCode;
    private boolean canReceiveMore; // Whether more receipts are allowed
    private String lastReceiptStatus; // Status of the last receipt
    private String receiptMessage; // Human-readable message about receipt status
}
