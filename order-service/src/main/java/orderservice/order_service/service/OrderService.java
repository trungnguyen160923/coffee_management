package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateOrderRequest;
import orderservice.order_service.dto.request.CreateGuestOrderRequest;
import orderservice.order_service.dto.response.OrderResponse;
import orderservice.order_service.dto.response.ProductDetailResponse;
import orderservice.order_service.dto.response.ProductResponse;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.entity.Order;
import orderservice.order_service.entity.OrderItem;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.repository.OrderItemRepository;
import orderservice.order_service.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class OrderService {

        OrderRepository orderRepository;
        OrderItemRepository orderItemRepository;
        BranchRepository branchRepository;
        CatalogServiceClient catalogServiceClient;
        BranchSelectionService branchSelectionService;
        DiscountService discountService;

        @Transactional
        public OrderResponse createOrder(CreateOrderRequest request, String token) {
                try {
                        // Validate products and calculate subtotal
                        BigDecimal subtotal = BigDecimal.ZERO;

                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                                }

                                ProductDetailResponse productDetail = productDetailResponse.getResult();
                                BigDecimal itemTotal = productDetail.getPrice().multiply(itemRequest.getQuantity());
                                subtotal = subtotal.add(itemTotal);
                        }

                        // Sử dụng chi nhánh đã được chọn từ frontend
                        Branch selectedBranch = null;
                        if (request.getBranchId() != null) {
                                // Frontend đã gửi branchId, sử dụng chi nhánh này
                                selectedBranch = branchRepository.findById(request.getBranchId()).orElse(null);
                                if (selectedBranch == null) {
                                        throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                                }
                                log.info("Using branch from request: {} (ID: {})", selectedBranch.getName(), selectedBranch.getBranchId());
                        } else {
                                // Fallback: Tự động chọn chi nhánh dựa trên địa chỉ giao hàng
                                String addressForBranchSelection = request.getBranchSelectionAddress() != null
                                                ? request.getBranchSelectionAddress()
                                                : request.getDeliveryAddress();
                                selectedBranch = branchSelectionService.findNearestBranch(addressForBranchSelection);
                                if (selectedBranch == null) {
                                        throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                                }
                                log.info("Auto-selected branch: {} for address: {}", selectedBranch.getName(), addressForBranchSelection);
                        }

                        // Xử lý discount nếu có mã giảm giá
                        BigDecimal discount = BigDecimal.ZERO;
                        if (request.getDiscountCode() != null && !request.getDiscountCode().trim().isEmpty()) {
                                // Áp dụng mã giảm giá
                                orderservice.order_service.dto.request.ApplyDiscountRequest applyDiscountRequest = orderservice.order_service.dto.request.ApplyDiscountRequest
                                                .builder()
                                                .discountCode(request.getDiscountCode())
                                                .orderAmount(subtotal)
                                                .branchId(selectedBranch.getBranchId())
                                                .build();

                                orderservice.order_service.dto.response.DiscountApplicationResponse discountResponse = discountService
                                                .applyDiscount(applyDiscountRequest);

                                if (discountResponse.getIsValid()) {
                                        discount = discountResponse.getDiscountAmount();
                                        // Sử dụng mã giảm giá
                                        discountService.useDiscount(request.getDiscountCode());
                                } else {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        discountResponse.getMessage());
                                }
                        } else {
                                discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        }

                        // Compute VAT (10%) on products subtotal
                        BigDecimal vat = subtotal.multiply(new BigDecimal("0.10"));
                        vat = vat.setScale(2, java.math.RoundingMode.HALF_UP);

                        BigDecimal totalAmount = subtotal.subtract(discount).add(vat);

                        // Create order
                        Order order = Order.builder()
                                        .customerId(request.getCustomerId())
                                        .customerName(request.getCustomerName())
                                        .phone(request.getPhone())
                                        .deliveryAddress(request.getDeliveryAddress())
                                        .branchId(selectedBranch.getBranchId())
                                        .tableId(request.getTableId())
                                        .reservationId(request.getReservationId())
                                        .status("PENDING")
                                        .paymentMethod(request.getPaymentMethod())
                                        .paymentStatus(request.getPaymentStatus() == null ? "PENDING"
                                                        : request.getPaymentStatus())
                                        .subtotal(subtotal)
                                        .discount(discount)
                                        .totalAmount(totalAmount)
                                        .vat(vat)
                                        .discountCode(request.getDiscountCode())
                                        .notes(request.getNotes())
                                        .build();

                        order = orderRepository.save(order);

                        // Cập nhật order_id vào stock_reservations
                        try {
                                // Tạm thời sử dụng cartId từ request (nếu có)
                                Integer cartId = request.getCartId();
                                String guestId = request.getGuestId();
                                
                                log.info("Attempting to update reservations for orderId: {}, cartId: {}, guestId: {}", 
                                        order.getOrderId(), cartId, guestId);
                                
                                Map<String, Object> updateRequest = new HashMap<>();
                                updateRequest.put("orderId", order.getOrderId());
                                updateRequest.put("cartId", cartId);
                                updateRequest.put("guestId", guestId);
                                
                                log.info("Calling catalog service with request: {}", updateRequest);
                                
                                catalogServiceClient.updateOrderIdForReservationsByCartOrGuest(updateRequest);
                                log.info("Successfully updated reservation order_id for order: {}", order.getOrderId());
                        } catch (Exception e) {
                                log.error("Failed to update reservation order_id for order {}: {}", order.getOrderId(), e.getMessage(), e);
                                
                                // Xóa order đã tạo vì không thể liên kết với reservations
                                try {
                                        orderRepository.delete(order);
                                        log.info("Deleted order {} due to reservation update failure", order.getOrderId());
                                } catch (Exception deleteException) {
                                        log.error("Failed to delete order {} after reservation update failure: {}", 
                                                order.getOrderId(), deleteException.getMessage());
                                }
                                
                                // Ném lỗi để rollback transaction
                                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, 
                                        "Failed to link order with reservations: " + e.getMessage());
                        }

                        // Create order items
                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                ProductDetailResponse productDetail = productDetailResponse.getResult();

                                OrderItem orderItem = OrderItem.builder()
                                                .order(order)
                                                .productId(itemRequest.getProductId())
                                                .productDetailId(itemRequest.getProductDetailId())
                                                .sizeId(productDetail.getSize() != null
                                                                ? productDetail.getSize().getSizeId()
                                                                : null)
                                                .quantity(itemRequest.getQuantity())
                                                .unitPrice(productDetail.getPrice())
                                                .totalPrice(productDetail.getPrice()
                                                                .multiply(itemRequest.getQuantity()))
                                                .notes(itemRequest.getNotes())
                                                .build();

                                orderItemRepository.save(orderItem);
                        }

                        return convertToOrderResponse(order);
                } catch (Exception e) {
                        throw new AppException(ErrorCode.ORDER_CREATION_FAILED);
                }
        }

        public List<OrderResponse> getOrdersByCustomer(Integer customerId) {
                List<Order> orders = orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId);
                return orders.stream()
                                .map(this::convertToOrderResponse)
                                .collect(Collectors.toList());
        }

        public List<OrderResponse> getOrdersByBranch(Integer branchId) {
                List<Order> orders = orderRepository.findByBranchIdOrderByOrderDateDesc(branchId);
                return orders.stream()
                                .map(this::convertToOrderResponse)
                                .collect(Collectors.toList());
        }

        public OrderResponse getOrderById(Integer orderId) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
                return convertToOrderResponse(order);
        }

        @Transactional
        public OrderResponse updateOrderStatus(Integer orderId, String status) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                order.setStatus(status);
                order = orderRepository.save(order);

                return convertToOrderResponse(order);
        }

        @Transactional
        public void deleteOrder(Integer orderId) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                // Ensure order items are removed before deleting order in case cascade isn't
                // configured
                List<OrderItem> items = orderItemRepository.findByOrderOrderId(orderId);
                if (items != null && !items.isEmpty()) {
                        orderItemRepository.deleteAll(items);
                }

                orderRepository.delete(order);
        }

        private OrderResponse convertToOrderResponse(Order order) {
                List<OrderItem> orderItems = orderItemRepository.findByOrderOrderId(order.getOrderId());

                List<OrderResponse.OrderItemResponse> orderItemResponses = orderItems.stream()
                                .map(this::convertToOrderItemResponse)
                                .collect(Collectors.toList());

                return OrderResponse.builder()
                                .orderId(order.getOrderId())
                                .customerId(order.getCustomerId())
                                .customerName(order.getCustomerName())
                                .phone(order.getPhone())
                                .deliveryAddress(order.getDeliveryAddress())
                                .branchId(order.getBranchId())
                                .tableId(order.getTableId())
                                .reservationId(order.getReservationId())
                                .staffId(order.getStaffId())
                                .status(order.getStatus())
                                .paymentMethod(order.getPaymentMethod())
                                .paymentStatus(order.getPaymentStatus())
                                .subtotal(order.getSubtotal())
                                .discount(order.getDiscount())
                                .vat(order.getVat())
                                .totalAmount(order.getTotalAmount())
                                .discountCode(order.getDiscountCode())
                                .notes(order.getNotes())
                                .orderDate(order.getOrderDate())
                                .createAt(order.getCreateAt())
                                .updateAt(order.getUpdateAt())
                                .orderItems(orderItemResponses)
                                .build();
        }

        private OrderResponse.OrderItemResponse convertToOrderItemResponse(OrderItem orderItem) {
                try {
                        // Get product information
                        ApiResponse<ProductResponse> productResponse = catalogServiceClient
                                        .getProductById(orderItem.getProductId());

                        return OrderResponse.OrderItemResponse.builder()
                                        .orderItemId(orderItem.getOrderItemId())
                                        .productId(orderItem.getProductId())
                                        .productDetailId(orderItem.getProductDetailId())
                                        .sizeId(orderItem.getSizeId())
                                        .product(productResponse.getResult())
                                        .quantity(orderItem.getQuantity())
                                        .unitPrice(orderItem.getUnitPrice())
                                        .totalPrice(orderItem.getTotalPrice())
                                        .notes(orderItem.getNotes())
                                        .build();
                } catch (Exception e) {
                        // Return basic information if Feign call fails
                        return OrderResponse.OrderItemResponse.builder()
                                        .orderItemId(orderItem.getOrderItemId())
                                        .productId(orderItem.getProductId())
                                        .productDetailId(orderItem.getProductDetailId())
                                        .sizeId(orderItem.getSizeId())
                                        .product(null)
                                        .quantity(orderItem.getQuantity())
                                        .unitPrice(orderItem.getUnitPrice())
                                        .totalPrice(orderItem.getTotalPrice())
                                        .notes(orderItem.getNotes())
                                        .build();
                }
        }

        @Transactional
        public OrderResponse createGuestOrder(CreateGuestOrderRequest request) {
                try {
                        // Validate products and calculate subtotal
                        BigDecimal subtotal = BigDecimal.ZERO;

                        for (CreateGuestOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                                }

                                ProductDetailResponse productDetail = productDetailResponse.getResult();
                                BigDecimal itemTotal = productDetail.getPrice().multiply(itemRequest.getQuantity());
                                subtotal = subtotal.add(itemTotal);
                        }

                        // Sử dụng branchId từ request nếu có, nếu không thì tự động tìm
                        Branch selectedBranch;
                        if (request.getBranchId() != null) {
                                // Sử dụng branchId từ frontend (đã được kiểm tra stock)
                                selectedBranch = branchRepository.findById(request.getBranchId())
                                                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));
                        } else {
                                // Fallback: tự động chọn chi nhánh dựa trên địa chỉ giao hàng
                                String addressForBranchSelection = request.getBranchSelectionAddress() != null
                                                ? request.getBranchSelectionAddress()
                                                : request.getDeliveryAddress();
                                selectedBranch = branchSelectionService.findNearestBranch(addressForBranchSelection);
                                if (selectedBranch == null) {
                                        throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                                }
                        }

                        // Xử lý discount nếu có mã giảm giá
                        BigDecimal discount = BigDecimal.ZERO;
                        if (request.getDiscountCode() != null && !request.getDiscountCode().trim().isEmpty()) {
                                // Áp dụng mã giảm giá
                                orderservice.order_service.dto.request.ApplyDiscountRequest applyDiscountRequest = orderservice.order_service.dto.request.ApplyDiscountRequest
                                                .builder()
                                                .discountCode(request.getDiscountCode())
                                                .orderAmount(subtotal)
                                                .branchId(selectedBranch.getBranchId())
                                                .build();

                                orderservice.order_service.dto.response.DiscountApplicationResponse discountResponse = discountService
                                                .applyDiscount(applyDiscountRequest);

                                if (discountResponse.getIsValid()) {
                                        discount = discountResponse.getDiscountAmount();
                                        // Sử dụng mã giảm giá
                                        discountService.useDiscount(request.getDiscountCode());
                                } else {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        discountResponse.getMessage());
                                }
                        } else {
                                discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        }

                        // Compute VAT (10%) on products subtotal
                        BigDecimal vat = subtotal.multiply(new BigDecimal("0.10"));
                        vat = vat.setScale(2, java.math.RoundingMode.HALF_UP);

                        BigDecimal totalAmount = subtotal.subtract(discount).add(vat);

                        // Create order (customerId = null for guest)
                        Order order = Order.builder()
                                        .customerId(null) // Guest order không có customerId
                                        .customerName(request.getCustomerName())
                                        .phone(request.getPhone())
                                        .deliveryAddress(request.getDeliveryAddress())
                                        .branchId(selectedBranch.getBranchId())
                                        .tableId(request.getTableId())
                                        .reservationId(request.getReservationId())
                                        .status("PENDING")
                                        .paymentMethod(request.getPaymentMethod())
                                        .paymentStatus(request.getPaymentStatus() == null ? "PENDING"
                                                        : request.getPaymentStatus())
                                        .subtotal(subtotal)
                                        .discount(discount)
                                        .vat(vat)
                                        .totalAmount(totalAmount)
                                        .discountCode(request.getDiscountCode())
                                        .notes(request.getNotes())
                                        .build();

                        order = orderRepository.save(order);

                        // Create order items
                        for (CreateGuestOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());
                                ProductDetailResponse productDetail = productDetailResponse.getResult();

                                OrderItem orderItem = OrderItem.builder()
                                                .order(order)
                                                .productId(itemRequest.getProductId())
                                                .productDetailId(itemRequest.getProductDetailId())
                                                .sizeId(productDetail.getSize() != null
                                                                ? productDetail.getSize().getSizeId()
                                                                : null)
                                                .quantity(itemRequest.getQuantity())
                                                .unitPrice(productDetail.getPrice())
                                                .totalPrice(productDetail.getPrice()
                                                                .multiply(itemRequest.getQuantity()))
                                                .notes(itemRequest.getNotes())
                                                .build();

                                orderItemRepository.save(orderItem);
                        }

                        // Cập nhật orderId trong stock_reservations nếu có cartId hoặc guestId
                        if (request.getCartId() != null || request.getGuestId() != null) {
                                try {
                                        Map<String, Object> updateRequest = new HashMap<>();
                                        updateRequest.put("orderId", order.getOrderId());
                                        updateRequest.put("cartId", request.getCartId());
                                        updateRequest.put("guestId", request.getGuestId());
                                        
                                        catalogServiceClient.updateOrderIdForReservationsByCartOrGuest(updateRequest);
                                } catch (Exception e) {
                                        // Nếu không thể cập nhật reservations, rollback order
                                        orderRepository.delete(order);
                                        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, 
                                                "Failed to update stock reservations: " + e.getMessage());
                                }
                        }

                        return convertToOrderResponse(order);

                } catch (Exception e) {
                        throw e;
                }
        }
}
