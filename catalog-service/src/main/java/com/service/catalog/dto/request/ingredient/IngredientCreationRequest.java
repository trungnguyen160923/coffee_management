package com.service.catalog.dto.request.ingredient;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IngredientCreationRequest {
    @NotBlank(message = "EMPTY_NAME_INGREDIENT")
    @Size(max = 150, message = "INVALID_NAME_INGREDIENT")
    String name;
    
    @Size(max = 20, message = "INVALID_UNIT")
    String unitCode;
    
    @NotNull(message = "EMPTY_UNIT_PRICE")
    BigDecimal unitPrice;

    @NotNull(message = "EMPTY_SUPPLIER_ID")
    Integer supplierId;
}
