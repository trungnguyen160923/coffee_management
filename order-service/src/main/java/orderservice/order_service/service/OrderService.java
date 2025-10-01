package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreateOrderRequest;
import orderservice.order_service.dto.response.OrderResponse;
import orderservice.order_service.dto.response.ProductDetailResponse;
import orderservice.order_service.dto.response.ProductResponse;
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

        @Transactional
        public OrderResponse createOrder(CreateOrderRequest request, String token) {
                try {
                        log.info("CreateOrder start: customerId={}, branchId={}, itemsCount={}, discount={}, paymentMethod={}, reservationId={}, tableId={}",
                                        request.getCustomerId(), request.getBranchId(),
                                        request.getOrderItems() != null ? request.getOrderItems().size() : 0,
                                        request.getDiscount(), request.getPaymentMethod(), request.getReservationId(),
                                        request.getTableId());
                        log.debug("Customer info: name='{}', phone='{}', address='{}'",
                                        request.getCustomerName(), request.getPhone(), request.getDeliveryAddress());
                        // Validate products and calculate subtotal
                        BigDecimal subtotal = BigDecimal.ZERO;

                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                // Get product detail to validate and get price
                                log.debug("Fetching product detail: productDetailId={}, productId={}",
                                                itemRequest.getProductDetailId(), itemRequest.getProductId());
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                if (productDetailResponse.getResult() == null) {
                                        log.warn("Product detail not found: productDetailId={}",
                                                        itemRequest.getProductDetailId());
                                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                                }

                                ProductDetailResponse productDetail = productDetailResponse.getResult();
                                BigDecimal itemTotal = productDetail.getPrice().multiply(itemRequest.getQuantity());
                                log.debug("Item calc: price={}, qty={}, total={}",
                                                productDetail.getPrice(), itemRequest.getQuantity(), itemTotal);
                                subtotal = subtotal.add(itemTotal);
                        }

                        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        BigDecimal totalAmount = subtotal.subtract(discount);
                        log.info("Totals: subtotal={}, discount={}, total={}", subtotal, discount, totalAmount);

                        // Create order
                        Order order = Order.builder()
                                        .customerId(request.getCustomerId())
                                        .customerName(request.getCustomerName())
                                        .phone(request.getPhone())
                                        .deliveryAddress(request.getDeliveryAddress())
                                        .branchId(request.getBranchId())
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
                        log.info("Order saved: orderId={}", order.getOrderId());

                        // Create order items
                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                ProductDetailResponse productDetail = productDetailResponse.getResult();

                                OrderItem orderItem = OrderItem.builder()
                                                .order(order)
                                                .productId(itemRequest.getProductId())
                                                .productDetailId(itemRequest.getProductDetailId())
                                                .quantity(itemRequest.getQuantity())
                                                .unitPrice(productDetail.getPrice())
                                                .totalPrice(productDetail.getPrice()
                                                                .multiply(itemRequest.getQuantity()))
                                                .notes(itemRequest.getNotes())
                                                .build();

                                orderItemRepository.save(orderItem);
                                log.debug("OrderItem saved: orderId={}, itemId={}, productId={}, productDetailId={}, qty={}, unitPrice={}, lineTotal={}",
                                                order.getOrderId(), orderItem.getOrderItemId(),
                                                orderItem.getProductId(),
                                                orderItem.getProductDetailId(), orderItem.getQuantity(),
                                                orderItem.getUnitPrice(), orderItem.getTotalPrice());
                        }

                        log.info("CreateOrder success: orderId={}", order.getOrderId());
                        return convertToOrderResponse(order);
                } catch (Exception e) {
                        log.error("CreateOrder failed for customerId={}, branchId={}: {}", request.getCustomerId(),
                                        request.getBranchId(), e.getMessage(), e);
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
                        // Get product and product detail information
                        ApiResponse<ProductResponse> productResponse = catalogServiceClient
                                        .getProductById(orderItem.getProductId());
                        ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                        .getProductDetailById(orderItem.getProductDetailId());
                        log.debug("convertToOrderItemResponse: orderItemId={}, productId={}, productDetailId={}, fetchedProduct={}, fetchedDetail={}",
                                        orderItem.getOrderItemId(), orderItem.getProductId(),
                                        orderItem.getProductDetailId(),
                                        productResponse.getResult() != null, productDetailResponse.getResult() != null);

                        return OrderResponse.OrderItemResponse.builder()
                                        .orderItemId(orderItem.getOrderItemId())
                                        .productId(orderItem.getProductId())
                                        .productDetailId(orderItem.getProductDetailId())
                                        .product(productResponse.getResult())
                                        .productDetail(productDetailResponse.getResult())
                                        .quantity(orderItem.getQuantity())
                                        .unitPrice(orderItem.getUnitPrice())
                                        .totalPrice(orderItem.getTotalPrice())
                                        .notes(orderItem.getNotes())
                                        .build();
                } catch (Exception e) {
                        log.warn("convertToOrderItemResponse: fallback due to error for orderItemId={}: {}",
                                        orderItem.getOrderItemId(), e.getMessage());
                        // Return basic information if Feign call fails
                        return OrderResponse.OrderItemResponse.builder()
                                        .orderItemId(orderItem.getOrderItemId())
                                        .productId(orderItem.getProductId())
                                        .productDetailId(orderItem.getProductDetailId())
                                        .product(null)
                                        .productDetail(null)
                                        .quantity(orderItem.getQuantity())
                                        .unitPrice(orderItem.getUnitPrice())
                                        .totalPrice(orderItem.getTotalPrice())
                                        .notes(orderItem.getNotes())
                                        .build();
                }
        }
}
