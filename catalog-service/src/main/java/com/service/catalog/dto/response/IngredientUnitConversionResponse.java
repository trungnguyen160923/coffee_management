package com.service.catalog.dto.response;

import com.service.catalog.entity.IngredientUnitConversion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IngredientUnitConversionResponse {
    private Long id;
    private Integer ingredientId;
    private String fromUnitCode;
    private String toUnitCode;
    private BigDecimal factor;
    private String description;
    private Boolean isActive;
    private IngredientUnitConversion.ConversionScope scope;
    private Integer branchId;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
}
