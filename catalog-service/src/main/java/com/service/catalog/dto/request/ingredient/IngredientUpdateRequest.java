package com.service.catalog.dto.request.ingredient;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import java.math.BigDecimal;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IngredientUpdateRequest {
    @Size(max = 150, message = "INVALID_NAME_INGREDIENT")
    String name;
    
    @Size(max = 50, message = "INVALID_UNIT")
    String unit;
    
    BigDecimal unitPrice;

    Integer supplierId;
}
