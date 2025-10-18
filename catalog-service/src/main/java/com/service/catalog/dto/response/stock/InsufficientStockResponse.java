package com.service.catalog.dto.response.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsufficientStockResponse {
    private String message;
    private List<StockError> errors;
    private List<InsufficientIngredient> insufficientIngredients;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockError {
        private Integer productDetailId;
        private String productName;
        private String reason;
        private Integer suggestQuantity;
        private List<String> missingIngredients;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsufficientIngredient {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal required;
        private BigDecimal available;
        private String unitCode;
        private BigDecimal shortage;
    }
}
