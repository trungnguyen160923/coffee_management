package com.service.catalog.dto.response.stock;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StockAdjustmentResponse {

    Long adjustmentId;
    Integer branchId;
    Integer ingredientId;
    String ingredientName;
    String adjustmentType;
    String status;
    BigDecimal quantity;
    BigDecimal systemQuantity;
    BigDecimal actualQuantity;
    BigDecimal variance;
    LocalDate adjustmentDate;
    String notes;
    String adjustedBy;
    Integer userId;
    Integer entryCount;
    LocalDateTime lastEntryAt;
    String reason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

