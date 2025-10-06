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
import orderservice.order_service.repository.OrderItemRepository;
import orderservice.order_service.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class OrderService {

        OrderRepository orderRepository;
        OrderItemRepository orderItemRepository;
        CatalogServiceClient catalogServiceClient;
        BranchSelectionService branchSelectionService;

        @Transactional
        public OrderResponse createOrder(CreateOrderRequest request, String token) {
                log.info("=== STARTING ORDER CREATION ===");
                log.info("Request: customerId={}, deliveryAddress={}", request.getCustomerId(),
                                request.getDeliveryAddress());
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

                        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        BigDecimal totalAmount = subtotal.subtract(discount);

                        // Tự động chọn chi nhánh dựa trên địa chỉ giao hàng (chỉ district + province)
                        String addressForBranchSelection = request.getBranchSelectionAddress() != null
                                        ? request.getBranchSelectionAddress()
                                        : request.getDeliveryAddress();
                        Branch selectedBranch = branchSelectionService.findNearestBranch(addressForBranchSelection);
                        if (selectedBranch == null) {
                                throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                        }
                        log.info("Selected branch: {} for branch selection address: {}", selectedBranch.getName(),
                                        addressForBranchSelection);

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
                                        .notes(request.getNotes())
                                        .build();

                        order = orderRepository.save(order);

                        // Create order items
                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                ProductDetailResponse productDetail = productDetailResponse.getResult();

                                OrderItem orderItem = OrderItem.builder()
                                                .order(order)
                                                .productId(itemRequest.getProductId())
                                                .productDetailId(itemRequest.getProductDetailId())
                                                .sizeId(productDetail.getSize().getSizeId())
                                                .quantity(itemRequest.getQuantity())
                                                .unitPrice(productDetail.getPrice())
                                                .totalPrice(productDetail.getPrice()
                                                                .multiply(itemRequest.getQuantity()))
                                                .notes(itemRequest.getNotes())
                                                .build();

                                orderItemRepository.save(orderItem);
                        }

                        log.info("Order created successfully: orderId={}", order.getOrderId());
                        return convertToOrderResponse(order);
                } catch (Exception e) {
                        log.error("Failed to create order: {}", e.getMessage());
                        throw new AppException(ErrorCode.ORDER_CREATION_FAILED);
                }
        }

        public List<OrderResponse> getOrdersByCustomer(Integer customerId) {
                List<Order> orders = orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId);
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
                                .status(order.getStatus())
                                .paymentMethod(order.getPaymentMethod())
                                .paymentStatus(order.getPaymentStatus())
                                .subtotal(order.getSubtotal())
                                .discount(order.getDiscount())
                                .totalAmount(order.getTotalAmount())
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
                log.info("=== STARTING GUEST ORDER CREATION ===");
                log.info("Request: customerName={}, phone={}, deliveryAddress={}",
                                request.getCustomerName(), request.getPhone(), request.getDeliveryAddress());
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

                        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        BigDecimal totalAmount = subtotal.subtract(discount);

                        // Tự động chọn chi nhánh dựa trên địa chỉ giao hàng (chỉ district + province)
                        String addressForBranchSelection = request.getBranchSelectionAddress() != null
                                        ? request.getBranchSelectionAddress()
                                        : request.getDeliveryAddress();
                        Branch selectedBranch = branchSelectionService.findNearestBranch(addressForBranchSelection);
                        if (selectedBranch == null) {
                                throw new AppException(ErrorCode.BRANCH_NOT_FOUND);
                        }
                        log.info("Selected branch: {} for branch selection address: {}", selectedBranch.getName(),
                                        addressForBranchSelection);

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
                                        .totalAmount(totalAmount)
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
                                                .sizeId(productDetail.getSize().getSizeId())
                                                .quantity(itemRequest.getQuantity())
                                                .unitPrice(productDetail.getPrice())
                                                .totalPrice(productDetail.getPrice()
                                                                .multiply(itemRequest.getQuantity()))
                                                .notes(itemRequest.getNotes())
                                                .build();

                                orderItemRepository.save(orderItem);
                        }

                        log.info("✅ Guest order created successfully: Order ID = {}", order.getOrderId());
                        return convertToOrderResponse(order);

                } catch (Exception e) {
                        log.error("❌ Error creating guest order", e);
                        throw e;
                }
        }
}
