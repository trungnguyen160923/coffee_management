package com.service.catalog.dto.request.goodsReceipt;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateUnitConversionRequest {
    private Integer ingredientId;
    private String fromUnitCode;
    private String toUnitCode;
    private BigDecimal quantity;
}
