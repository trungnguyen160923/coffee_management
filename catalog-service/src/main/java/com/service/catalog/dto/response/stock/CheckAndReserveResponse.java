package com.service.catalog.dto.response.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckAndReserveResponse {
    private String holdId;
    private LocalDateTime expiresAt;
    private List<IngredientSummary> ingredientSummaries;
    private List<ItemSummary> itemSummaries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredientSummary {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal totalRequired;
        private BigDecimal availableQuantity;
        private String unitCode;
        private String status; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemSummary {
        private Integer productDetailId;
        private String productName;
        private Integer quantity;
        private BigDecimal totalCost;
        private List<IngredientRequirement> requirements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredientRequirement {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal requiredQuantity;
        private String unitCode;
    }
}
