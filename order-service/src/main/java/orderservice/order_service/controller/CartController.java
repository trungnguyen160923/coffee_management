package orderservice.order_service.controller;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.AddToCartRequest;
import orderservice.order_service.dto.request.UpdateCartItemRequest;
import orderservice.order_service.dto.response.CartItemResponse;
import orderservice.order_service.dto.response.CartResponse;
import orderservice.order_service.dto.response.CartTotalResponse;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.service.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@Slf4j
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CartItemResponse>> addToCart(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam,
            @Valid @RequestBody AddToCartRequest request) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            CartItemResponse result = cartService.addToCart(userId, request);
            ApiResponse<CartItemResponse> response = ApiResponse.<CartItemResponse>builder()
                    .code(200)
                    .message("Item added to cart")
                    .result(result)
                    .build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AppException ex) {
            ApiResponse<CartItemResponse> response = ApiResponse.<CartItemResponse>builder()
                    .code(ex.getErrorCode().getCode())
                    .message(ex.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            log.error("Failed to add to cart", e);
            ApiResponse<CartItemResponse> response = ApiResponse.<CartItemResponse>builder()
                    .code(500)
                    .message("Failed to add to cart: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            CartResponse cart = cartService.getCart(userId);
            ApiResponse<CartResponse> response = ApiResponse.<CartResponse>builder()
                    .code(200)
                    .message("Cart retrieved successfully")
                    .result(cart)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get cart", e);
            ApiResponse<CartResponse> response = ApiResponse.<CartResponse>builder()
                    .code(500)
                    .message("Failed to get cart: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ApiResponse<CartItemResponse>> updateCartItem(@PathVariable Integer productId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam,
            @Valid @RequestBody UpdateCartItemRequest request) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            CartItemResponse result = cartService.updateCartItem(userId, productId, request);
            ApiResponse<CartItemResponse> response = ApiResponse.<CartItemResponse>builder()
                    .code(200)
                    .message("Cart item updated successfully")
                    .result(result)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update cart item", e);
            ApiResponse<CartItemResponse> response = ApiResponse.<CartItemResponse>builder()
                    .code(500)
                    .message("Failed to update cart item: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(@PathVariable Integer productId,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            cartService.removeFromCart(userId, productId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Cart item removed successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to remove cart item", e);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to remove cart item: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            cartService.clearCart(userId);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(200)
                    .message("Cart cleared successfully")
                    .result(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to clear cart", e);
            ApiResponse<Void> response = ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to clear cart: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/total")
    public ResponseEntity<ApiResponse<CartTotalResponse>> getCartTotal(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestHeader,
            @RequestParam(value = "guestId", required = false) String guestParam) {
        try {
            Integer userId = requireUserId(userIdHeader, guestHeader, guestParam);
            CartTotalResponse total = cartService.getCartTotal(userId);
            ApiResponse<CartTotalResponse> response = ApiResponse.<CartTotalResponse>builder()
                    .code(200)
                    .message("Cart total calculated successfully")
                    .result(total)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get cart total", e);
            ApiResponse<CartTotalResponse> response = ApiResponse.<CartTotalResponse>builder()
                    .code(500)
                    .message("Failed to get cart total: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private Integer requireUserId(String userIdHeader, String guestHeader, String guestParam) {
        // 1) Ưu tiên: Kiểm tra X-User-Id header trước (nếu có thì đã đăng nhập)
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            try {
                int userId = Integer.parseInt(userIdHeader.trim());
                if (userId > 0) {
                    return userId;
                }
            } catch (NumberFormatException e) {
                log.warn("Invalid X-User-Id header value: {}, will try guest id", userIdHeader);
            }
        }

        // 2) Fallback: guest cart using header or query param
        String raw = (guestHeader != null && !guestHeader.isBlank()) ? guestHeader : guestParam;
        
        if (raw != null && !raw.isBlank()) {
            try {
                // Thử parse thành số trước
                int parsed = Integer.parseInt(raw);
                if (parsed > 0) {
                    return parsed;
                }
            } catch (NumberFormatException ignored) {
                // Nếu không parse được thành số, sử dụng hash của chuỗi
                // Normalize hashCode() thành số dương để đảm bảo nhất quán
                int hash = raw.hashCode();
                int normalizedHash = hash == Integer.MIN_VALUE ? Integer.MAX_VALUE : Math.abs(hash);
                return normalizedHash;
            }
        }

        // 3) As a last resort, nếu không có guestId thì log warning và tạo số mới
        // Trường hợp này không nên xảy ra nếu frontend hoạt động đúng
        log.warn("No user_id or guestId provided, generating temporary guest id");
        int generated = Math.abs((int) (System.currentTimeMillis() % Integer.MAX_VALUE));
        return generated;
    }
}
