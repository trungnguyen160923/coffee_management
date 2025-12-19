package com.service.catalog.controller;

import com.service.catalog.dto.request.stock.StockSearchRequest;
import com.service.catalog.dto.response.StockPageResponse;
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
import com.service.catalog.dto.request.stock.CommitPosStockRequest;
import com.service.catalog.dto.request.stock.CommitReservationRequest;
import com.service.catalog.dto.request.stock.DailyStockReconciliationRequest;
import com.service.catalog.dto.request.stock.ManagerStockAdjustmentRequest;
import com.service.catalog.dto.request.stock.UpdateStockAdjustmentRequest;
import com.service.catalog.dto.request.stock.UpdateStockAdjustmentEntryRequest;
import com.service.catalog.dto.request.stock.ReleaseReservationRequest;
import com.service.catalog.dto.response.stock.CheckAndReserveResponse;
import com.service.catalog.dto.response.stock.DailyStockReconciliationResponse;
import com.service.catalog.dto.response.stock.StockAdjustmentResponse;
import com.service.catalog.dto.response.stock.StockAdjustmentEntryResponse;
import com.service.catalog.entity.StockAdjustment;
import com.service.catalog.exception.InsufficientStockException;
import com.service.catalog.service.StockReservationService;
import com.service.catalog.service.StockAdjustmentService;
import com.service.catalog.dto.ApiResponse;
import com.service.catalog.repository.http_client.ProfileClient;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.Map;
import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/stocks")
@RequiredArgsConstructor
@Slf4j
public class StockController {

    private final StockService stockService;
    private final StockAdjustmentService stockAdjustmentService;
    private final org.springframework.context.ApplicationContext applicationContext;
    private final ProfileClient profileClient;

    @GetMapping("/search")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<StockPageResponse> searchStocks(
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

        StockPageResponse result = stockService.searchStocks(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<List<StockResponse>> getLowStockItems(
            @RequestParam Integer branchId) {
        List<StockResponse> result = stockService.getLowStockItems(branchId);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/stocks/low-or-out-of-stock?branchId={branchId}
     * Lấy danh sách nguyên liệu tồn kho thấp hoặc hết hàng của chi nhánh
     */
    @GetMapping("/low-or-out-of-stock")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<List<StockResponse>> getLowOrOutOfStockItems(
            @RequestParam Integer branchId) {
        List<StockResponse> result = stockService.getLowOrOutOfStockItems(branchId);
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
    public ResponseEntity<StockPageResponse> getStocksByBranch(
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

        StockPageResponse result = stockService.searchStocks(request);
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

    @PostMapping("/daily-reconciliation")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DailyStockReconciliationResponse>> reconcileDailyUsage(
            @Valid @RequestBody DailyStockReconciliationRequest request,
            org.springframework.security.core.Authentication authentication) {
        boolean isStaff = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("STAFF"));

        // Validate: Staff chỉ được ghi ngày hiện tại, Manager/Admin có thể ghi ngày đã qua
        if (isStaff) {
            LocalDate today = LocalDate.now();
            if (!request.getAdjustmentDate().equals(today)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<DailyStockReconciliationResponse>builder()
                                .code(403)
                                .message("Staff chỉ được ghi nhận nguyên liệu cho ngày hôm nay")
                                .build());
            }

            // Additional validation: staff must be checked in to an active shift today
            try {
                ApiResponse<ProfileClient.ShiftAssignmentResponse> activeShift = profileClient.getMyActiveShift();
                if (activeShift == null || activeShift.getResult() == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.<DailyStockReconciliationResponse>builder()
                                    .code(403)
                                    .message("Staff must be checked in to an active shift to record daily stock usage")
                                    .build());
                }
            } catch (Exception e) {
                log.error("Failed to verify active shift for daily stock usage", e);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<DailyStockReconciliationResponse>builder()
                                .code(403)
                                .message("Cannot verify active shift. Please check in to a shift before recording stock usage")
                                .build());
            }
        }
        
        DailyStockReconciliationResponse response = stockAdjustmentService.reconcile(request);
        return ResponseEntity.ok(ApiResponse.<DailyStockReconciliationResponse>builder()
                .code(200)
                .message(request.isCommitImmediately() ? "Adjustments committed successfully" : "Adjustments saved in pending status")
                .result(response)
                .build());
    }

    @PostMapping("/adjustments/{adjustmentId}/commit")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> commitAdjustment(@PathVariable Long adjustmentId) {
        stockAdjustmentService.manualCommit(adjustmentId);
        Map<String, Object> result = Map.of(
                "adjustmentId", adjustmentId,
                "status", "COMMITTED");
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Adjustment committed successfully")
                .result(result)
                .build());
    }

    @GetMapping("/adjustments")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<StockAdjustmentResponse>>> getAdjustments(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate adjustmentDate,
            @RequestParam(required = false) StockAdjustment.AdjustmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<StockAdjustmentResponse> response = stockAdjustmentService.searchAdjustments(
                branchId,
                adjustmentDate,
                status,
                page,
                size);

        return ResponseEntity.ok(ApiResponse.<Page<StockAdjustmentResponse>>builder()
                .code(200)
                .message("Adjustments fetched successfully")
                .result(response)
                .build());
    }

    /**
     * GET /api/stocks/adjustments/{adjustmentId}/entries
     * Lấy danh sách các lần ghi nhận (entries) cho một adjustment
     */
    @GetMapping("/adjustments/{adjustmentId}/entries")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<StockAdjustmentEntryResponse>>> getAdjustmentEntries(
            @PathVariable Long adjustmentId) {

        List<StockAdjustmentEntryResponse> entries = stockAdjustmentService.getAdjustmentEntries(adjustmentId);
        return ResponseEntity.ok(ApiResponse.<List<StockAdjustmentEntryResponse>>builder()
                .code(200)
                .message("Adjustment entries fetched successfully")
                .result(entries)
                .build());
    }

    /**
     * DELETE /api/stocks/entries/{entryId}
     * Xóa một entry của adjustment (chỉ khi adjustment còn PENDING)
     */
    @DeleteMapping("/entries/{entryId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAdjustmentEntry(
            @PathVariable Long entryId,
            org.springframework.security.core.Authentication authentication) {
        boolean isStaff = isCurrentUserStaff();
        Integer currentUserId = extractUserId(authentication);

        stockAdjustmentService.deleteEntry(entryId, currentUserId, isStaff);

        Map<String, Object> result = Map.of(
                "entryId", entryId,
                "message", "Adjustment entry deleted successfully");

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Adjustment entry deleted successfully")
                .result(result)
                .build());
    }

    /**
     * PUT /api/stocks/entries/{entryId}
     * Cập nhật một entry (qty + notes) - chỉ khi adjustment PENDING và đúng owner (đối với STAFF)
     */
    @PutMapping("/entries/{entryId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAdjustmentEntry(
            @PathVariable Long entryId,
            @Valid @RequestBody UpdateStockAdjustmentEntryRequest request,
            org.springframework.security.core.Authentication authentication) {
        boolean isStaff = isCurrentUserStaff();
        Integer currentUserId = extractUserId(authentication);

        stockAdjustmentService.updateEntry(entryId, request, currentUserId, isStaff);

        Map<String, Object> result = Map.of(
                "entryId", entryId,
                "message", "Adjustment entry updated successfully");

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Adjustment entry updated successfully")
                .result(result)
                .build());
    }

    /**
     * GET /api/stocks/daily-usage-summary
     * Lấy danh sách nguyên liệu đã được dùng trong ngày (từ orders) với system quantity
     */
    @GetMapping("/daily-usage-summary")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<com.service.catalog.dto.response.stock.DailyUsageSummaryResponse>> getDailyUsageSummary(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        com.service.catalog.dto.response.stock.DailyUsageSummaryResponse response = 
                stockAdjustmentService.getDailyUsageSummary(branchId, date);
        
        return ResponseEntity.ok(ApiResponse.<com.service.catalog.dto.response.stock.DailyUsageSummaryResponse>builder()
                .code(200)
                .message("Daily usage summary retrieved successfully")
                .result(response)
                .build());
    }

    /**
     * PUT /api/stocks/adjustments/{adjustmentId}
     * Cập nhật adjustment (chỉ cho PENDING)
     */
    @PutMapping("/adjustments/{adjustmentId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> updateAdjustment(
            @PathVariable Long adjustmentId,
            @Valid @RequestBody UpdateStockAdjustmentRequest request,
            org.springframework.security.core.Authentication authentication) {
        // Nếu là STAFF thì phải đang ở trong ca active và là người duy nhất tạo entries mới được chỉnh sửa
        boolean isStaff = isCurrentUserStaff();
        Integer currentUserId = extractUserId(authentication);

        if (isStaff) {
            try {
                ApiResponse<ProfileClient.ShiftAssignmentResponse> activeShift = profileClient.getMyActiveShift();
                if (activeShift == null || activeShift.getResult() == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.<StockAdjustmentResponse>builder()
                                    .code(403)
                                    .message("Staff must be checked in to an active shift to modify daily stock usage")
                                    .build());
                }
            } catch (Exception e) {
                log.error("Failed to verify active shift for updating daily stock usage", e);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<StockAdjustmentResponse>builder()
                                .code(403)
                                .message("Cannot verify active shift. Please check in to a shift before modifying stock usage")
                                .build());
            }

            // Kiểm tra quyền sửa: staff chỉ được sửa nếu tất cả entries thuộc về chính họ
            List<StockAdjustmentEntryResponse> entries = stockAdjustmentService.getAdjustmentEntries(adjustmentId);
            boolean hasEntries = entries != null && !entries.isEmpty();
            boolean allOwnedByUser = hasEntries && entries.stream()
                    .allMatch(e -> e.getUserId() != null && e.getUserId().equals(currentUserId));

            if (hasEntries && !allOwnedByUser) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<StockAdjustmentResponse>builder()
                                .code(403)
                                .message("You can only modify adjustments that were created entirely by you")
                                .build());
            }
        }

        StockAdjustmentResponse response = stockAdjustmentService.updateAdjustment(adjustmentId, request);
        
        return ResponseEntity.ok(ApiResponse.<StockAdjustmentResponse>builder()
                .code(200)
                .message("Adjustment updated successfully")
                .result(response)
                .build());
    }

    /**
     * DELETE /api/stocks/adjustments/{adjustmentId}
     * Xóa adjustment (chỉ cho PENDING hoặc CANCELLED)
     */
    @DeleteMapping("/adjustments/{adjustmentId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAdjustment(
            @PathVariable Long adjustmentId,
            org.springframework.security.core.Authentication authentication) {
        // Nếu là STAFF thì phải đang ở trong ca active và là người duy nhất tạo entries mới được xóa
        boolean isStaff = isCurrentUserStaff();
        Integer currentUserId = extractUserId(authentication);

        if (isStaff) {
            try {
                ApiResponse<ProfileClient.ShiftAssignmentResponse> activeShift = profileClient.getMyActiveShift();
                if (activeShift == null || activeShift.getResult() == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(ApiResponse.<Map<String, Object>>builder()
                                    .code(403)
                                    .message("Staff must be checked in to an active shift to delete daily stock usage")
                                    .build());
                }
            } catch (Exception e) {
                log.error("Failed to verify active shift for deleting daily stock usage", e);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .code(403)
                                .message("Cannot verify active shift. Please check in to a shift before deleting stock usage")
                                .build());
            }

            List<StockAdjustmentEntryResponse> entries = stockAdjustmentService.getAdjustmentEntries(adjustmentId);
            boolean hasEntries = entries != null && !entries.isEmpty();
            boolean allOwnedByUser = hasEntries && entries.stream()
                    .allMatch(e -> e.getUserId() != null && e.getUserId().equals(currentUserId));

            if (hasEntries && !allOwnedByUser) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .code(403)
                                .message("You can only delete adjustments that were created entirely by you")
                                .build());
            }
        }

        stockAdjustmentService.deleteAdjustment(adjustmentId);
        
        Map<String, Object> result = Map.of(
                "adjustmentId", adjustmentId,
                "message", "Adjustment deleted successfully");
        
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Adjustment deleted successfully")
                .result(result)
                .build());
    }
    
    @PostMapping("/manager-adjustment")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StockAdjustmentResponse>> recordManagerAdjustment(
            @Valid @RequestBody ManagerStockAdjustmentRequest request) {
        StockAdjustmentResponse response = stockAdjustmentService.recordManagerAdjustment(request);
        return ResponseEntity.ok(ApiResponse.<StockAdjustmentResponse>builder()
                .code(200)
                .message("Stock adjusted successfully")
                .result(response)
                .build());
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
     * POST /api/stocks/commit-pos
     * Trừ kho trực tiếp cho POS order (không qua reservation)
     */
    @PostMapping("/commit-pos")
    public ResponseEntity<ApiResponse<Map<String, Object>>> commitPos(@Valid @RequestBody CommitPosStockRequest request) {
        log.info("Received commit POS stock request: {}", request);

        try {
            stockReservationService.commitPosOrder(request);
            Map<String, Object> result = Map.of(
                "message", "POS stock committed successfully",
                "orderId", request.getOrderId(),
                "branchId", request.getBranchId()
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("POS stock committed successfully")
                .result(result)
                .build());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid POS commit request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("Invalid request: " + e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("Error during POS stock commit: ", e);
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

    private boolean isCurrentUserStaff() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "STAFF".equals(a.getAuthority()));
    }

    private Integer extractUserId(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return null;
        }
        String userIdStr = jwt.getClaimAsString("user_id");
        if (userIdStr == null) {
            return null;
        }
        try {
            return Integer.parseInt(userIdStr);
        } catch (NumberFormatException e) {
            return null;
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

    /**
     * GET /api/stocks/scheduler/status
     * Kiểm tra trạng thái của Stock Adjustment Scheduler
     */
    @GetMapping("/scheduler/status")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSchedulerStatus() {
        try {
            com.service.catalog.service.StockAdjustmentScheduler scheduler = 
                applicationContext.getBean(com.service.catalog.service.StockAdjustmentScheduler.class);
            
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("enabled", true);
            result.put("isRunning", scheduler.isRunning());
            result.put("lastRunTime", scheduler.getLastRunTime() != null 
                ? scheduler.getLastRunTime().toString() 
                : "Never");
            result.put("lastCommittedCount", scheduler.getLastCommittedCount());
            result.put("currentTime", java.time.LocalDateTime.now().toString());
            
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Scheduler status retrieved successfully")
                .result(result)
                .build());
        } catch (Exception ex) {
            // Scheduler might not be enabled or not found
            Map<String, Object> result = Map.of(
                "enabled", false,
                "message", "Scheduler is not enabled or not found"
            );
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Scheduler is not active")
                .result(result)
                .build());
        }
    }
}
