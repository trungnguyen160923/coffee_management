package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IngredientResponse {
    Integer ingredientId;
    String name;
    String unit;
    BigDecimal unitPrice;
    SupplierResponse supplier;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
