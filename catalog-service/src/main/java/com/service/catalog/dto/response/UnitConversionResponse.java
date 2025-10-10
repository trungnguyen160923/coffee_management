package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitConversionResponse {
    private boolean canConvert;
    private BigDecimal convertedQuantity;
    private BigDecimal conversionFactor;
    private String errorMessage;
}
