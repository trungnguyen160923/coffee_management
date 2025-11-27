package com.service.catalog.dto.response.stock;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DailyUsageSummaryResponse {

    Integer branchId;
    LocalDate date;
    List<DailyUsageItem> items;

    @Data
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyUsageItem {
        Integer ingredientId;
        String ingredientName;
        String unitCode;
        String unitName;
        BigDecimal systemQuantity; // Từ stock_reservations COMMITTED
        Boolean hasAdjustment; // Đã có bản ghi adjustment chưa
        BigDecimal actualQuantity; // Nếu có adjustment
        BigDecimal variance; // Nếu có adjustment
        String adjustmentStatus; // PENDING/COMMITTED nếu có
        Integer entryCount;
        java.time.LocalDateTime lastEntryAt;
    }
}

