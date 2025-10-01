package orderservice.order_service.controller;

import jakarta.validation.Valid;
import orderservice.order_service.dto.request.AssignManagerRequest;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateBranchRequest;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.service.BranchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import orderservice.order_service.dto.response.PagedResponse;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    @Autowired
    public BranchController(BranchService branchService) {
        this.branchService = branchService;
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
                    .code(200)
                    .message("Branches retrieved successfully")
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
                    .code(200)
                    .message("Branches retrieved successfully")
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
                    .code(200)
                    .message("Branches retrieved successfully")
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

    // Internal compensation endpoint to unassign manager (no authentication required)
    @PutMapping("/internal/{branchId}/unassign-manager")
    public ResponseEntity<ApiResponse<Branch>> unassignManagerInternal(@PathVariable Integer branchId,@Valid @RequestBody AssignManagerRequest request ) {
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
}
