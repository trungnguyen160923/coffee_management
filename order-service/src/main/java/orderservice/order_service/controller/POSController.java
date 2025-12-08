package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import orderservice.order_service.client.AuthServiceClient;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.client.ProfileServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreatePOSOrderRequest;
import orderservice.order_service.dto.response.POSOrderResponse;
import orderservice.order_service.dto.response.ProductResponse;
import orderservice.order_service.entity.CafeTable;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.repository.CafeTableRepository;
import orderservice.order_service.service.POSService;
import orderservice.order_service.util.StaffPermissionValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pos")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class POSController {

    POSService posService;
    CatalogServiceClient catalogServiceClient;
    ProfileServiceClient profileServiceClient;
    AuthServiceClient authServiceClient;
    CafeTableRepository cafeTableRepository;

    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<POSOrderResponse>> createPOSOrder(
            @Valid @RequestBody CreatePOSOrderRequest request) {
        // Validate permission - chỉ CASHIER_STAFF mới được tạo POS order
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            POSOrderResponse order = posService.createPOSOrder(request);
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(200)
                    .message("POS order created successfully")
                    .result(order)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AppException e) {
            // AppException sẽ được GlobalExceptionHandler xử lý tự động
            throw e;
        } catch (Exception e) {
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(500)
                    .message("Failed to create POS order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/orders/staff/{staffId}")
    public ResponseEntity<ApiResponse<List<POSOrderResponse>>> getPOSOrdersByStaff(
            @PathVariable Integer staffId) {
        // Validate permission - chỉ CASHIER_STAFF
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            List<POSOrderResponse> orders = posService.getPOSOrdersByStaff(staffId);
            ApiResponse<List<POSOrderResponse>> response = ApiResponse.<List<POSOrderResponse>>builder()
                    .code(200)
                    .message("POS orders retrieved successfully")
                    .result(orders)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<POSOrderResponse>> response = ApiResponse.<List<POSOrderResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve POS orders: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/orders/branch/{branchId}")
    public ResponseEntity<ApiResponse<List<POSOrderResponse>>> getPOSOrdersByBranch(
            @PathVariable Integer branchId) {
        // Validate permission - chỉ CASHIER_STAFF
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            List<POSOrderResponse> orders = posService.getPOSOrdersByBranch(branchId);
            ApiResponse<List<POSOrderResponse>> response = ApiResponse.<List<POSOrderResponse>>builder()
                    .code(200)
                    .message("POS orders retrieved successfully")
                    .result(orders)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<List<POSOrderResponse>> response = ApiResponse.<List<POSOrderResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve POS orders: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<POSOrderResponse>> getPOSOrderById(@PathVariable Integer orderId) {
        // Validate permission - chỉ CASHIER_STAFF
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            POSOrderResponse order = posService.getPOSOrderById(orderId);
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(200)
                    .message("POS order retrieved successfully")
                    .result(order)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(500)
                    .message("Failed to retrieve POS order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<POSOrderResponse>> updatePOSOrderStatus(
            @PathVariable Integer orderId,
            @RequestParam String status) {
        // Validate permission - chỉ CASHIER_STAFF
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            POSOrderResponse order = posService.updatePOSOrderStatus(orderId, status);
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(200)
                    .message("POS order status updated successfully")
                    .result(order)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<POSOrderResponse> response = ApiResponse.<POSOrderResponse>builder()
                    .code(500)
                    .message("Failed to update POS order status: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<Void>> deletePOSOrder(@PathVariable Integer orderId) {
        // Validate permission - chỉ CASHIER_STAFF
        StaffPermissionValidator.requirePOSAccess(profileServiceClient, authServiceClient);
        
        try {
            posService.deletePOSOrder(orderId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("POS order deleted successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete POS order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        try {
            ApiResponse<List<ProductResponse>> catalogResponse = catalogServiceClient.getAllProducts();
            return ResponseEntity.ok(catalogResponse);
        } catch (Exception e) {
            ApiResponse<List<ProductResponse>> response = ApiResponse.<List<ProductResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve products: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Integer productId) {
        try {
            ApiResponse<ProductResponse> catalogResponse = catalogServiceClient.getProductById(productId);
            return ResponseEntity.ok(catalogResponse);
        } catch (Exception e) {
            ApiResponse<ProductResponse> response = ApiResponse.<ProductResponse>builder()
                    .code(500)
                    .message("Failed to retrieve product: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/tables/branch/{branchId}")
    public ResponseEntity<ApiResponse<List<CafeTable>>> getTablesByBranch(@PathVariable Integer branchId) {
        try {
            var tables = cafeTableRepository.findByBranchId(branchId);
            ApiResponse<List<CafeTable>> response = ApiResponse.<List<CafeTable>>builder()
                    .code(200)
                    .message("Tables retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<CafeTable>> response = ApiResponse.<List<CafeTable>>builder()
                    .code(500)
                    .message("Failed to retrieve tables: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/tables/branch/{branchId}/status/{status}")
    public ResponseEntity<ApiResponse<List<CafeTable>>> getTablesByBranchAndStatus(
            @PathVariable Integer branchId, @PathVariable String status) {
        try {
            var tables = cafeTableRepository.findByBranchIdAndStatus(branchId, status);
            ApiResponse<List<CafeTable>> response = ApiResponse.<List<CafeTable>>builder()
                    .code(200)
                    .message("Tables retrieved successfully")
                    .result(tables)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<CafeTable>> response = ApiResponse.<List<CafeTable>>builder()
                    .code(500)
                    .message("Failed to retrieve tables: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
