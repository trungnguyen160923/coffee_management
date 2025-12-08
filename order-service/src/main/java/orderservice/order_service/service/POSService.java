package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.request.CreatePOSOrderRequest;
import orderservice.order_service.dto.response.POSOrderResponse;
import orderservice.order_service.dto.response.ProductDetailResponse;
import orderservice.order_service.dto.response.ProductResponse;
import orderservice.order_service.entity.Branch;
import orderservice.order_service.entity.Order;
import orderservice.order_service.entity.OrderItem;
import orderservice.order_service.entity.OrderTable;
import orderservice.order_service.exception.AppException;
import orderservice.order_service.exception.ErrorCode;
import orderservice.order_service.repository.BranchRepository;
import orderservice.order_service.repository.CafeTableRepository;
import orderservice.order_service.repository.OrderItemRepository;
import orderservice.order_service.repository.OrderRepository;
import orderservice.order_service.repository.OrderTableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class POSService {

    OrderRepository orderRepository;
    OrderItemRepository orderItemRepository;
    OrderTableRepository orderTableRepository;
    CafeTableRepository cafeTableRepository;
    CatalogServiceClient catalogServiceClient;
    DiscountService discountService;
    OrderEventProducer orderEventProducer;
    BranchClosureService branchClosureService;
    BranchRepository branchRepository;

    @Transactional
    public POSOrderResponse createPOSOrder(CreatePOSOrderRequest request) {
        try {
            // Validate products and calculate subtotal
            BigDecimal subtotal = BigDecimal.ZERO;

            for (CreatePOSOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                        .getProductDetailById(itemRequest.getProductDetailId());

                if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                    throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                }

                ProductDetailResponse productDetail = productDetailResponse.getResult();
                BigDecimal itemTotal = productDetail.getPrice().multiply(itemRequest.getQuantity());
                subtotal = subtotal.add(itemTotal);
            }

            // Xử lý discount nếu có mã giảm giá
            BigDecimal discount = BigDecimal.ZERO;
            if (request.getDiscountCode() != null && !request.getDiscountCode().trim().isEmpty()) {
                try {
                    // Áp dụng mã giảm giá
                    orderservice.order_service.dto.request.ApplyDiscountRequest applyDiscountRequest = orderservice.order_service.dto.request.ApplyDiscountRequest
                            .builder()
                            .discountCode(request.getDiscountCode())
                            .orderAmount(subtotal)
                            .branchId(request.getBranchId())
                            .build();

                    orderservice.order_service.dto.response.DiscountApplicationResponse discountResponse = discountService
                            .applyDiscount(applyDiscountRequest);

                    if (discountResponse.getIsValid()) {
                        discount = discountResponse.getDiscountAmount();
                        // Sử dụng mã giảm giá
                        discountService.useDiscount(request.getDiscountCode());
                    } else {
                        throw new AppException(ErrorCode.VALIDATION_FAILED, discountResponse.getMessage());
                    }
                } catch (Exception e) {
                    log.warn("Failed to apply discount code: {}", e.getMessage());
                    // Continue without discount if discount service fails
                    discount = BigDecimal.ZERO;
                }
            } else {
                discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
            }

            // Compute VAT (10%) on products subtotal
            BigDecimal vat = subtotal.multiply(new BigDecimal("0.10"));
            vat = vat.setScale(2, java.math.RoundingMode.HALF_UP);

            BigDecimal totalAmount = subtotal.subtract(discount).add(vat);

            // Kiểm tra xem chi nhánh có đang nghỉ vào ngày hôm nay không
            java.time.LocalDate today = java.time.LocalDate.now();
            if (branchClosureService.isBranchClosedOnDate(request.getBranchId(), today)) {
                log.warn("POS order creation rejected: Branch {} is closed on {}", request.getBranchId(), today);
                throw new AppException(ErrorCode.BRANCH_CLOSED_ON_DATE);
            }

            // Kiểm tra xem chi nhánh có hoạt động vào ngày hôm nay không (dựa trên openDays)
            Branch branch = branchRepository.findById(request.getBranchId()).orElse(null);
            if (branch != null && !branchClosureService.isBranchOperatingOnDate(branch, today)) {
                log.warn("POS order creation rejected: Branch {} is not operating on {} (not in openDays)", request.getBranchId(), today);
                throw new AppException(ErrorCode.BRANCH_NOT_OPERATING_ON_DAY);
            }

            // Kiểm tra thời gian làm việc của chi nhánh
            if (branch != null && branch.getOpenHours() != null && branch.getEndHours() != null) {
                java.time.LocalTime currentTime = java.time.LocalTime.now();
                boolean withinHours;
                if (branch.getEndHours().isAfter(branch.getOpenHours())) {
                    // Normal same-day window (e.g., 08:00 -> 22:00)
                    withinHours = !currentTime.isBefore(branch.getOpenHours())
                            && !currentTime.isAfter(branch.getEndHours());
                } else {
                    // Overnight window (e.g., 20:00 -> 02:00)
                    withinHours = !currentTime.isBefore(branch.getOpenHours())
                            || !currentTime.isAfter(branch.getEndHours());
                }
                if (!withinHours) {
                    log.warn("POS order creation rejected: Branch {} business hours are {} - {}, current time is {}", 
                            branch.getBranchId(), branch.getOpenHours(), branch.getEndHours(), currentTime);
                    throw new AppException(ErrorCode.POS_ORDER_OUTSIDE_BUSINESS_HOURS);
                }
            }

            // Validate customer info for constraint
            if (request.getCustomerId() == null &&
                    (request.getCustomerName() == null || request.getPhone() == null)) {
                // For POS orders without customer info, use default values
                request.setCustomerName("POS Customer");
                request.setPhone("_");
            }

            // Create order
            Order order = Order.builder()
                    .customerId(request.getCustomerId())
                    .customerName(request.getCustomerName())
                    .phone(request.getPhone())
                    .email(request.getEmail())
                    .deliveryAddress("") // POS orders don't need delivery address
                    .branchId(request.getBranchId())
                    .tableId(request.getTableIds().get(0)) // Use first table as primary
                    .staffId(request.getStaffId())
                    .status("CREATED")
                    .paymentMethod(request.getPaymentMethod())
                    .paymentStatus(request.getPaymentStatus() == null ? "PENDING" : request.getPaymentStatus())
                    .subtotal(subtotal)
                    .discount(discount)
                    .vat(vat)
                    .totalAmount(totalAmount)
                    .discountCode(request.getDiscountCode())
                    .notes(request.getNotes())
                    .build();

            order = orderRepository.save(order);

            // Create order tables mapping and update table status
            for (Integer tableId : request.getTableIds()) {
                try {
                    // Create order table mapping
                    OrderTable orderTable = OrderTable.builder()
                            .orderId(order.getOrderId())
                            .tableId(tableId)
                            .build();
                    orderTableRepository.save(orderTable);

                    // Update table status to OCCUPIED
                    var cafeTable = cafeTableRepository.findById(tableId);
                    if (cafeTable.isPresent()) {
                        var table = cafeTable.get();
                        table.setStatus("OCCUPIED");
                        cafeTableRepository.save(table);
                    }
                } catch (Exception e) {
                    log.error("Failed to create order table mapping for table {}: {}", tableId, e.getMessage());
                    throw e;
                }
            }

            // Create order items
            for (CreatePOSOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                try {
                    ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                            .getProductDetailById(itemRequest.getProductDetailId());

                    if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                        log.error("Product detail not found for ID: {}", itemRequest.getProductDetailId());
                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                    }

                    ProductDetailResponse productDetail = productDetailResponse.getResult();

                    OrderItem orderItem = OrderItem.builder()
                            .order(order)
                            .productId(itemRequest.getProductId())
                            .productDetailId(itemRequest.getProductDetailId())
                            .sizeId(productDetail.getSize() != null ? productDetail.getSize().getSizeId() : null)
                            .quantity(itemRequest.getQuantity())
                            .unitPrice(productDetail.getPrice())
                            .totalPrice(productDetail.getPrice().multiply(itemRequest.getQuantity()))
                            .notes(itemRequest.getNotes())
                            .build();

                    orderItemRepository.save(orderItem);
                } catch (Exception e) {
                    log.error("Failed to create order item for product {}: {}", itemRequest.getProductId(),
                            e.getMessage());
                    throw e;
                }
            }

            // Publish order created event to Kafka for staff notification
            try {
                publishOrderCreatedEvent(order);
                log.info("[POSService] ✅ Successfully triggered event publishing for POS orderId: {}", order.getOrderId());
            } catch (Exception e) {
                log.error("[POSService] ❌ Failed to publish order created event for POS orderId: {}", order.getOrderId(), e);
                // Don't fail order creation if event publishing fails
            }

            return convertToPOSOrderResponse(order);
        } catch (Exception e) {
            log.error("Failed to create POS order: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.ORDER_CREATION_FAILED);
        }
    }

    public List<POSOrderResponse> getPOSOrdersByStaff(Integer staffId) {
        List<Order> orders = orderRepository.findByStaffIdOrderByOrderDateDesc(staffId);
        return orders.stream()
                .map(this::convertToPOSOrderResponse)
                .collect(Collectors.toList());
    }

    public List<POSOrderResponse> getPOSOrdersByBranch(Integer branchId) {
        List<Order> orders = orderRepository.findByBranchIdOrderByOrderDateDesc(branchId);
        return orders.stream()
                .map(this::convertToPOSOrderResponse)
                .collect(Collectors.toList());
    }

    public POSOrderResponse getPOSOrderById(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return convertToPOSOrderResponse(order);
    }

    @Transactional
    public POSOrderResponse updatePOSOrderStatus(Integer orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        order.setStatus(status);
        order = orderRepository.save(order);

        // Update table status based on order status
        List<OrderTable> orderTables = orderTableRepository.findByOrderId(orderId);
        for (OrderTable orderTable : orderTables) {
            try {
                var cafeTable = cafeTableRepository.findById(orderTable.getTableId());
                if (cafeTable.isPresent()) {
                    var table = cafeTable.get();
                    String newTableStatus = getTableStatusFromOrderStatus(status);
                    if (newTableStatus != null) {
                        table.setStatus(newTableStatus);
                        cafeTableRepository.save(table);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to update table {} status: {}", orderTable.getTableId(), e.getMessage());
            }
        }

        return convertToPOSOrderResponse(order);
    }

    private String getTableStatusFromOrderStatus(String orderStatus) {
        switch (orderStatus.toUpperCase()) {
            case "CREATED":
            case "PENDING":
            case "PREPARING":
                return "OCCUPIED";
            case "COMPLETED":
            case "CANCELLED":
                return "AVAILABLE";
            default:
                return null; // No change needed
        }
    }

    @Transactional
    public void deletePOSOrder(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        // Get table IDs before deleting order tables
        List<OrderTable> orderTables = orderTableRepository.findByOrderId(orderId);
        List<Integer> tableIds = orderTables.stream()
                .map(OrderTable::getTableId)
                .collect(Collectors.toList());

        // Delete order tables first
        orderTableRepository.deleteByOrderId(orderId);

        // Update table status back to AVAILABLE
        for (Integer tableId : tableIds) {
            try {
                var cafeTable = cafeTableRepository.findById(tableId);
                if (cafeTable.isPresent()) {
                    var table = cafeTable.get();
                    table.setStatus("AVAILABLE");
                    cafeTableRepository.save(table);
                }
            } catch (Exception e) {
                log.error("Failed to update table {} status: {}", tableId, e.getMessage());
            }
        }

        // Delete order items
        List<OrderItem> items = orderItemRepository.findByOrderOrderId(orderId);
        if (items != null && !items.isEmpty()) {
            orderItemRepository.deleteAll(items);
        }

        orderRepository.delete(order);
    }

    private POSOrderResponse convertToPOSOrderResponse(Order order) {
        List<OrderItem> orderItems = orderItemRepository.findByOrderOrderId(order.getOrderId());
        List<OrderTable> orderTables = orderTableRepository.findByOrderId(order.getOrderId());

        List<POSOrderResponse.OrderItemResponse> orderItemResponses = orderItems.stream()
                .map(this::convertToOrderItemResponse)
                .collect(Collectors.toList());

        List<Integer> tableIds = orderTables.stream()
                .map(OrderTable::getTableId)
                .collect(Collectors.toList());

        return POSOrderResponse.builder()
                .orderId(order.getOrderId())
                .staffId(order.getStaffId())
                .branchId(order.getBranchId())
                .customerId(order.getCustomerId())
                .customerName(order.getCustomerName())
                .phone(order.getPhone())
                .email(order.getEmail())
                .tableIds(tableIds)
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

    private POSOrderResponse.OrderItemResponse convertToOrderItemResponse(OrderItem orderItem) {
        try {
            // Get product information
            ApiResponse<ProductResponse> productResponse = catalogServiceClient
                    .getProductById(orderItem.getProductId());

            return POSOrderResponse.OrderItemResponse.builder()
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
            return POSOrderResponse.OrderItemResponse.builder()
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

    private void publishOrderCreatedEvent(Order order) {
        try {
            log.info("[POSService] Building OrderCreatedEvent for POS orderId: {}", order.getOrderId());
            orderservice.order_service.events.OrderCreatedEvent event = orderservice.order_service.events.OrderCreatedEvent.builder()
                    .orderId(order.getOrderId())
                    .branchId(order.getBranchId())
                    .customerId(order.getCustomerId())
                    .customerName(order.getCustomerName())
                    .customerEmail(order.getEmail())
                    .phone(order.getPhone())
                    .totalAmount(order.getTotalAmount())
                    .paymentMethod(order.getPaymentMethod())
                    .createdAt(java.time.Instant.now())
                    .items(null) // Items not needed for notification
                    .build();
            log.info("[POSService] Event built successfully, calling OrderEventProducer...");
            orderEventProducer.publishOrderCreated(event);
            log.info("[POSService] ✅ Event publishing completed for POS orderId: {}", order.getOrderId());
        } catch (Exception e) {
            log.error("[POSService] ❌ Error creating order created event for POS orderId: {}", order.getOrderId(), e);
            throw e;
        }
    }
}
