package com.service.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMetricsResponse {
    private Integer branchId;
    private LocalDate reportDate;
    private Integer totalIngredients;
    private Integer lowStockProducts;
    private Integer outOfStockProducts;
    private BigDecimal totalInventoryValue;
    private List<LowStockItem> lowStockItems;
    private List<OutOfStockItem> outOfStockItems;
    private Map<String, BigDecimal> inventoryByCategory;
    private List<TopIngredientByValue> topIngredientsByValue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockItem {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal currentQuantity;
        private BigDecimal threshold;
        private String unitCode;
        private String unitName;
        private BigDecimal availableQuantity;
        private BigDecimal reservedQuantity;
        private BigDecimal avgCost;
        private BigDecimal stockValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OutOfStockItem {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal currentQuantity;
        private BigDecimal threshold;
        private String unitCode;
        private String unitName;
        private BigDecimal availableQuantity;
        private BigDecimal reservedQuantity;
        private BigDecimal avgCost;
        private BigDecimal stockValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopIngredientByValue {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal quantity;
        private String unitCode;
        private BigDecimal avgCost;
        private BigDecimal stockValue;
    }
}

