package com.service.catalog.dto.response.stock;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DailyStockReconciliationResponse {

    Integer branchId;
    LocalDate adjustmentDate;
    int processedItems;
    int committedItems;
    BigDecimal totalVariance;
    List<DailyStockReconciliationResult> results;

    @Data
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyStockReconciliationResult {
        Integer ingredientId;
        String ingredientName;
        BigDecimal systemQuantity;
        BigDecimal actualQuantity;
        BigDecimal variance;
        String adjustmentType;
        String status;
        Long adjustmentId;
        String notes;
        Long entryId;
        BigDecimal entryQuantity;
        LocalDateTime entryTime;
        Integer entryCount;
        LocalDateTime lastEntryAt;
    }
}

