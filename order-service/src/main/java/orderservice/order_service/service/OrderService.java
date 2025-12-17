package orderservice.order_service.service;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
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
import org.springframework.beans.factory.annotation.Value;
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

        @Value("${delivery.max-distance-km:10}")
        @NonFinal
        private double maxDeliveryDistanceKm; // Not final to allow @Value injection

        private static final Set<String> CANCEL_ALLOWED_STATUSES = Set.of("PENDING", "PREPARING");
        
        // Valid order status transitions
        private static final Map<String, Set<String>> VALID_STATUS_TRANSITIONS = Map.of(
                "CREATED", Set.of("PENDING", "CANCELLED"),
                "PENDING", Set.of("PREPARING", "CANCELLED"),
                "PREPARING", Set.of("READY", "CANCELLED"),
                "READY", Set.of("COMPLETED", "CANCELLED"),
                "COMPLETED", Set.of(), // Terminal state
                "CANCELLED", Set.of()  // Terminal state
        );

        @Transactional
        public OrderResponse createOrder(CreateOrderRequest request, String token) {
                try {
                        // Validate products and calculate subtotal
                        BigDecimal subtotal = BigDecimal.ZERO;

                        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                // Validate quantity
                                if (itemRequest.getQuantity() == null || itemRequest.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        "Order item quantity must be greater than 0");
                                }
                                
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());

                                if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                                }

                                ProductDetailResponse productDetail = productDetailResponse.getResult();
                                
                                // Validate price
                                if (productDetail.getPrice() == null || productDetail.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        "Product price must be greater than 0");
                                }
                                
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
                                
                                // Kiểm tra khoảng cách tối đa khi tự động chọn chi nhánh
                                selectedBranch = branchSelectionService.findNearestBranchWithinDistance(
                                                addressForBranchSelection, maxDeliveryDistanceKm);
                                if (selectedBranch == null) {
                                        String errorMessage = String.format("Không tìm thấy chi nhánh nào trong phạm vi %s km từ địa chỉ '%s'. Vui lòng chọn địa chỉ giao hàng gần hơn hoặc liên hệ hỗ trợ.", 
                                                maxDeliveryDistanceKm, addressForBranchSelection);
                                        log.warn("Order creation rejected: {}", errorMessage);
                                        throw new AppException(ErrorCode.DELIVERY_DISTANCE_TOO_FAR, errorMessage);
                                }
                                log.info("Auto-selected branch: {} for address: {} (within {} km)", 
                                        selectedBranch.getName(), addressForBranchSelection, maxDeliveryDistanceKm);
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

                        // Validate branch với thông tin chi tiết
                        validateBranchForOrder(selectedBranch, orderType);

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
                                        // Note: useDiscount() will be called AFTER order is successfully created
                                        // to avoid discount being used if order creation fails
                                } else {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        discountResponse.getMessage());
                                }
                        } else {
                                discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        }

                        // Compute subtotal after discount
                        BigDecimal afterDiscount = subtotal.subtract(discount);
                        // Ensure afterDiscount is not negative
                        if (afterDiscount.compareTo(BigDecimal.ZERO) < 0) {
                                afterDiscount = BigDecimal.ZERO;
                        }

                        // Compute VAT (10%) on subtotal AFTER discount
                        BigDecimal vat = afterDiscount.multiply(new BigDecimal("0.10"));
                        vat = vat.setScale(2, java.math.RoundingMode.HALF_UP);

                        BigDecimal totalAmount = afterDiscount.add(vat);
                        
                        // Validate total amount is not negative
                        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
                                throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                "Total amount cannot be negative. Please check discount amount.");
                        }

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
                        
                        // Use discount AFTER order is successfully created
                        if (request.getDiscountCode() != null && !request.getDiscountCode().trim().isEmpty() && discount.compareTo(BigDecimal.ZERO) > 0) {
                                try {
                                        discountService.useDiscount(request.getDiscountCode());
                                        log.info("Discount {} used for order {}", request.getDiscountCode(), order.getOrderId());
                                } catch (Exception e) {
                                        log.error("Failed to use discount {} for order {}: {}", 
                                                request.getDiscountCode(), order.getOrderId(), e.getMessage());
                                        // Don't fail order creation if discount usage fails, but log the error
                                }
                        }

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

                String currentStatus = order.getStatus();
                String newStatus = status.toUpperCase();
                
                // Validate status transition
                if (!isValidStatusTransition(currentStatus, newStatus)) {
                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                        String.format("Invalid status transition from %s to %s", currentStatus, newStatus));
                }

                // Tự động commit reservation khi chuyển sang READY
                if ("READY".equals(newStatus)) {
                        commitReservationForOrder(order);
                }

                order.setStatus(newStatus);
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
         * Validate branch với thông tin chi tiết về lý do không thỏa mãn
         * @param branch - Chi nhánh cần validate
         * @param orderType - Loại đơn hàng (delivery, takeaway, dine-in)
         * @throws AppException với thông tin chi tiết nếu branch không thỏa mãn
         */
        private void validateBranchForOrder(Branch branch, String orderType) {
                java.time.LocalDate today = java.time.LocalDate.now();
                String branchName = branch.getName() != null ? branch.getName() : "Chi nhánh #" + branch.getBranchId();
                
                // 1. Kiểm tra chi nhánh có đang nghỉ (branch closure)
                if (branchClosureService.isBranchClosedOnDate(branch.getBranchId(), today)) {
                        String errorMessage = String.format("Chi nhánh '%s' đang nghỉ vào ngày %s. Vui lòng chọn ngày khác hoặc chi nhánh khác.", 
                                branchName, today.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                        log.warn("Order creation rejected: {}", errorMessage);
                        throw new AppException(ErrorCode.BRANCH_CLOSED_ON_DATE, errorMessage);
                }
                
                // 2. Kiểm tra chi nhánh có hoạt động vào ngày hôm nay (openDays)
                if (!branchClosureService.isBranchOperatingOnDate(branch, today)) {
                        String dayOfWeek = today.getDayOfWeek().toString();
                        String errorMessage = String.format("Chi nhánh '%s' không hoạt động vào %s (%s). Vui lòng chọn ngày khác hoặc chi nhánh khác.", 
                                branchName, today.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")), dayOfWeek);
                        log.warn("Order creation rejected: {}", errorMessage);
                        throw new AppException(ErrorCode.BRANCH_NOT_OPERATING_ON_DAY, errorMessage);
                }
                
                // 3. Kiểm tra giờ làm việc cho tất cả loại đơn hàng
                if (branch.getOpenHours() != null && branch.getEndHours() != null) {
                        java.time.LocalTime currentTime = java.time.LocalTime.now();
                        boolean withinHours;
                        if (branch.getEndHours().isAfter(branch.getOpenHours())) {
                                // Normal same-day window (e.g., 08:00 - 22:00)
                                withinHours = !currentTime.isBefore(branch.getOpenHours())
                                                && !currentTime.isAfter(branch.getEndHours());
                        } else {
                                // Overnight window (e.g., 22:00 - 06:00)
                                withinHours = !currentTime.isBefore(branch.getOpenHours())
                                                || !currentTime.isAfter(branch.getEndHours());
                        }
                        
                        if (!withinHours) {
                                String openHoursStr = branch.getOpenHours().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                                String endHoursStr = branch.getEndHours().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                                String currentTimeStr = currentTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                                String errorMessage = String.format("Chi nhánh '%s' hiện đang ngoài giờ làm việc. Giờ làm việc: %s - %s. Giờ hiện tại: %s. Vui lòng đặt hàng trong giờ làm việc hoặc chọn chi nhánh khác.", 
                                        branchName, openHoursStr, endHoursStr, currentTimeStr);
                                log.warn("Order creation rejected: {}", errorMessage);
                                throw new AppException(ErrorCode.POS_ORDER_OUTSIDE_BUSINESS_HOURS, errorMessage);
                        }
                }
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
                                
                                // Kiểm tra khoảng cách tối đa khi tự động chọn chi nhánh
                                selectedBranch = branchSelectionService.findNearestBranchWithinDistance(
                                                addressForBranchSelection, maxDeliveryDistanceKm);
                                if (selectedBranch == null) {
                                        String errorMessage = String.format("Không tìm thấy chi nhánh nào trong phạm vi %s km từ địa chỉ '%s'. Vui lòng chọn địa chỉ giao hàng gần hơn hoặc liên hệ hỗ trợ.", 
                                                maxDeliveryDistanceKm, addressForBranchSelection);
                                        log.warn("Guest order creation rejected: {}", errorMessage);
                                        throw new AppException(ErrorCode.DELIVERY_DISTANCE_TOO_FAR, errorMessage);
                                }
                                log.info("Auto-selected branch: {} for guest order address: {} (within {} km)", 
                                        selectedBranch.getName(), addressForBranchSelection, maxDeliveryDistanceKm);
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

                        // Validate branch với thông tin chi tiết
                        validateBranchForOrder(selectedBranch, orderType);

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
                                        // Note: useDiscount() will be called AFTER order is successfully created
                                } else {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        discountResponse.getMessage());
                                }
                        } else {
                                discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                        }

                        // Compute subtotal after discount
                        BigDecimal afterDiscount = subtotal.subtract(discount);
                        // Ensure afterDiscount is not negative
                        if (afterDiscount.compareTo(BigDecimal.ZERO) < 0) {
                                afterDiscount = BigDecimal.ZERO;
                        }

                        // Compute VAT (10%) on subtotal AFTER discount
                        BigDecimal vat = afterDiscount.multiply(new BigDecimal("0.10"));
                        vat = vat.setScale(2, java.math.RoundingMode.HALF_UP);

                        BigDecimal totalAmount = afterDiscount.add(vat);
                        
                        // Validate total amount is not negative
                        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
                                throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                "Total amount cannot be negative. Please check discount amount.");
                        }

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
                        
                        // Use discount AFTER order is successfully created
                        if (request.getDiscountCode() != null && !request.getDiscountCode().trim().isEmpty() && discount.compareTo(BigDecimal.ZERO) > 0) {
                                try {
                                        discountService.useDiscount(request.getDiscountCode());
                                        log.info("Discount {} used for guest order {}", request.getDiscountCode(), order.getOrderId());
                                } catch (Exception e) {
                                        log.error("Failed to use discount {} for guest order {}: {}", 
                                                request.getDiscountCode(), order.getOrderId(), e.getMessage());
                                }
                        }

                        // Create order items
                        for (CreateGuestOrderRequest.OrderItemRequest itemRequest : request.getOrderItems()) {
                                // Validate quantity
                                if (itemRequest.getQuantity() == null || itemRequest.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        "Order item quantity must be greater than 0");
                                }
                                ApiResponse<ProductDetailResponse> productDetailResponse = catalogServiceClient
                                                .getProductDetailById(itemRequest.getProductDetailId());
                                
                                if (productDetailResponse == null || productDetailResponse.getResult() == null) {
                                        throw new AppException(ErrorCode.PRODUCT_NOT_FOUND);
                                }
                                
                                ProductDetailResponse productDetail = productDetailResponse.getResult();
                                
                                // Validate price
                                if (productDetail.getPrice() == null || productDetail.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                                        throw new AppException(ErrorCode.VALIDATION_FAILED,
                                                        "Product price must be greater than 0");
                                }

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
        
        /**
         * Validate order status transition
         */
        private boolean isValidStatusTransition(String currentStatus, String newStatus) {
                if (currentStatus == null || newStatus == null) {
                        return false;
                }
                
                String currentUpper = currentStatus.toUpperCase();
                String newUpper = newStatus.toUpperCase();
                
                // Same status is always valid (idempotent)
                if (currentUpper.equals(newUpper)) {
                        return true;
                }
                
                // Check if transition is allowed
                Set<String> allowedTransitions = VALID_STATUS_TRANSITIONS.get(currentUpper);
                if (allowedTransitions == null) {
                        // Unknown current status
                        return false;
                }
                
                return allowedTransitions.contains(newUpper);
        }

        /**
         * Commit stock reservation for an order (if exists) when moving to READY/PREPARING flow.
         */
        private void commitReservationForOrder(Order order) {
                try {
                        ApiResponse<Map<String, Object>> holdIdResponse = catalogServiceClient.getHoldIdByOrderId(order.getOrderId());
                        if (holdIdResponse == null || holdIdResponse.getResult() == null || holdIdResponse.getResult().get("holdId") == null) {
                                log.info("No reservation linked to order {}. Skip commit.", order.getOrderId());
                                return;
                        }

                        Object holdIdObj = holdIdResponse.getResult().get("holdId");
                        String holdId = holdIdObj.toString();

                        Map<String, Object> request = new HashMap<>();
                        request.put("holdId", holdId);
                        request.put("orderId", order.getOrderId());

                        catalogServiceClient.commitReservation(request);
                        log.info("Committed reservation for order {} with holdId {}", order.getOrderId(), holdId);
                } catch (FeignException.NotFound e) {
                        log.info("No reservation found for order {} during commit. Nothing to do.", order.getOrderId());
                } catch (Exception e) {
                        log.error("Failed to commit reservation for order {}: {}", order.getOrderId(), e.getMessage(), e);
                        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                                        "Failed to commit reservation. Please try again later.");
                }
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
