package com.service.catalog.service;

import com.service.catalog.dto.response.InventoryMetricsResponse;
import com.service.catalog.dto.response.MaterialCostMetricsResponse;
import com.service.catalog.entity.InventoryCost;
import com.service.catalog.entity.InventoryCostId;
import com.service.catalog.entity.InventoryTransaction;
import com.service.catalog.entity.Stock;
import com.service.catalog.repository.InventoryCostRepository;
import com.service.catalog.repository.InventoryTransactionRepository;
import com.service.catalog.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final StockRepository stockRepository;
    private final InventoryCostRepository inventoryCostRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    public InventoryMetricsResponse getInventoryMetrics(Integer branchId, LocalDate date) {
        try {
            // Lấy tất cả stocks của branch
            List<Stock> stocks = stockRepository.findByBranchId(branchId);

            if (stocks.isEmpty()) {
                return InventoryMetricsResponse.builder()
                        .branchId(branchId)
                        .reportDate(date)
                        .totalIngredients(0)
                        .lowStockProducts(0)
                        .outOfStockProducts(0)
                        .totalInventoryValue(BigDecimal.ZERO)
                        .lowStockItems(new ArrayList<>())
                        .outOfStockItems(new ArrayList<>())
                        .inventoryByCategory(new HashMap<>())
                        .topIngredientsByValue(new ArrayList<>())
                        .build();
            }

            // Lấy low stock và out of stock items
            List<Stock> lowStockList = stockRepository.findLowStockItems(branchId);
            List<Stock> outOfStockList = stockRepository.findOutOfStockItems(branchId);

            // Tính toán metrics
            int totalIngredients = stocks.size();
            int lowStockCount = lowStockList.size();
            int outOfStockCount = outOfStockList.size();

            // Tính tổng giá trị tồn kho và build các lists
            BigDecimal totalInventoryValue = BigDecimal.ZERO;
            List<InventoryMetricsResponse.LowStockItem> lowStockItems = new ArrayList<>();
            List<InventoryMetricsResponse.OutOfStockItem> outOfStockItems = new ArrayList<>();
            List<InventoryMetricsResponse.TopIngredientByValue> topIngredientsByValue = new ArrayList<>();

            // Map để tính tổng giá trị theo category (phân loại theo unit dimension)
            Map<String, BigDecimal> inventoryByCategory = new HashMap<>();

            for (Stock stock : stocks) {
                BigDecimal availableQuantity = stock.getAvailableQuantity();
                BigDecimal avgCost = getAverageCost(stock);
                BigDecimal stockValue = availableQuantity.multiply(avgCost);
                totalInventoryValue = totalInventoryValue.add(stockValue);

                // Phân loại theo unit dimension (WEIGHT, VOLUME, COUNT, etc.)
                String category = "OTHER";
                if (stock.getUnit() != null && stock.getUnit().getDimension() != null) {
                    category = stock.getUnit().getDimension().toUpperCase();
                }
                inventoryByCategory.put(category, 
                    inventoryByCategory.getOrDefault(category, BigDecimal.ZERO).add(stockValue));

                // Build low stock item
                if (stock.isLowStock() && !stock.isOutOfStock()) {
                    InventoryMetricsResponse.LowStockItem lowStockItem = InventoryMetricsResponse.LowStockItem.builder()
                            .ingredientId(stock.getIngredient().getIngredientId())
                            .ingredientName(stock.getIngredient().getName())
                            .currentQuantity(stock.getQuantity())
                            .threshold(stock.getThreshold())
                            .unitCode(stock.getUnit() != null ? stock.getUnit().getCode() : null)
                            .unitName(stock.getUnit() != null ? stock.getUnit().getName() : null)
                            .availableQuantity(availableQuantity)
                            .reservedQuantity(stock.getReservedQuantity())
                            .avgCost(avgCost)
                            .stockValue(stockValue)
                            .build();
                    lowStockItems.add(lowStockItem);
                }

                // Build out of stock item
                if (stock.isOutOfStock()) {
                    InventoryMetricsResponse.OutOfStockItem outOfStockItem = InventoryMetricsResponse.OutOfStockItem.builder()
                            .ingredientId(stock.getIngredient().getIngredientId())
                            .ingredientName(stock.getIngredient().getName())
                            .currentQuantity(stock.getQuantity())
                            .threshold(stock.getThreshold())
                            .unitCode(stock.getUnit() != null ? stock.getUnit().getCode() : null)
                            .unitName(stock.getUnit() != null ? stock.getUnit().getName() : null)
                            .availableQuantity(availableQuantity)
                            .reservedQuantity(stock.getReservedQuantity())
                            .avgCost(avgCost)
                            .stockValue(stockValue)
                            .build();
                    outOfStockItems.add(outOfStockItem);
                }

                // Build top ingredients by value
                InventoryMetricsResponse.TopIngredientByValue topIngredient = InventoryMetricsResponse.TopIngredientByValue.builder()
                        .ingredientId(stock.getIngredient().getIngredientId())
                        .ingredientName(stock.getIngredient().getName())
                        .quantity(availableQuantity)
                        .unitCode(stock.getUnit() != null ? stock.getUnit().getCode() : null)
                        .avgCost(avgCost)
                        .stockValue(stockValue)
                        .build();
                topIngredientsByValue.add(topIngredient);
            }

            // Sort top ingredients by value (descending) and limit to top 10
            topIngredientsByValue.sort((a, b) -> b.getStockValue().compareTo(a.getStockValue()));
            topIngredientsByValue = topIngredientsByValue.stream()
                    .limit(10)
                    .collect(Collectors.toList());

            return InventoryMetricsResponse.builder()
                    .branchId(branchId)
                    .reportDate(date)
                    .totalIngredients(totalIngredients)
                    .lowStockProducts(lowStockCount)
                    .outOfStockProducts(outOfStockCount)
                    .totalInventoryValue(totalInventoryValue)
                    .lowStockItems(lowStockItems)
                    .outOfStockItems(outOfStockItems)
                    .inventoryByCategory(inventoryByCategory)
                    .topIngredientsByValue(topIngredientsByValue)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating inventory metrics for branch {} on date {}", branchId, date, e);
            return InventoryMetricsResponse.builder()
                    .branchId(branchId)
                    .reportDate(date)
                    .totalIngredients(0)
                    .lowStockProducts(0)
                    .outOfStockProducts(0)
                    .totalInventoryValue(BigDecimal.ZERO)
                    .lowStockItems(new ArrayList<>())
                    .outOfStockItems(new ArrayList<>())
                    .inventoryByCategory(new HashMap<>())
                    .topIngredientsByValue(new ArrayList<>())
                    .build();
        }
    }

    public MaterialCostMetricsResponse getMaterialCostMetrics(
            Integer branchId, LocalDate startDate, LocalDate endDate) {
        try {
            // Lấy tất cả transactions trong khoảng thời gian
            List<InventoryTransaction> transactions = inventoryTransactionRepository
                    .findByBranchIdAndDateRange(branchId, startDate, endDate);

            if (transactions.isEmpty()) {
                return MaterialCostMetricsResponse.builder()
                        .branchId(branchId)
                        .startDate(startDate)
                        .endDate(endDate)
                        .totalMaterialCost(BigDecimal.ZERO)
                        .totalTransactions(0)
                        .costByTransactionType(new HashMap<>())
                        .costByIngredient(new ArrayList<>())
                        .dailyCostBreakdown(new ArrayList<>())
                        .topCostIngredients(new ArrayList<>())
                        .build();
            }

            // Tính tổng chi phí
            BigDecimal totalMaterialCost = transactions.stream()
                    .map(InventoryTransaction::getLineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int totalTransactions = transactions.size();

            // Phân loại chi phí theo transaction type
            Map<String, BigDecimal> costByTransactionType = transactions.stream()
                    .collect(Collectors.groupingBy(
                            InventoryTransaction::getTxnType,
                            Collectors.mapping(
                                    InventoryTransaction::getLineTotal,
                                    Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                            )
                    ));

            // Tính chi phí theo từng nguyên liệu
            Map<Integer, IngredientCostStats> ingredientStatsMap = new HashMap<>();
            for (InventoryTransaction txn : transactions) {
                Integer ingredientId = txn.getIngredient().getIngredientId();
                IngredientCostStats stats = ingredientStatsMap.getOrDefault(ingredientId, new IngredientCostStats());
                
                stats.ingredientId = ingredientId;
                stats.ingredientName = txn.getIngredient().getName();
                stats.totalCost = stats.totalCost.add(txn.getLineTotal());
                
                if ("RECEIPT".equals(txn.getTxnType()) || "ADJUST_IN".equals(txn.getTxnType())) {
                    stats.quantityReceived = stats.quantityReceived.add(txn.getQtyIn());
                }
                if ("ISSUE".equals(txn.getTxnType()) || "ADJUST_OUT".equals(txn.getTxnType())) {
                    stats.quantityIssued = stats.quantityIssued.add(txn.getQtyOut());
                }
                
                if (stats.unitCode == null && txn.getUnit() != null) {
                    stats.unitCode = txn.getUnit().getCode();
                }
                
                ingredientStatsMap.put(ingredientId, stats);
            }

            List<MaterialCostMetricsResponse.CostByIngredient> costByIngredient = ingredientStatsMap.values().stream()
                    .map(stats -> {
                        BigDecimal avgUnitCost = stats.quantityReceived.compareTo(BigDecimal.ZERO) > 0
                                ? stats.totalCost.divide(stats.quantityReceived, 4, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                        
                        return MaterialCostMetricsResponse.CostByIngredient.builder()
                                .ingredientId(stats.ingredientId)
                                .ingredientName(stats.ingredientName)
                                .totalCost(stats.totalCost)
                                .quantityReceived(stats.quantityReceived)
                                .quantityIssued(stats.quantityIssued)
                                .unitCode(stats.unitCode)
                                .avgUnitCost(avgUnitCost)
                                .build();
                    })
                    .sorted((a, b) -> b.getTotalCost().compareTo(a.getTotalCost()))
                    .collect(Collectors.toList());

            // Phân tích chi phí theo ngày
            Map<LocalDate, DailyCostStats> dailyStatsMap = new HashMap<>();
            for (InventoryTransaction txn : transactions) {
                LocalDate txnDate = txn.getCreateAt().toLocalDate();
                DailyCostStats dailyStats = dailyStatsMap.getOrDefault(txnDate, new DailyCostStats());
                dailyStats.date = txnDate;
                dailyStats.totalCost = dailyStats.totalCost.add(txn.getLineTotal());
                
                if ("RECEIPT".equals(txn.getTxnType()) || "ADJUST_IN".equals(txn.getTxnType())) {
                    dailyStats.receiptCost = dailyStats.receiptCost.add(txn.getLineTotal());
                }
                if ("ISSUE".equals(txn.getTxnType()) || "ADJUST_OUT".equals(txn.getTxnType())) {
                    dailyStats.issueCost = dailyStats.issueCost.subtract(txn.getLineTotal());
                }
                
                dailyStatsMap.put(txnDate, dailyStats);
            }

            List<MaterialCostMetricsResponse.DailyCostBreakdown> dailyCostBreakdown = dailyStatsMap.values().stream()
                    .map(stats -> MaterialCostMetricsResponse.DailyCostBreakdown.builder()
                            .date(stats.date)
                            .totalCost(stats.totalCost)
                            .receiptCost(stats.receiptCost)
                            .issueCost(stats.issueCost)
                            .build())
                    .sorted(Comparator.comparing(MaterialCostMetricsResponse.DailyCostBreakdown::getDate))
                    .collect(Collectors.toList());

            // Top cost ingredients (top 10)
            List<MaterialCostMetricsResponse.TopCostIngredient> topCostIngredients = costByIngredient.stream()
                    .limit(10)
                    .map(item -> {
                        BigDecimal percentage = totalMaterialCost.compareTo(BigDecimal.ZERO) > 0
                                ? item.getTotalCost()
                                        .divide(totalMaterialCost, 4, RoundingMode.HALF_UP)
                                        .multiply(BigDecimal.valueOf(100))
                                : BigDecimal.ZERO;
                        
                        return MaterialCostMetricsResponse.TopCostIngredient.builder()
                                .ingredientId(item.getIngredientId())
                                .ingredientName(item.getIngredientName())
                                .totalCost(item.getTotalCost())
                                .percentage(percentage)
                                .build();
                    })
                    .collect(Collectors.toList());

            return MaterialCostMetricsResponse.builder()
                    .branchId(branchId)
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalMaterialCost(totalMaterialCost)
                    .totalTransactions(totalTransactions)
                    .costByTransactionType(costByTransactionType)
                    .costByIngredient(costByIngredient)
                    .dailyCostBreakdown(dailyCostBreakdown)
                    .topCostIngredients(topCostIngredients)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating material cost metrics for branch {} from {} to {}", 
                    branchId, startDate, endDate, e);
            return MaterialCostMetricsResponse.builder()
                    .branchId(branchId)
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalMaterialCost(BigDecimal.ZERO)
                    .totalTransactions(0)
                    .costByTransactionType(new HashMap<>())
                    .costByIngredient(new ArrayList<>())
                    .dailyCostBreakdown(new ArrayList<>())
                    .topCostIngredients(new ArrayList<>())
                    .build();
        }
    }

    /**
     * Helper method để lấy average cost từ InventoryCost
     */
    private BigDecimal getAverageCost(Stock stock) {
        try {
            InventoryCostId costId = new InventoryCostId();
            costId.setBranchId(stock.getBranchId());
            costId.setIngredientId(stock.getIngredient().getIngredientId());
            
            InventoryCost cost = inventoryCostRepository.findById(costId).orElse(null);
            return cost != null && cost.getAvgCost() != null 
                    ? cost.getAvgCost() 
                    : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("Could not fetch average cost for stock {}: {}", stock.getStockId(), e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    // Helper classes
    private static class IngredientCostStats {
        Integer ingredientId;
        String ingredientName;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal quantityReceived = BigDecimal.ZERO;
        BigDecimal quantityIssued = BigDecimal.ZERO;
        String unitCode;
    }

    private static class DailyCostStats {
        LocalDate date;
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal receiptCost = BigDecimal.ZERO;
        BigDecimal issueCost = BigDecimal.ZERO;
    }
}

