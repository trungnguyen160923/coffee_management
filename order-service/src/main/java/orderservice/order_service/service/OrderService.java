package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
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
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class OrderService {

    OrderRepository orderRepository;
    OrderItemRepository orderItemRepository;
    CatalogServiceClient catalogServiceClient;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, String token) {
        try {
            // Validate products and calculate subtotal/total
            BigDecimal subtotal = BigDecimal.ZERO;

            for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                // Get product detail to validate and get price
                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                        .getProductDetailById(itemRequest.getProductDetailId());

                if (productDetailResponse.getResult() == null) {
                    throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                }

                ProductDetailResponse productDetail = productDetailResponse.getResult();
                BigDecimal itemTotal = productDetail.getPrice().multiply(itemRequest.getQuantity());
                subtotal = subtotal.add(itemTotal);
            }

            // Create order
            Order order = Order.builder()
                    .customerId(request.getCustomerId())
                    .customerName(request.getCustomerName())
                    .phone(request.getPhone())
                    .deliveryAddress(request.getDeliveryAddress())
                    .branchId(request.getBranchId())
                    .status("CREATED")
                    .paymentMethod(request.getPaymentMethod())
                    .paymentStatus(request.getPaymentStatus() == null ? "PENDING" : request.getPaymentStatus())
                    .subtotal(subtotal)
                    .discount(BigDecimal.ZERO)
                    .totalAmount(subtotal)
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
                        .quantity(itemRequest.getQuantity())
                        .unitPrice(productDetail.getPrice())
                        .totalPrice(productDetail.getPrice().multiply(itemRequest.getQuantity()))
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
