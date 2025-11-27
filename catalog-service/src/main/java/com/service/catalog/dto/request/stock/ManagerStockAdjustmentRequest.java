package com.service.catalog.dto.request.stock;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ManagerStockAdjustmentRequest {

    @NotNull(message = "BranchId is required")
    Integer branchId;

    @NotNull(message = "IngredientId is required")
    Integer ingredientId;

    LocalDate adjustmentDate;

    @NotNull(message = "Physical quantity is required")
    @DecimalMin(value = "0.0000", message = "Physical quantity must be non-negative")
    BigDecimal physicalQuantity;

    String reason;

    String notes;

    Integer userId;

    String adjustedBy;

    Boolean forceAdjust;
}

