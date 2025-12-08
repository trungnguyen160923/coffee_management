package com.service.catalog.service;

import com.service.catalog.dto.request.stock.StockSearchRequest;
import com.service.catalog.dto.response.StockPageResponse;
import com.service.catalog.dto.response.StockResponse;
import com.service.catalog.entity.InventoryCost;
import com.service.catalog.entity.InventoryCostId;
import com.service.catalog.entity.Stock;
import com.service.catalog.repository.InventoryCostRepository;
import com.service.catalog.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockRepository stockRepository;
    private final InventoryCostRepository inventoryCostRepository;

    public StockPageResponse searchStocks(StockSearchRequest request) {
        // Tạo Pageable object
        Sort sort = createSort(request.getSortBy(), request.getSortDirection());
        Pageable pageable = PageRequest.of(
                request.getPage() != null ? request.getPage() : 0,
                request.getSize() != null ? request.getSize() : 10,
                sort
        );

        // Gọi repository method để lấy paginated results
        Page<Stock> stockPage = stockRepository.findStocksWithFilters(
                request.getSearch(),
                request.getBranchId(),
                request.getIngredientId(),
                request.getUnitCode(),
                request.getLowStock(),
                pageable
        );

        // Convert paginated results to response
        Page<StockResponse> responsePage = stockPage.map(this::convertToResponse);

        // Calculate total stock value for ALL matching stocks (not just current page)
        BigDecimal totalStockValue = calculateTotalStockValue(
                request.getSearch(),
                request.getBranchId(),
                request.getIngredientId(),
                request.getUnitCode(),
                request.getLowStock()
        );

        // Build custom response with totalStockValue
        return StockPageResponse.builder()
                .content(responsePage.getContent())
                .totalElements(responsePage.getTotalElements())
                .totalPages(responsePage.getTotalPages())
                .size(responsePage.getSize())
                .number(responsePage.getNumber())
                .first(responsePage.isFirst())
                .last(responsePage.isLast())
                .numberOfElements(responsePage.getNumberOfElements())
                .empty(responsePage.isEmpty())
                .totalStockValue(totalStockValue)
                .build();
    }

    /**
     * Calculate total stock value for all stocks matching the filters
     * @param search Search keyword
     * @param branchId Branch ID filter
     * @param ingredientId Ingredient ID filter
     * @param unitCode Unit code filter
     * @param lowStock Low stock filter
     * @return Total stock value (quantity * avgCost) for all matching stocks
     */
    private BigDecimal calculateTotalStockValue(String search, Integer branchId, 
            Integer ingredientId, String unitCode, Boolean lowStock) {
        // Get all matching stocks (without pagination)
        List<Stock> allStocks = stockRepository.findAllStocksWithFilters(
                search, branchId, ingredientId, unitCode, lowStock);

        BigDecimal totalValue = BigDecimal.ZERO;
        for (Stock stock : allStocks) {
            // Get average cost
            BigDecimal avgCost = BigDecimal.ZERO;
            try {
                InventoryCostId costId = new InventoryCostId();
                costId.setBranchId(stock.getBranchId());
                costId.setIngredientId(stock.getIngredient().getIngredientId());
                
                InventoryCost cost = inventoryCostRepository.findById(costId).orElse(null);
                if (cost != null) {
                    avgCost = cost.getAvgCost();
                }
            } catch (Exception e) {
                log.warn("Could not fetch average cost for stock {}: {}", stock.getStockId(), e.getMessage());
            }

            // Calculate stock value: quantity * avgCost
            BigDecimal stockValue = stock.getQuantity().multiply(avgCost);
            totalValue = totalValue.add(stockValue);
        }

        return totalValue;
    }

    public List<StockResponse> getLowStockItems(Integer branchId) {
        List<Stock> stocks = stockRepository.findLowStockItems(branchId);
        return stocks.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách nguyên liệu tồn kho thấp hoặc hết hàng của chi nhánh
     * Bao gồm cả low stock (available <= threshold) và out of stock (available <= 0)
     */
    public List<StockResponse> getLowOrOutOfStockItems(Integer branchId) {
        List<Stock> stocks = stockRepository.findLowOrOutOfStockItems(branchId);
        return stocks.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public StockResponse getStockById(Integer stockId) {
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock not found"));
        return convertToResponse(stock);
    }

    private StockResponse convertToResponse(Stock stock) {
        // Lấy average cost từ InventoryCost
        BigDecimal avgCost = BigDecimal.ZERO;
        try {
            InventoryCostId costId = new InventoryCostId();
            costId.setBranchId(stock.getBranchId());
            costId.setIngredientId(stock.getIngredient().getIngredientId());
            
            InventoryCost cost = inventoryCostRepository.findById(costId).orElse(null);
            if (cost != null) {
                avgCost = cost.getAvgCost();
            }
        } catch (Exception e) {
            log.warn("Could not fetch average cost for stock {}: {}", stock.getStockId(), e.getMessage());
        }

        BigDecimal availableQuantity = stock.getAvailableQuantity();
        boolean isLowStock = availableQuantity.compareTo(stock.getThreshold()) <= 0;
        boolean isOutOfStock = availableQuantity.compareTo(BigDecimal.ZERO) <= 0;

        return StockResponse.builder()
                .stockId(stock.getStockId())
                .ingredientId(stock.getIngredient().getIngredientId())
                .ingredientName(stock.getIngredient().getName())
                .ingredientSku(null) // Ingredient entity không có SKU field
                .branchId(stock.getBranchId())
                .quantity(stock.getQuantity())
                .reservedQuantity(stock.getReservedQuantity())
                .availableQuantity(availableQuantity)
                .unitCode(stock.getUnit() != null ? stock.getUnit().getCode() : null)
                .unitName(stock.getUnit() != null ? stock.getUnit().getName() : null)
                .threshold(stock.getThreshold())
                .lastUpdated(stock.getLastUpdated())
                .isLowStock(isLowStock)
                .isOutOfStock(isOutOfStock)
                .avgCost(avgCost)
                .build();
    }

    private Sort createSort(String sortBy, String sortDirection) {
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "lastUpdated";
        }
        
        Sort.Direction direction = Sort.Direction.DESC;
        if (sortDirection != null && sortDirection.equalsIgnoreCase("asc")) {
            direction = Sort.Direction.ASC;
        }

        return Sort.by(direction, sortBy);
    }

}
