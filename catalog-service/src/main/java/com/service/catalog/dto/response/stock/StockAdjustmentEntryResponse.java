package com.service.catalog.dto.response.stock;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StockAdjustmentEntryResponse {

    Long entryId;
    Long adjustmentId;
    Integer branchId;
    Integer ingredientId;
    BigDecimal entryQuantity;
    String recordedBy;
    Integer userId;
    LocalDateTime entryTime;
    String notes;
    String source;
}

