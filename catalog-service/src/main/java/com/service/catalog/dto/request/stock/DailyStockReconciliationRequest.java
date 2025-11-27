package com.service.catalog.dto.request.stock;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DailyStockReconciliationRequest {

    @NotNull(message = "BranchId is required")
    Integer branchId;

    @NotNull(message = "Adjustment date is required")
    LocalDate adjustmentDate;

    Integer userId;

    String adjustedBy;

    boolean commitImmediately;

    @NotEmpty(message = "Adjustment items are required")
    @Valid
    List<DailyStockAdjustmentItemRequest> items;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyStockAdjustmentItemRequest {

        @NotNull(message = "IngredientId is required")
        Integer ingredientId;

        @NotNull(message = "Actual used quantity is required")
        @DecimalMin(value = "0.0000", message = "Actual used quantity must be non-negative")
        BigDecimal actualUsedQuantity;

        String notes;
    }
}

