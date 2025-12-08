package orderservice.order_service.service;

import feign.FeignException;
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
import java.util.Set;
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
        OrderEventProducer orderEventProducer;
        BranchClosureService branchClosureService;

        private static final Set<String> CANCEL_ALLOWED_STATUSES = Set.of("PENDING", "PREPARING");

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

                        // Xác định order type: ưu tiên từ request, nếu không có thì suy luận
                        String orderType = request.getOrderType();
                        if (orderType == null || orderType.trim().isEmpty()) {
                                orderType = determineOrderTypeFromRequest(request);
                        }

                        // Validation cho takeaway order
                        if ("takeaway".equalsIgnoreCase(orderType)) {
                                // Takeaway không cần tableId
                                if (request.getTableId() != null) {
                                        log.warn("Takeaway order should not have tableId");
                                        request.setTableId(null);
                                }
                                // Set delivery_address = "take-away" để tránh null và dễ query
                                request.setDeliveryAddress("take-away");
                        }

                        // Kiểm tra xem chi nhánh có đang nghỉ vào ngày hôm nay không
                        java.time.LocalDate today = java.time.LocalDate.now();
                        if (branchClosureService.isBranchClosedOnDate(selectedBranch.getBranchId(), today)) {
                                log.warn("Order creation rejected: Branch {} is closed on {}", selectedBranch.getBranchId(), today);
                                throw new AppException(ErrorCode.BRANCH_CLOSED_ON_DATE);
                        }

                        // Kiểm tra xem chi nhánh có hoạt động vào ngày hôm nay không (dựa trên openDays)
                        if (!branchClosureService.isBranchOperatingOnDate(selectedBranch, today)) {
                                log.warn("Order creation rejected: Branch {} is not operating on {} (not in openDays)", selectedBranch.getBranchId(), today);
                                throw new AppException(ErrorCode.BRANCH_NOT_OPERATING_ON_DAY);
                        }

                        // Kiểm tra business hours cho takeaway order
                        if ("takeaway".equalsIgnoreCase(orderType) && selectedBranch.getOpenHours() != null && selectedBranch.getEndHours() != null) {
                                java.time.LocalTime currentTime = java.time.LocalTime.now();
                                boolean withinHours;
                                if (selectedBranch.getEndHours().isAfter(selectedBranch.getOpenHours())) {
                                        // Normal same-day window
                                        withinHours = !currentTime.isBefore(selectedBranch.getOpenHours())
                                                        && !currentTime.isAfter(selectedBranch.getEndHours());
                                } else {
                                        // Overnight window
                                        withinHours = !currentTime.isBefore(selectedBranch.getOpenHours())
                                                        || !currentTime.isAfter(selectedBranch.getEndHours());
                                }
                                if (!withinHours) {
                                        log.warn("Takeaway order creation rejected: Branch {} business hours are {} - {}, current time is {}", 
                                                selectedBranch.getBranchId(), selectedBranch.getOpenHours(), selectedBranch.getEndHours(), currentTime);
                                        throw new AppException(ErrorCode.POS_ORDER_OUTSIDE_BUSINESS_HOURS);
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

                        // Create order
                        Order order = Order.builder()
                                        .customerId(request.getCustomerId())
                                        .customerName(request.getCustomerName())
                                        .phone(request.getPhone())
                                        .email(request.getEmail())
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

                        // Publish order created event to Kafka for staff notification
                        try {
                                publishOrderCreatedEvent(order, request);
                        } catch (Exception e) {
                                log.error("Failed to publish order created event for orderId: {}", order.getOrderId(), e);
                                // Don't fail order creation if event publishing fails
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

        public orderservice.order_service.dto.response.OrderListResponse getOrders(
                        String branchIdStr, String status, String type, String staffIdStr,
                        String dateFrom, String dateTo, Integer page, Integer limit) {
                try {
                        // Parse filters
                        Integer branchId = branchIdStr != null ? Integer.parseInt(branchIdStr) : null;
                        Integer staffId = staffIdStr != null ? Integer.parseInt(staffIdStr) : null;
                        
                        // Parse dates
                        java.time.LocalDateTime startDate = null;
                        java.time.LocalDateTime endDate = null;
                        if (dateFrom != null && !dateFrom.isEmpty()) {
                                startDate = java.time.LocalDate.parse(dateFrom).atStartOfDay();
                        }
                        if (dateTo != null && !dateTo.isEmpty()) {
                                endDate = java.time.LocalDate.parse(dateTo).atTime(23, 59, 59);
                        }

                        // Build query
                        List<Order> orders;
                        if (branchId != null && startDate != null && endDate != null) {
                                // Filter by branch and date range
                                orders = orderRepository.findByBranchIdAndDateRange(branchId, startDate, endDate);
                        } else if (branchId != null) {
                                // Filter by branch only
                                orders = orderRepository.findByBranchIdOrderByOrderDateDesc(branchId);
                        } else {
                                // Get all orders
                                orders = orderRepository.findAll();
                        }

                        // Apply additional filters
                        if (status != null && !status.isEmpty()) {
                                orders = orders.stream()
                                                .filter(o -> o.getStatus().equalsIgnoreCase(status))
                                                .collect(Collectors.toList());
                        }
                        if (staffId != null) {
                                orders = orders.stream()
                                                .filter(o -> o.getStaffId() != null && o.getStaffId().equals(staffId))
                                                .collect(Collectors.toList());
                        }
                        // Filter by type: determine order type based on existing fields
                        if (type != null && !type.isEmpty()) {
                                String typeLower = type.toLowerCase();
                                orders = orders.stream()
                                                .filter(o -> {
                                                        String orderType = determineOrderTypeFromOrder(o);
                                                        return orderType.equalsIgnoreCase(typeLower);
                                                })
                                                .collect(Collectors.toList());
                        }

                        // Sort by orderDate descending
                        orders = orders.stream()
                                        .sorted((a, b) -> b.getOrderDate().compareTo(a.getOrderDate()))
                                        .collect(Collectors.toList());

                        // Apply pagination
                        int total = orders.size();
                        int totalPages = (int) Math.ceil((double) total / limit);
                        int start = page * limit;
                        int end = Math.min(start + limit, total);
                        List<Order> paginatedOrders = start < total ? orders.subList(start, end) : List.of();

                        // Convert to response
                        List<OrderResponse> orderResponses = paginatedOrders.stream()
                                .map(this::convertToOrderResponse)
                                .collect(Collectors.toList());

                        return orderservice.order_service.dto.response.OrderListResponse.builder()
                                        .orders(orderResponses)
                                        .total(total)
                                        .page(page)
                                        .limit(limit)
                                        .totalPages(totalPages)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to get orders with filters", e);
                        throw new AppException(ErrorCode.ORDER_NOT_FOUND);
                }
        }

        public OrderResponse getOrderById(Integer orderId) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
                return convertToOrderResponse(order);
        }

        @Transactional
        public void cancelOrderByCustomer(Integer orderId) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                if (!isCancelableStatus(order.getStatus())) {
                        throw new AppException(ErrorCode.ORDER_CANNOT_BE_CANCELLED);
                }

                releaseActiveReservationsForOrder(orderId);
                updateOrderStatus(orderId, "CANCELLED");
        }

        @Transactional
        public OrderResponse updateOrderStatus(Integer orderId, String status) {
                Order order = orderRepository.findById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                if ("CANCELLED".equalsIgnoreCase(status) && !isCancelableStatus(order.getStatus())) {
                        throw new AppException(ErrorCode.ORDER_CANNOT_BE_CANCELLED);
                }

                order.setStatus(status);
                order = orderRepository.save(order);

                // Publish event when order is completed
                if ("COMPLETED".equals(status) && order.getCustomerId() != null) {
                        try {
                                orderservice.order_service.events.OrderCompletedEvent event = 
                                        orderservice.order_service.events.OrderCompletedEvent.builder()
                                                .orderId(order.getOrderId())
                                                .branchId(order.getBranchId())
                                                .customerId(order.getCustomerId())
                                                .customerName(order.getCustomerName())
                                                .customerEmail(order.getEmail())
                                                .phone(order.getPhone())
                                                .totalAmount(order.getTotalAmount())
                                                .paymentMethod(order.getPaymentMethod())
                                                .completedAt(java.time.Instant.now())
                                                .build();
                                orderEventProducer.publishOrderCompleted(event);
                        } catch (Exception e) {
                                log.error("[OrderService] Failed to publish order.completed event for orderId: {}", 
                                        order.getOrderId(), e);
                                // Don't throw exception to avoid breaking order status update flow
                        }
                }

                // Publish event when order is cancelled
                if (("CANCELLED".equals(status) || "cancelled".equalsIgnoreCase(status)) && order.getCustomerId() != null) {
                        try {
                                orderservice.order_service.events.OrderCompletedEvent event = 
                                        orderservice.order_service.events.OrderCompletedEvent.builder()
                                                .orderId(order.getOrderId())
                                                .branchId(order.getBranchId())
                                                .customerId(order.getCustomerId())
                                                .customerName(order.getCustomerName())
                                                .customerEmail(order.getEmail())
                                                .phone(order.getPhone())
                                                .totalAmount(order.getTotalAmount())
                                                .paymentMethod(order.getPaymentMethod())
                                                .completedAt(java.time.Instant.now())
                                                .build();
                                orderEventProducer.publishOrderCancelled(event);
                        } catch (Exception e) {
                                log.error("[OrderService] Failed to publish order.cancelled event for orderId: {}", 
                                        order.getOrderId(), e);
                                // Don't throw exception to avoid breaking order status update flow
                        }
                }

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

                // Determine order type based on fields
                String orderType = determineOrderType(order);

                return OrderResponse.builder()
                                .orderId(order.getOrderId())
                                .customerId(order.getCustomerId())
                                .customerName(order.getCustomerName())
                                .phone(order.getPhone())
                                .email(order.getEmail())
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
                                .type(orderType)
                                .orderItems(orderItemResponses)
                                .build();
        }

        private String determineOrderType(Order order) {
                return determineOrderTypeFromOrder(order);
        }

        private String determineOrderTypeFromOrder(Order order) {
                // POS orders: have staffId (created by staff at POS)
                if (order.getStaffId() != null) {
                        return "pos";
                }
                // Dine-in orders: have tableId (regardless of deliveryAddress)
                if (order.getTableId() != null) {
                        return "dine-in";
                }
                // Takeaway orders: have deliveryAddress = "take-away"
                if (order.getDeliveryAddress() != null && "take-away".equalsIgnoreCase(order.getDeliveryAddress().trim())) {
                        return "takeaway";
                }
                // Online orders: have deliveryAddress (not "take-away") and no tableId/staffId
                // Online orders are created from web/app and have delivery address
                if (order.getDeliveryAddress() != null && !order.getDeliveryAddress().trim().isEmpty()) {
                        return "online";
                }
                // Fallback: takeaway
                return "takeaway";
        }

        /**
         * Suy luận order type từ CreateOrderRequest
         */
        private String determineOrderTypeFromRequest(CreateOrderRequest request) {
                // Nếu có tableId -> dine-in
                if (request.getTableId() != null) {
                        return "dine-in";
                }
                // Nếu có deliveryAddress và không phải "take-away" -> online
                if (request.getDeliveryAddress() != null && !request.getDeliveryAddress().trim().isEmpty()
                                && !"take-away".equalsIgnoreCase(request.getDeliveryAddress().trim())) {
                        return "online";
                }
                // Còn lại -> takeaway
                return "takeaway";
        }

        /**
         * Suy luận order type từ CreateGuestOrderRequest
         */
        private String determineOrderTypeFromGuestRequest(CreateGuestOrderRequest request) {
                // Nếu có tableId -> dine-in
                if (request.getTableId() != null) {
                        return "dine-in";
                }
                // Nếu có deliveryAddress và không phải "take-away" -> online
                if (request.getDeliveryAddress() != null && !request.getDeliveryAddress().trim().isEmpty()
                                && !"take-away".equalsIgnoreCase(request.getDeliveryAddress().trim())) {
                        return "online";
                }
                // Còn lại -> takeaway
                return "takeaway";
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

                        // Xác định order type: ưu tiên từ request, nếu không có thì suy luận
                        String orderType = request.getOrderType();
                        if (orderType == null || orderType.trim().isEmpty()) {
                                orderType = determineOrderTypeFromGuestRequest(request);
                        }

                        // Validation cho takeaway order
                        if ("takeaway".equalsIgnoreCase(orderType)) {
                                // Takeaway không cần tableId
                                if (request.getTableId() != null) {
                                        log.warn("Takeaway order should not have tableId");
                                        request.setTableId(null);
                                }
                                // Set delivery_address = "take-away" để tránh null và dễ query
                                request.setDeliveryAddress("take-away");
                        }

                        // Kiểm tra xem chi nhánh có đang nghỉ vào ngày hôm nay không
                        java.time.LocalDate today = java.time.LocalDate.now();
                        if (branchClosureService.isBranchClosedOnDate(selectedBranch.getBranchId(), today)) {
                                log.warn("Guest order creation rejected: Branch {} is closed on {}", selectedBranch.getBranchId(), today);
                                throw new AppException(ErrorCode.BRANCH_CLOSED_ON_DATE);
                        }

                        // Kiểm tra xem chi nhánh có hoạt động vào ngày hôm nay không (dựa trên openDays)
                        if (!branchClosureService.isBranchOperatingOnDate(selectedBranch, today)) {
                                log.warn("Guest order creation rejected: Branch {} is not operating on {} (not in openDays)", selectedBranch.getBranchId(), today);
                                throw new AppException(ErrorCode.BRANCH_NOT_OPERATING_ON_DAY);
                        }

                        // Kiểm tra business hours cho takeaway order
                        if ("takeaway".equalsIgnoreCase(orderType) && selectedBranch.getOpenHours() != null && selectedBranch.getEndHours() != null) {
                                java.time.LocalTime currentTime = java.time.LocalTime.now();
                                boolean withinHours;
                                if (selectedBranch.getEndHours().isAfter(selectedBranch.getOpenHours())) {
                                        // Normal same-day window
                                        withinHours = !currentTime.isBefore(selectedBranch.getOpenHours())
                                                        && !currentTime.isAfter(selectedBranch.getEndHours());
                                } else {
                                        // Overnight window
                                        withinHours = !currentTime.isBefore(selectedBranch.getOpenHours())
                                                        || !currentTime.isAfter(selectedBranch.getEndHours());
                                }
                                if (!withinHours) {
                                        log.warn("Takeaway order creation rejected: Branch {} business hours are {} - {}, current time is {}", 
                                                selectedBranch.getBranchId(), selectedBranch.getOpenHours(), selectedBranch.getEndHours(), currentTime);
                                        throw new AppException(ErrorCode.POS_ORDER_OUTSIDE_BUSINESS_HOURS);
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
                                        .email(request.getEmail())
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

                        // Publish order created event to Kafka for staff notification
                        log.info("=== [OrderService] Preparing to publish guest order created event ===");
                        log.info("OrderId: {}, BranchId: {}, CustomerName: {}, TotalAmount: {}", 
                                order.getOrderId(), order.getBranchId(), order.getCustomerName(), order.getTotalAmount());
                        try {
                                publishOrderCreatedEvent(order, request);
                                log.info("[OrderService] ✅ Successfully triggered event publishing for guest orderId: {}", order.getOrderId());
                        } catch (Exception e) {
                                log.error("[OrderService] ❌ Failed to publish order created event for guest orderId: {}", order.getOrderId(), e);
                                // Don't fail order creation if event publishing fails
                        }

                        return convertToOrderResponse(order);

                } catch (Exception e) {
                        throw e;
                }
        }

        private boolean isCancelableStatus(String status) {
                return status != null && CANCEL_ALLOWED_STATUSES.contains(status.toUpperCase());
        }

        private void releaseActiveReservationsForOrder(Integer orderId) {
                try {
                        ApiResponse<Map<String, Object>> holdIdResponse = catalogServiceClient.getHoldIdByOrderId(orderId);
                        if (holdIdResponse == null || holdIdResponse.getResult() == null) {
                                log.info("No reservations linked to order {}. Skipping release.", orderId);
                                return;
                        }

                        Object holdIdValue = holdIdResponse.getResult().get("holdId");
                        if (holdIdValue == null) {
                                log.info("Hold ID missing in reservation lookup for order {}. Skipping release.", orderId);
                                return;
                        }

                        Map<String, Object> releaseRequest = Map.of("holdId", holdIdValue.toString());
                        catalogServiceClient.releaseReservation(releaseRequest);
                        log.info("Released reservations for order {} with holdId {}", orderId, holdIdValue);
                } catch (FeignException.NotFound e) {
                        log.info("No active reservation found for order {}. Nothing to release.", orderId);
                } catch (Exception e) {
                        log.error("Failed to release reservations for order {}: {}", orderId, e.getMessage(), e);
                        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                                        "Failed to release stock reservations. Please try again later.");
                }
        }

        private void publishOrderCreatedEvent(Order order, CreateOrderRequest request) {
                try {
                        log.info("[OrderService] Building OrderCreatedEvent for orderId: {}", order.getOrderId());
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
                                        .items(null) // Items not needed for notification, can be populated if needed
                                        .build();
                        log.info("[OrderService] Event built successfully, calling OrderEventProducer...");
                        orderEventProducer.publishOrderCreated(event);
                        log.info("[OrderService] ✅ Event publishing completed for orderId: {}", order.getOrderId());
                } catch (Exception e) {
                        log.error("[OrderService] ❌ Error creating order created event for orderId: {}", order.getOrderId(), e);
                        throw e;
                }
        }

        private void publishOrderCreatedEvent(Order order, CreateGuestOrderRequest request) {
                try {
                        log.info("[OrderService] Building OrderCreatedEvent for guest orderId: {}", order.getOrderId());
                        orderservice.order_service.events.OrderCreatedEvent event = orderservice.order_service.events.OrderCreatedEvent.builder()
                                        .orderId(order.getOrderId())
                                        .branchId(order.getBranchId())
                                        .customerId(null) // Guest order
                                        .customerName(order.getCustomerName())
                                        .customerEmail(order.getEmail())
                                        .phone(order.getPhone())
                                        .totalAmount(order.getTotalAmount())
                                        .paymentMethod(order.getPaymentMethod())
                                        .createdAt(java.time.Instant.now())
                                        .items(null)
                                        .build();
                        log.info("[OrderService] Event built successfully, calling OrderEventProducer...");
                        orderEventProducer.publishOrderCreated(event);
                        log.info("[OrderService] ✅ Event publishing completed for guest orderId: {}", order.getOrderId());
                } catch (Exception e) {
                        log.error("[OrderService] ❌ Error creating order created event for guest orderId: {}", order.getOrderId(), e);
                        throw e;
                }
        }
}
