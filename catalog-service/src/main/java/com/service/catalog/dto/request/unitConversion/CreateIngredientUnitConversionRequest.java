package com.service.catalog.dto.request.unitConversion;

import com.service.catalog.entity.IngredientUnitConversion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateIngredientUnitConversionRequest {
    private Integer ingredientId;
    private String fromUnitCode;
    private String toUnitCode;
    private BigDecimal factor;
    private String description;
    private IngredientUnitConversion.ConversionScope scope;
    private Integer branchId;
}
