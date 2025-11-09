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
public class MaterialCostMetricsResponse {
    private Integer branchId;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalMaterialCost;
    private Integer totalTransactions;
    private Map<String, BigDecimal> costByTransactionType;
    private List<CostByIngredient> costByIngredient;
    private List<DailyCostBreakdown> dailyCostBreakdown;
    private List<TopCostIngredient> topCostIngredients;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CostByIngredient {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal totalCost;
        private BigDecimal quantityReceived;
        private BigDecimal quantityIssued;
        private String unitCode;
        private BigDecimal avgUnitCost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyCostBreakdown {
        private LocalDate date;
        private BigDecimal totalCost;
        private BigDecimal receiptCost;
        private BigDecimal issueCost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopCostIngredient {
        private Integer ingredientId;
        private String ingredientName;
        private BigDecimal totalCost;
        private BigDecimal percentage;
    }
}

