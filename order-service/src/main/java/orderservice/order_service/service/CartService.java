package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.AddToCartRequest;
import orderservice.order_service.dto.request.UpdateCartItemRequest;
import orderservice.order_service.dto.response.*;
import orderservice.order_service.entity.Cart;
import orderservice.order_service.entity.CartItem;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.CartItemRepository;
import orderservice.order_service.repository.CartRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CartService {

    CartRepository cartRepository;
    CartItemRepository cartItemRepository;
    CatalogServiceClient catalogServiceClient;

    @Transactional
    public CartItemResponse addToCart(Integer userId, AddToCartRequest request) {
        Cart cart = getOrCreateCart(userId);

        // validate product detail and get price via catalog-service
        ApiResponse<ProductDetailResponse> pdResp = catalogServiceClient
                .getProductDetailById(request.getProductDetailId());
        if (pdResp.getResult() == null) {
            throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        ProductDetailResponse productDetail = pdResp.getResult();

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndProductAndDetail(userId, request.getProductId(),
                request.getProductDetailId());
        CartItem item;
        if (existing.isPresent()) {
            item = existing.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
            item.setTotalPrice(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        } else {
            item = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .productDetailId(request.getProductDetailId())
                    .quantity(request.getQuantity())
                    .unitPrice(productDetail.getPrice())
                    .totalPrice(productDetail.getPrice().multiply(BigDecimal.valueOf(request.getQuantity())))
                    .build();
        }

        item = cartItemRepository.save(item);
        return toCartItemResponse(item);
    }

    public CartResponse getCart(Integer userId) {
        // Tìm cart hiện tại, không tạo mới
        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty()) {
            // Nếu chưa có cart, trả về cart rỗng
            return CartResponse.builder()
                    .cartId(null)
                    .userId(userId)
                    .cartItems(List.of())
                    .totalAmount(BigDecimal.ZERO)
                    .totalItems(0)
                    .createAt(null)
                    .updateAt(null)
                    .build();
        }
        
        Cart cart = cartOpt.get();
        List<CartItem> items = cartItemRepository.findByCartCartId(cart.getCartId());
        List<CartItemResponse> itemResponses = items.stream().map(this::toCartItemResponse)
                .collect(Collectors.toList());
        BigDecimal totalAmount = items.stream().map(CartItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalItems = items.stream().mapToInt(CartItem::getQuantity).sum();
        
        return CartResponse.builder()
                .cartId(cart.getCartId())
                .userId(cart.getUserId())
                .cartItems(itemResponses)
                .totalAmount(totalAmount)
                .totalItems(totalItems)
                .createAt(cart.getCreateAt())
                .updateAt(cart.getUpdateAt())
                .build();
    }

    @Transactional
    public CartItemResponse updateCartItem(Integer userId, Integer productId, UpdateCartItemRequest request) {
        Optional<CartItem> itemOpt = cartItemRepository.findByUserIdAndProduct(userId, productId);
        if (itemOpt.isEmpty())
            throw new AppException(ErrorCode.CART_ITEM_NOT_FOUND);
        CartItem item = itemOpt.get();
        item.setQuantity(request.getQuantity());
        item.setTotalPrice(item.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity())));
        item = cartItemRepository.save(item);
        return toCartItemResponse(item);
    }

    @Transactional
    public void removeFromCart(Integer userId, Integer productId) {
        Optional<CartItem> itemOpt = cartItemRepository.findByUserIdAndProduct(userId, productId);
        if (itemOpt.isEmpty())
            throw new AppException(ErrorCode.CART_ITEM_NOT_FOUND);
        cartItemRepository.delete(itemOpt.get());
    }

    @Transactional
    public void clearCart(Integer userId) {
        cartItemRepository.deleteByCartUserId(userId);
    }

    public CartTotalResponse getCartTotal(Integer userId) {
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        BigDecimal totalAmount = items.stream().map(CartItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalItems = items.stream().mapToInt(CartItem::getQuantity).sum();
        return CartTotalResponse.builder().totalAmount(totalAmount).totalItems(totalItems).build();
    }

    private Cart getOrCreateCart(Integer userId) {
        // Tìm cart theo userId (cho authenticated users)
        Optional<Cart> existingCart = cartRepository.findByUserId(userId);
        if (existingCart.isPresent()) {
            return existingCart.get();
        }
        
        // Tạo cart mới chỉ khi chưa có
        Cart newCart = Cart.builder().userId(userId).build();
        return cartRepository.save(newCart);
    }

    private CartItemResponse toCartItemResponse(CartItem item) {
        try {
            ApiResponse<ProductResponse> p = catalogServiceClient.getProductById(item.getProductId());
            ApiResponse<ProductDetailResponse> pd = catalogServiceClient
                    .getProductDetailById(item.getProductDetailId());
            return CartItemResponse.builder()
                    .cartItemId(item.getCartItemId())
                    .productId(item.getProductId())
                    .productDetailId(item.getProductDetailId())
                    .product(p.getResult())
                    .productDetail(pd.getResult())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .totalPrice(item.getTotalPrice())
                    .createAt(item.getCreateAt())
                    .updateAt(item.getUpdateAt())
                    .build();
        } catch (Exception e) {
            return CartItemResponse.builder()
                    .cartItemId(item.getCartItemId())
                    .productId(item.getProductId())
                    .productDetailId(item.getProductDetailId())
                    .product(null)
                    .productDetail(null)
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .totalPrice(item.getTotalPrice())
                    .createAt(item.getCreateAt())
                    .updateAt(item.getUpdateAt())
                    .build();
        }
    }
}
