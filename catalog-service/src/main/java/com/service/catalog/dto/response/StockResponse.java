package com.service.catalog.dto.response;

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
public class StockResponse {
    private Integer stockId;
    private Integer ingredientId;
    private String ingredientName;
    private String ingredientSku;
    private Integer branchId;
    private String branchName;
    private BigDecimal quantity;
    private String unitCode;
    private String unitName;
    private BigDecimal threshold;
    private BigDecimal reservedQuantity;
    private BigDecimal availableQuantity;
    private LocalDateTime lastUpdated;
    private Boolean isLowStock;
    private Boolean isOutOfStock;
    private BigDecimal avgCost;
}
