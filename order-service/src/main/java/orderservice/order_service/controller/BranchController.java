package orderservice.order_service.controller;

import jakarta.validation.Valid;
import orderservice.order_service.dto.request.AssignManagerRequest;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateBranchRequest;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.service.BranchService;
import orderservice.order_service.service.BranchSelectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import orderservice.order_service.dto.response.PagedResponse;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;
    private final BranchSelectionService branchSelectionService;

    @Autowired
    public BranchController(BranchService branchService, BranchSelectionService branchSelectionService) {
        this.branchService = branchService;
        this.branchSelectionService = branchSelectionService;
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
                ApiResponse<Branch> response = ApiResponse.<Branch>builder()
                        .code(404)
                        .message("No branch found for the given address")
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
}
