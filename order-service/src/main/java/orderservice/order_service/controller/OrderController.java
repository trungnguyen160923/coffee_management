package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateOrderRequest;
import orderservice.order_service.dto.request.CreateGuestOrderRequest;
import orderservice.order_service.dto.response.OrderResponse;
import orderservice.order_service.dto.response.OrderListResponse;
import orderservice.order_service.dto.response.ProductResponse;
import orderservice.order_service.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class OrderController {

    OrderService orderService;
    CatalogServiceClient catalogServiceClient;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        try {
            // Get JWT token from SecurityContext
            String token = getCurrentToken();

            OrderResponse order = orderService.createOrder(request, token);
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(200)
                    .message("Order created successfully")
                    .result(order)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(500)
                    .message("Failed to create order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/guest")
    public ResponseEntity<ApiResponse<OrderResponse>> createGuestOrder(
            @Valid @RequestBody CreateGuestOrderRequest request) {
        try {
            // Guest order không cần token
            OrderResponse order = orderService.createGuestOrder(request);
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(200)
                    .message("Guest order created successfully")
                    .result(order)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(500)
                    .message("Failed to create guest order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByCustomer(
            @PathVariable Integer customerId) {
        try {
            List<OrderResponse> orders = orderService.getOrdersByCustomer(customerId);
            ApiResponse<List<OrderResponse>> response = ApiResponse.<List<OrderResponse>>builder()
                    .code(200)
                    .message("Orders retrieved successfully")
                    .result(orders)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<OrderResponse>> response = ApiResponse.<List<OrderResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve orders: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/branch/{branchId}")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByBranch(
            @PathVariable Integer branchId) {
        try {
            List<OrderResponse> orders = orderService.getOrdersByBranch(branchId);
            ApiResponse<List<OrderResponse>> response = ApiResponse.<List<OrderResponse>>builder()
                    .code(200)
                    .message("Orders retrieved successfully")
                    .result(orders)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<List<OrderResponse>> response = ApiResponse.<List<OrderResponse>>builder()
                    .code(500)
                    .message("Failed to retrieve orders: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<OrderListResponse>> getOrders(
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String staffId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "50") Integer limit) {
        try {
            OrderListResponse result = orderService.getOrders(
                    branchId, status, type, staffId, dateFrom, dateTo, page, limit);
            ApiResponse<OrderListResponse> response = ApiResponse.<OrderListResponse>builder()
                    .code(200)
                    .message("Orders retrieved successfully")
                    .result(result)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve orders", e);
            ApiResponse<OrderListResponse> response = ApiResponse.<OrderListResponse>builder()
                    .code(500)
                    .message("Failed to retrieve orders: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Integer orderId) {
        try {
            OrderResponse order = orderService.getOrderById(orderId);
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(200)
                    .message("Order retrieved successfully")
                    .result(order)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(500)
                    .message("Failed to retrieve order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Integer orderId,
            @RequestParam String status) {
        try {
            OrderResponse order = orderService.updateOrderStatus(orderId, status);
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(200)
                    .message("Order status updated successfully")
                    .result(order)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(500)
                    .message("Failed to update order status: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable Integer orderId) {
        try {
            orderService.deleteOrder(orderId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Order deleted successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete order: " + e.getMessage())
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

    @GetMapping("/public/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderByIdPublic(@PathVariable Integer orderId) {
        try {
            OrderResponse order = orderService.getOrderById(orderId);
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(200)
                    .message("Order retrieved successfully")
                    .result(order)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<OrderResponse> response = ApiResponse.<OrderResponse>builder()
                    .code(500)
                    .message("Failed to retrieve order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/public/{orderId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelOrderPublic(@PathVariable Integer orderId) {
        try {
            orderService.cancelOrderByCustomer(orderId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Order cancelled successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to cancel order: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String getCurrentToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getCredentials() != null) {
            return authentication.getCredentials().toString();
        }
        return null;
    }
}
