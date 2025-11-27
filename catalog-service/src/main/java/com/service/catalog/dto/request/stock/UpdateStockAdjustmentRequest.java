package com.service.catalog.dto.request.stock;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateStockAdjustmentRequest {

    @NotNull(message = "Actual quantity is required")
    @DecimalMin(value = "0.0000", message = "Actual quantity must be non-negative")
    BigDecimal actualQuantity;

    String notes;
}

