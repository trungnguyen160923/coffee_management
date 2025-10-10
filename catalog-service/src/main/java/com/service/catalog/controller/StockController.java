package com.service.catalog.controller;

import com.service.catalog.dto.request.stock.StockSearchRequest;
import com.service.catalog.dto.response.StockResponse;
import com.service.catalog.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stocks")
@RequiredArgsConstructor
@Slf4j
public class StockController {

    private final StockService stockService;

    @GetMapping("/search")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<Page<StockResponse>> searchStocks(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) Integer ingredientId,
            @RequestParam(required = false) String unitCode,
            @RequestParam(required = false) Boolean lowStock,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "lastUpdated") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        StockSearchRequest request = StockSearchRequest.builder()
                .search(search)
                .branchId(branchId)
                .ingredientId(ingredientId)
                .unitCode(unitCode)
                .lowStock(lowStock)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        Page<StockResponse> result = stockService.searchStocks(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<List<StockResponse>> getLowStockItems(
            @RequestParam Integer branchId) {
        List<StockResponse> result = stockService.getLowStockItems(branchId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{stockId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<StockResponse> getStockById(@PathVariable Integer stockId) {
        StockResponse result = stockService.getStockById(stockId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<Page<StockResponse>> getStocksByBranch(
            @PathVariable Integer branchId,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String search) {
        
        StockSearchRequest request = StockSearchRequest.builder()
                .branchId(branchId)
                .search(search)
                .page(page)
                .size(size)
                .build();

        Page<StockResponse> result = stockService.searchStocks(request);
        return ResponseEntity.ok(result);
    }
}
