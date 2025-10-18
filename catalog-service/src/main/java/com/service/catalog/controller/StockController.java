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

import java.util.HashMap;

import com.service.catalog.dto.request.stock.CheckAndReserveRequest;
import com.service.catalog.dto.request.stock.CommitReservationRequest;
import com.service.catalog.dto.request.stock.ReleaseReservationRequest;
import com.service.catalog.dto.response.stock.CheckAndReserveResponse;
import com.service.catalog.exception.InsufficientStockException;
import com.service.catalog.service.StockReservationService;
import com.service.catalog.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import java.util.Map;
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

    private final StockReservationService stockReservationService;
    
    /**
     * POST /api/stocks/check-and-reserve
     * Kiểm tra và giữ chỗ tồn kho
     */
    @PostMapping("/check-and-reserve")
    public ResponseEntity<ApiResponse<CheckAndReserveResponse>> checkAndReserve(@Valid @RequestBody CheckAndReserveRequest request) {
        log.info("Received check and reserve request: {}", request);
        
        try {
            CheckAndReserveResponse response = stockReservationService.checkAndReserve(request);
            log.info("Successfully created reservation with hold ID: {}", response.getHoldId());
            return ResponseEntity.ok(ApiResponse.<CheckAndReserveResponse>builder()
                .code(200)
                .message("Stock check and reserve successful")
                .result(response)
                .build());
            
        } catch (InsufficientStockException e) {
            log.warn("Insufficient stock error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.<CheckAndReserveResponse>builder()
                    .code(409)
                    .message("Insufficient stock for some ingredients")
                    .build());
            
        } catch (Exception e) {
            log.error("Error during stock check and reserve: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<CheckAndReserveResponse>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }

    /**
     * POST /api/stocks/commit
     * Commit reservation (trừ kho thật)
     */
    @PostMapping("/commit")
    public ResponseEntity<ApiResponse<Map<String, Object>>> commitReservation(@Valid @RequestBody CommitReservationRequest request) {
        log.info("Received commit reservation request: {}", request);
        
        try {
            stockReservationService.commitReservation(request);
            log.info("Successfully committed reservation: {}", request.getHoldId());
            Map<String, Object> result = Map.of(
                "message", "Reservation committed successfully",
                "holdId", request.getHoldId(),
                "orderId", request.getOrderId()
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Reservation committed successfully")
                .result(result)
                .build());
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid reservation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(404)
                    .message("Reservation not found: " + e.getMessage())
                    .build());
            
        } catch (Exception e) {
            log.error("Error during reservation commit: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }
/**
     * POST /api/stocks/release
     * Release reservation (hoàn trả)
     */
    @PostMapping("/release")
    public ResponseEntity<ApiResponse<Map<String, Object>>> releaseReservation(@Valid @RequestBody ReleaseReservationRequest request) {
        log.info("Received release reservation request: {}", request);
        
        try {
            stockReservationService.releaseReservation(request);
            log.info("Successfully released reservation: {}", request.getHoldId());
            Map<String, Object> result = Map.of(
                "message", "Reservation released successfully",
                "holdId", request.getHoldId()
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Reservation released successfully")
                .result(result)
                .build());
            
        } catch (Exception e) {
            log.error("Error during reservation release: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }

    /**
     * GET /api/stocks/cleanup
     * Manual cleanup expired reservations (for admin/testing)
     */
    @PostMapping("/cleanup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> cleanupExpiredReservations() {
        log.info("Received manual cleanup request");
        try {
            int cleanedCount = stockReservationService.cleanupExpiredReservations();
            log.info("Cleaned up {} expired reservations", cleanedCount);
            Map<String, Object> result = Map.of(
                "message", "Cleanup completed successfully",
                "cleanedCount", cleanedCount
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Cleanup completed successfully")
                .result(result)
                .build());
            
        } catch (Exception e) {
            log.error("Error during cleanup: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * PUT /api/stocks/update-order-id
     * Cập nhật orderId cho reservations
     */
    @PutMapping("/update-order-id")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateReservationOrderId(@RequestBody Map<String, Object> request) {
        log.info("Updating order ID for reservations: {}", request);
        
        try {
            Integer orderId = (Integer) request.get("orderId");
        String holdId = (String) request.get("holdId");
        
        if (orderId == null || holdId == null) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("orderId and holdId are required")
                    .build());
        }
        
        stockReservationService.updateOrderIdForReservations(holdId, orderId);
        
        Map<String, Object> result = Map.of(
            "message", "Order ID updated successfully",
            "orderId", orderId,
            "holdId", holdId
        );
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
            .code(200)
            .message("Order ID updated successfully")
            .result(result)
            .build());
        
        } catch (Exception e) {
            log.error("Error updating order ID: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }

    /**
     * PUT /api/stocks/update-order-id-by-cart
     * Cập nhật orderId cho reservations theo cartId hoặc guestId
     */
    @PutMapping("/update-order-id-by-cart")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateReservationOrderIdByCart(@RequestBody Map<String, Object> request) {
        log.info("Updating order ID for reservations by cart: {}", request);
        
        try {
            Integer orderId = (Integer) request.get("orderId");
            Integer cartId = (Integer) request.get("cartId");
            String guestId = (String) request.get("guestId");
        
        if (orderId == null) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("orderId is required")
                    .build());
        }
        
        stockReservationService.updateOrderIdForReservationsByCartOrGuest(orderId, cartId, guestId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("message", "Order ID updated successfully");
        result.put("orderId", orderId);
        if (cartId != null) {
            result.put("cartId", cartId);
        }
        if (guestId != null) {
            result.put("guestId", guestId);
        }
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
            .code(200)
            .message("Order ID updated successfully")
            .result(result)
            .build());
        
        } catch (Exception e) {
            log.error("Error updating order ID: ", e);
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + errorMessage)
                    .build());
        }
    }

    /**
     * GET /api/stocks/hold-id/{orderId}
     * Lấy holdId từ orderId
     */
    @GetMapping("/hold-id/{orderId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHoldIdByOrderId(@PathVariable Integer orderId) {
        log.info("Getting hold ID for order: {}", orderId);
        
        try {
            String holdId = stockReservationService.getHoldIdByOrderId(orderId);
            if (holdId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Map<String, Object>>builder()
                        .code(404)
                        .message("No active reservation found for order: " + orderId)
                        .build());
            }
            
            Map<String, Object> result = Map.of(
                "orderId", orderId,
                "holdId", holdId
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Hold ID retrieved successfully")
                .result(result)
                .build());
            
        } catch (Exception e) {
            log.error("Error getting hold ID for order {}: ", orderId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }

    /**
     * GET /api/stocks/health
     * Health check endpoint
     */
    /**
     * DELETE /api/stocks/clear-reservations
     * Xóa tất cả reservations của user/guest
     */
    @DeleteMapping("/clear-reservations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearAllReservations(@RequestBody Map<String, Object> request) {
        log.info("Clearing all reservations: {}", request);
        
        try {
            Integer cartId = (Integer) request.get("cartId");
            String guestId = (String) request.get("guestId");
            
            // Xóa reservations theo cartId hoặc guestId
            int deletedCount = stockReservationService.clearReservationsByCartOrGuest(cartId, guestId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("message", "Reservations cleared successfully");
            result.put("deletedCount", deletedCount);
            if (cartId != null) {
                result.put("cartId", cartId);
            }
            if (guestId != null) {
                result.put("guestId", guestId);
            }
            
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Reservations cleared successfully")
                .result(result)
                .build());
                
        } catch (Exception e) {
            log.error("Error clearing reservations:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(500)
                    .message("Internal server error: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> result = Map.of(
            "status", "UP",
            "service", "Stock Reservation Service",
            "timestamp", System.currentTimeMillis()
        );
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
            .code(200)
            .message("Service is healthy")
            .result(result)
            .build());
    }
}
