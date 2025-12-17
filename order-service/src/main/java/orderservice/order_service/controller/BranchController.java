package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.request.AssignManagerRequest;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateBranchRequest;
import orderservice.order_service.dto.request.FindBranchesWithDistanceRequest;
import orderservice.order_service.dto.response.*;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.service.AnalyticsService;
import orderservice.order_service.service.BranchService;
import orderservice.order_service.service.BranchSelectionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import orderservice.order_service.dto.response.PagedResponse;

@RestController
@RequestMapping("/api/branches")
@Slf4j
public class BranchController {

    private final BranchService branchService;
    private final BranchSelectionService branchSelectionService;
    private final AnalyticsService analyticsService;

    @Autowired
    public BranchController(BranchService branchService, BranchSelectionService branchSelectionService, AnalyticsService analyticsService) {
        this.branchService = branchService;
        this.branchSelectionService = branchSelectionService;
        this.analyticsService = analyticsService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> createBranch(@Valid @RequestBody CreateBranchRequest request) {
        try {
            Branch branch = branchService.createBranch(request);
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Branch created successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to create branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Branch>>> getAllBranches() {
        try {
            List<Branch> branches = branchService.getAllBranches();
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to retrieve branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/paged")
    public ResponseEntity<ApiResponse<PagedResponse<Branch>>> getBranchesPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            var branchPage = branchService.getBranchesPaged(page, size);
            var payload = PagedResponse.<Branch>builder()
                    .data(branchPage.getContent())
                    .total(branchPage.getTotalElements())
                    .page(branchPage.getNumber())
                    .size(branchPage.getSize())
                    .totalPages(branchPage.getTotalPages())
                    .build();
            var response = ApiResponse.<PagedResponse<Branch>>builder()
                    .result(payload)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            var response = ApiResponse.<PagedResponse<Branch>>builder()
                    .code(500)
                    .message("Failed to retrieve branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{branchId}")
    public ResponseEntity<ApiResponse<Branch>> getBranchById(@PathVariable Integer branchId) {
        try {
            Optional<Branch> branch = branchService.getBranchById(branchId);
            if (branch.isPresent()) {
                ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                        .code(200)
                        .message("Branch retrieved successfully")
                        .result(branch.get())
                        .build();
                return ResponseEntity.ok(response);
            } else {
                ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                        .code(404)
                        .message("Branch not found")
                        .result(null)
                        .build();
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to retrieve branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<Branch>>> searchBranchesByName(@RequestParam String name) {
        try {
            List<Branch> branches = branchService.searchBranchesByName(name);
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(200)
                    .message("Branches found successfully")
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to search branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/manager/{managerUserId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<Branch>>> getBranchesByManager(@PathVariable Integer managerUserId) {
        try {
            List<Branch> branches = branchService.getBranchesByManager(managerUserId);
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to retrieve branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Internal endpoint for inter-service background processing (no authentication
    // required)
    @GetMapping("/internal/manager/{managerUserId}")
    public ResponseEntity<ApiResponse<List<Branch>>> getBranchesByManagerInternal(@PathVariable Integer managerUserId) {
        try {
            List<Branch> branches = branchService.getBranchesByManager(managerUserId);
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to retrieve branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{branchId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> updateBranch(@PathVariable Integer branchId,
            @Valid @RequestBody CreateBranchRequest request) {
        try {
            Branch branch = branchService.updateBranch(branchId, request);
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Branch updated successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to update branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{branchId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteBranch(@PathVariable Integer branchId) {
        try {
            branchService.deleteBranch(branchId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Branch deleted successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{branchId}/assign-manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> assignManager(@PathVariable Integer branchId,
            @Valid @RequestBody AssignManagerRequest request) {
        try {
            Branch branch = branchService.assignManager(branchId, request.getManagerUserId());
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Manager assigned successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (orderservice.order_service.exception.AppException e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(e.getErrorCode().getCode())
                    .message(e.getErrorCode().getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(e.getErrorCode().getHttpStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to assign manager: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Internal endpoint for Kafka listeners (no authentication required)
    @PutMapping("/internal/{branchId}/assign-manager")
    public ResponseEntity<ApiResponse<Branch>> assignManagerInternal(@PathVariable Integer branchId,
            @Valid @RequestBody AssignManagerRequest request) {
        try {
            Branch branch = branchService.assignManager(branchId, request.getManagerUserId());
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Manager assigned successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to assign manager: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Internal compensation endpoint to unassign manager (no authentication
    // required)
    @PutMapping("/internal/{branchId}/unassign-manager")
    public ResponseEntity<ApiResponse<Branch>> unassignManagerInternal(@PathVariable Integer branchId,
            @Valid @RequestBody AssignManagerRequest request) {
        try {
            Branch branch = branchService.unassignManager(branchId, request.getManagerUserId());
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Manager unassigned successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (orderservice.order_service.exception.AppException e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(e.getErrorCode().getCode())
                    .message(e.getErrorCode().getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(e.getErrorCode().getHttpStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to unassign manager: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/unassigned")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Branch>>> getBranchesUnassigned() {
        List<Branch> branches = branchService.getBranchesUnassigned();
        ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                .code(200)
                .message("Branches retrieved successfully")
                .result(branches)
                .build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{branchId}/staff")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBranchStaff(@PathVariable Integer branchId) {
        try {
            // For now, return a mock response since we don't have a real staff service
            // In a real implementation, this would call an auth service or user service
            List<Map<String, Object>> staff = new ArrayList<>();

            // Add current user as staff if they belong to this branch
            // This is a simplified implementation
            Map<String, Object> currentUser = new HashMap<>();
            currentUser.put("user_id", 1); // This should come from JWT token
            currentUser.put("fullname", "Current Staff Member");
            currentUser.put("email", "staff@example.com");
            currentUser.put("role", "STAFF");
            staff.add(currentUser);

            ApiResponse<List<Map<String, Object>>> response = ApiResponse.<List<Map<String, Object>>>builder()
                    .code(200)
                    .message("Branch staff retrieved successfully")
                    .result(staff)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Map<String, Object>>> response = ApiResponse.<List<Map<String, Object>>>builder()
                    .code(500)
                    .message("Failed to retrieve branch staff: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{branchId}/geocode")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Branch>> geocodeBranch(@PathVariable Integer branchId) {
        try {
            Branch branch = branchService.geocodeBranch(branchId);
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Branch geocoded successfully")
                    .result(branch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to geocode branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/geocode-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Branch>>> geocodeAllBranchesWithoutCoordinates() {
        try {
            List<Branch> branches = branchService.geocodeAllBranchesWithoutCoordinates();
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(200)
                    .message("All branches geocoded successfully")
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to geocode branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/nearest")
    public ResponseEntity<ApiResponse<Branch>> findNearestBranch(@RequestParam String address) {
        try {
            Branch nearestBranch = branchSelectionService.findNearestBranch(address);
            if (nearestBranch == null) {
                String errorMessage = String.format("Không tìm thấy chi nhánh nào phù hợp cho địa chỉ '%s'. Có thể do: (1) Tất cả chi nhánh đang nghỉ, (2) Không có chi nhánh hoạt động vào ngày hôm nay, (3) Tất cả chi nhánh đang ngoài giờ làm việc, hoặc (4) Địa chỉ không hợp lệ. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", 
                        address);
                ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                        .code(404)
                        .message(errorMessage)
                        .result(null)
                        .build();
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(200)
                    .message("Nearest branch found successfully")
                    .result(nearestBranch)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                    .code(500)
                    .message("Failed to find nearest branch: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Lấy n chi nhánh gần nhất dựa trên địa chỉ
     * @param address - Địa chỉ để tìm chi nhánh gần nhất
     * @param limit - Số lượng chi nhánh cần lấy (mặc định 5, tối đa 20)
     * @return Danh sách n chi nhánh gần nhất
     */
    @GetMapping("/nearest/top")
    public ResponseEntity<ApiResponse<List<Branch>>> findTopNearestBranches(
            @RequestParam String address,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            // Giới hạn số lượng để tránh performance issues
            int maxLimit = Math.min(limit, 20);
            int minLimit = Math.max(maxLimit, 1);
            
            List<Branch> nearestBranches = branchSelectionService.findTopNearestBranches(address, minLimit);
            
            if (nearestBranches == null || nearestBranches.isEmpty()) {
                ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                        .code(404)
                        .message("No branches found for the given address")
                        .result(null)
                        .build();
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(200)
                    .message("Top " + nearestBranches.size() + " nearest branches found successfully")
                    .result(nearestBranches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<Branch>> response = ApiResponse.<List<Branch>>builder()
                    .code(500)
                    .message("Failed to find nearest branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Lấy n chi nhánh gần nhất với khoảng cách và thời gian giao hàng
     * Sử dụng POST với JSON body để tránh lỗi encode địa chỉ tiếng Việt trong URL
     * @param request - Request chứa address và limit
     * @return Danh sách chi nhánh với khoảng cách
     */
    @PostMapping("/nearest/with-distance")
    public ResponseEntity<ApiResponse<List<BranchWithDistanceResponse>>> findTopNearestBranchesWithDistance(
            @Valid @RequestBody FindBranchesWithDistanceRequest request) {
        try {
            String address = request.getAddress();
            int limit = request.getLimit() != null ? request.getLimit() : 10;
            
            int maxLimit = Math.min(limit, 20);
            int minLimit = Math.max(maxLimit, 1);
            
            List<BranchWithDistanceResponse> branches = 
                branchSelectionService.findTopNearestBranchesWithDistance(address, minLimit);
            
            if (branches == null || branches.isEmpty()) {
                String errorMessage = String.format("Không tìm thấy chi nhánh nào phù hợp cho địa chỉ '%s'. Có thể do: (1) Tất cả chi nhánh đang nghỉ, (2) Không có chi nhánh hoạt động vào ngày hôm nay, (3) Tất cả chi nhánh đang ngoài giờ làm việc, hoặc (4) Địa chỉ không hợp lệ. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.", 
                        address);
                ApiResponse<List<BranchWithDistanceResponse>> response = 
                    ApiResponse.<List<BranchWithDistanceResponse>>builder()
                        .code(404)
                        .message(errorMessage)
                        .result(null)
                        .build();
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            ApiResponse<List<BranchWithDistanceResponse>> response = 
                ApiResponse.<List<BranchWithDistanceResponse>>builder()
                    .code(200)
                    .message("Top " + branches.size() + " nearest branches found successfully")
                    .result(branches)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error finding top nearest branches with distance: {}", e.getMessage(), e);
            ApiResponse<List<BranchWithDistanceResponse>> response = 
                ApiResponse.<List<BranchWithDistanceResponse>>builder()
                    .code(500)
                    .message("Failed to find nearest branches: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ========== Branch Statistics Endpoints ==========

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<BranchStatsResponse>> getBranchStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        try {
            // Default to last 30 days if not provided
            if (dateFrom == null) {
                dateFrom = LocalDate.now().minusDays(30);
            }
            if (dateTo == null) {
                dateTo = LocalDate.now();
            }

            BranchStatsResponse stats = analyticsService.getBranchStats(dateFrom, dateTo);
            ApiResponse<BranchStatsResponse> response = ApiResponse.<BranchStatsResponse>builder()
                    .code(200)
                    .message("Branch stats retrieved successfully")
                    .result(stats)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<BranchStatsResponse> response = ApiResponse.<BranchStatsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve branch stats: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/stats/all")
    public ResponseEntity<ApiResponse<AllBranchesStatsResponse>> getAllBranchesStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        try {
            // Default to last 30 days if not provided
            if (dateFrom == null) {
                dateFrom = LocalDate.now().minusDays(30);
            }
            if (dateTo == null) {
                dateTo = LocalDate.now();
            }

            AllBranchesStatsResponse stats = analyticsService.getAllBranchesStats(dateFrom, dateTo);
            ApiResponse<AllBranchesStatsResponse> response = ApiResponse.<AllBranchesStatsResponse>builder()
                    .code(200)
                    .message("All branches stats retrieved successfully")
                    .result(stats)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<AllBranchesStatsResponse> response = ApiResponse.<AllBranchesStatsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve all branches stats: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{branchId}/revenue")
    public ResponseEntity<ApiResponse<BranchRevenueResponse>> getBranchRevenue(
            @PathVariable Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        try {
            // Default to last 30 days if not provided
            if (dateFrom == null) {
                dateFrom = LocalDate.now().minusDays(30);
            }
            if (dateTo == null) {
                dateTo = LocalDate.now();
            }

            BranchRevenueResponse revenue = analyticsService.getBranchRevenue(branchId, dateFrom, dateTo);
            ApiResponse<BranchRevenueResponse> response = ApiResponse.<BranchRevenueResponse>builder()
                    .code(200)
                    .message("Branch revenue retrieved successfully")
                    .result(revenue)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<BranchRevenueResponse> response = ApiResponse.<BranchRevenueResponse>builder()
                    .code(500)
                    .message("Failed to retrieve branch revenue: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/revenue/all")
    public ResponseEntity<ApiResponse<AllBranchesRevenueResponse>> getAllBranchesRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        try {
            // Default to last 30 days if not provided
            if (dateFrom == null) {
                dateFrom = LocalDate.now().minusDays(30);
            }
            if (dateTo == null) {
                dateTo = LocalDate.now();
            }

            AllBranchesRevenueResponse revenue = analyticsService.getAllBranchesRevenue(dateFrom, dateTo);
            ApiResponse<AllBranchesRevenueResponse> response = ApiResponse.<AllBranchesRevenueResponse>builder()
                    .code(200)
                    .message("All branches revenue retrieved successfully")
                    .result(revenue)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<AllBranchesRevenueResponse> response = ApiResponse.<AllBranchesRevenueResponse>builder()
                    .code(500)
                    .message("Failed to retrieve all branches revenue: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
