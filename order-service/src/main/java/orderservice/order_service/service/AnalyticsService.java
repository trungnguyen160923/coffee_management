package orderservice.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.client.CatalogServiceClient;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.response.*;
import orderservice.order_service.entity.Order;
import orderservice.order_service.entity.OrderItem;
import orderservice.order_service.entity.Review;
import orderservice.order_service.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class AnalyticsService {

    OrderRepository orderRepository;
    OrderItemRepository orderItemRepository;
    ReviewRepository reviewRepository;
    CatalogServiceClient catalogServiceClient;

    public RevenueMetricsResponse getRevenueMetrics(Integer branchId, LocalDate date) {
        try {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

            List<Order> orders = orderRepository.findByBranchIdAndDateRange(branchId, startOfDay, endOfDay);

            // Get hours directly from database to avoid timezone conversion issues
            List<Object[]> orderHoursData = orderRepository.findOrderHoursByBranchAndDate(branchId, date);
            
            // Create maps for hour-based calculations using database hours
            Map<Integer, Integer> ordersByHour = new HashMap<>();
            Map<Integer, BigDecimal> revenueByHourMap = new HashMap<>();
            BigDecimal totalRevenue = BigDecimal.ZERO;
            int completedPaidOrderCount = 0; // Count only completed and paid orders for avgOrderValue
            
            for (Object[] row : orderHoursData) {
                Integer hour = ((Number) row[0]).intValue();
                BigDecimal totalAmount = (BigDecimal) row[1];
                String status = (String) row[2];
                String paymentStatus = (String) row[3];
                
                // Count orders by hour
                ordersByHour.put(hour, ordersByHour.getOrDefault(hour, 0) + 1);
                
                // Calculate revenue for completed and paid orders
                if ("COMPLETED".equals(status) && "PAID".equals(paymentStatus)) {
                    revenueByHourMap.put(hour, revenueByHourMap.getOrDefault(hour, BigDecimal.ZERO).add(totalAmount));
                    totalRevenue = totalRevenue.add(totalAmount);
                    completedPaidOrderCount++;
                }
            }

            int orderCount = orders.size();
            // Calculate avgOrderValue only on completed and paid orders
            BigDecimal avgOrderValue = completedPaidOrderCount > 0
                    ? totalRevenue.divide(BigDecimal.valueOf(completedPaidOrderCount), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            // Calculate peak hour
            int peakHour = ordersByHour.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(0);

            // Build revenue by hour list - only include hours with data
            List<RevenueMetricsResponse.HourlyRevenue> revenueByHour = new ArrayList<>();
            // Get all hours that have either revenue or orders
            Set<Integer> hoursWithData = new HashSet<>();
            hoursWithData.addAll(ordersByHour.keySet());
            hoursWithData.addAll(revenueByHourMap.keySet());
            
            // Sort hours and add only those with data
            hoursWithData.stream()
                    .sorted()
                    .forEach(hour -> {
                        BigDecimal revenue = revenueByHourMap.getOrDefault(hour, BigDecimal.ZERO);
                        int count = ordersByHour.getOrDefault(hour, 0);
                        // Only add if there's revenue or orders
                        if (revenue.compareTo(BigDecimal.ZERO) > 0 || count > 0) {
                            revenueByHour.add(RevenueMetricsResponse.HourlyRevenue.builder()
                                    .hour(hour)
                                    .revenue(revenue)
                                    .orderCount(count)
                                    .build());
                        }
                    });
            
            // Filter completed and paid orders for payment method calculation
            List<Order> completedOrders = orders.stream()
                    .filter(o -> "COMPLETED".equals(o.getStatus()) && "PAID".equals(o.getPaymentStatus()))
                    .collect(Collectors.toList());

            // Revenue by payment method
            Map<String, BigDecimal> revenueByPaymentMethod = completedOrders.stream()
                    .filter(o -> o.getPaymentMethod() != null)
                    .collect(Collectors.groupingBy(
                            Order::getPaymentMethod,
                            Collectors.mapping(
                                    Order::getTotalAmount,
                                    Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                            )
                    ));

            // Order status counts
            long completedCount = orders.stream().filter(o -> "COMPLETED".equals(o.getStatus())).count();
            long cancelledCount = orders.stream().filter(o -> "CANCELLED".equals(o.getStatus())).count();
            long pendingCount = orders.stream().filter(o -> "PENDING".equals(o.getStatus()) || "CREATED".equals(o.getStatus())).count();

            return RevenueMetricsResponse.builder()
                    .totalRevenue(totalRevenue)
                    .orderCount(orderCount)
                    .avgOrderValue(avgOrderValue)
                    .peakHour(peakHour)
                    .revenueByHour(revenueByHour)
                    .revenueByPaymentMethod(revenueByPaymentMethod)
                    .completedOrders((int) completedCount)
                    .cancelledOrders((int) cancelledCount)
                    .pendingOrders((int) pendingCount)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating revenue metrics for branch {} on date {}", branchId, date, e);
            return RevenueMetricsResponse.builder()
                    .totalRevenue(BigDecimal.ZERO)
                    .orderCount(0)
                    .avgOrderValue(BigDecimal.ZERO)
                    .peakHour(0)
                    .revenueByHour(new ArrayList<>())
                    .revenueByPaymentMethod(new HashMap<>())
                    .completedOrders(0)
                    .cancelledOrders(0)
                    .pendingOrders(0)
                    .build();
        }
    }

    public CustomerMetricsResponse getCustomerMetrics(Integer branchId, LocalDate date) {
        try {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

            List<Order> orders = orderRepository.findByBranchIdAndDateRange(branchId, startOfDay, endOfDay);

            // Get unique registered customers (ID != 0)
            Set<Integer> registeredCustomerIds = orders.stream()
                    .filter(o -> o.getCustomerId() != null && o.getCustomerId() != 0)
                    .map(Order::getCustomerId)
                    .collect(Collectors.toSet());

            // Count walk-in customers (ID=0) - each order counts as 1
            long walkInOrderCount = orders.stream()
                    .filter(o -> o.getCustomerId() != null && o.getCustomerId() == 0)
                    .count();

            // customerCount = registered customers + walk-in orders (each walk-in order counts)
            int customerCount = registeredCustomerIds.size() + (int) walkInOrderCount;
            
            // Get unique registered customers with completed and paid orders
            Set<Integer> registeredUniqueCustomerIds = orders.stream()
                    .filter(o -> o.getCustomerId() != null 
                            && o.getCustomerId() != 0
                            && "COMPLETED".equals(o.getStatus()) 
                            && "PAID".equals(o.getPaymentStatus()))
                    .map(Order::getCustomerId)
                    .collect(Collectors.toSet());
            
            // Count walk-in orders with completed and paid status
            long walkInCompletedPaidCount = orders.stream()
                    .filter(o -> o.getCustomerId() != null 
                            && o.getCustomerId() == 0
                            && "COMPLETED".equals(o.getStatus()) 
                            && "PAID".equals(o.getPaymentStatus()))
                    .count();
            
            // uniqueCustomers = registered customers with completed+paid + walk-in completed+paid orders
            int uniqueCustomers = registeredUniqueCustomerIds.size() + (int) walkInCompletedPaidCount;

            // Get registered customers who ordered before this date (repeat customers)
            // Use startOfDay (not minusDays) to include all orders before the current date
            List<Order> previousOrders = orderRepository.findByBranchIdAndDateRange(branchId,
                    LocalDateTime.of(2020, 1, 1, 0, 0), startOfDay);

            Set<Integer> previousRegisteredCustomerIds = previousOrders.stream()
                    .filter(o -> o.getCustomerId() != null && o.getCustomerId() != 0)
                    .map(Order::getCustomerId)
                    .collect(Collectors.toSet());

            // repeatCustomers: only registered customers (exclude walk-in ID=0)
            Set<Integer> repeatCustomerIds = registeredCustomerIds.stream()
                    .filter(previousRegisteredCustomerIds::contains)
                    .collect(Collectors.toSet());

            int repeatCustomers = repeatCustomerIds.size();
            // newCustomers: only registered customers (exclude walk-in ID=0)
            int newCustomers = registeredCustomerIds.size() - repeatCustomers;

            // Calculate retention rate (only for registered customers)
            BigDecimal retentionRate = previousRegisteredCustomerIds.size() > 0
                    ? BigDecimal.valueOf(repeatCustomers)
                            .divide(BigDecimal.valueOf(previousRegisteredCustomerIds.size()), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            // Top customers
            Map<Integer, CustomerOrderStats> customerStats = orders.stream()
                    .filter(o -> o.getCustomerId() != null)
                    .collect(Collectors.groupingBy(
                            Order::getCustomerId,
                            Collectors.collectingAndThen(
                                    Collectors.toList(),
                                    orderList -> {
                                        int count = orderList.size();
                                        BigDecimal total = orderList.stream()
                                                .map(Order::getTotalAmount)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        String name = orderList.get(0).getCustomerName();
                                        return new CustomerOrderStats(count, total, name);
                                    }
                            )
                    ));

            List<CustomerMetricsResponse.TopCustomer> topCustomers = customerStats.entrySet().stream()
                    .sorted((e1, e2) -> e2.getValue().total.compareTo(e1.getValue().total))
                    .limit(10)
                    .map(entry -> CustomerMetricsResponse.TopCustomer.builder()
                            .customerId(entry.getKey())
                            .customerName(entry.getValue().name)
                            .orderCount(entry.getValue().count)
                            .totalSpent(entry.getValue().total)
                            .build())
                    .collect(Collectors.toList());

            return CustomerMetricsResponse.builder()
                    .customerCount(customerCount)
                    .repeatCustomers(repeatCustomers)
                    .newCustomers(newCustomers)
                    .uniqueCustomers(uniqueCustomers)
                    .customerRetentionRate(retentionRate)
                    .topCustomers(topCustomers)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating customer metrics for branch {} on date {}", branchId, date, e);
            return CustomerMetricsResponse.builder()
                    .customerCount(0)
                    .repeatCustomers(0)
                    .newCustomers(0)
                    .uniqueCustomers(0)
                    .customerRetentionRate(BigDecimal.ZERO)
                    .topCustomers(new ArrayList<>())
                    .build();
        }
    }

    public ProductMetricsResponse getProductMetrics(Integer branchId, LocalDate date) {
        try {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

            List<Order> orders = orderRepository.findByBranchIdAndDateRange(branchId, startOfDay, endOfDay);
            List<Integer> orderIds = orders.stream().map(Order::getOrderId).collect(Collectors.toList());

            if (orderIds.isEmpty()) {
                return ProductMetricsResponse.builder()
                        .uniqueProductsSold(0)
                        .topSellingProductId(null)
                        .topSellingProductName(null)
                        .productDiversityScore(BigDecimal.ZERO)
                        .topProducts(new ArrayList<>())
                        .productsByCategory(new HashMap<>())
                        .build();
            }

            List<OrderItem> orderItems = orderItemRepository.findAll().stream()
                    .filter(item -> orderIds.contains(item.getOrder().getOrderId()))
                    .collect(Collectors.toList());

            // Unique products
            Set<Integer> uniqueProductIds = orderItems.stream()
                    .map(OrderItem::getProductId)
                    .collect(Collectors.toSet());

            int uniqueProductsSold = uniqueProductIds.size();

            // Product sales statistics
            Map<Integer, ProductSalesStats> productStats = orderItems.stream()
                    .collect(Collectors.groupingBy(
                            OrderItem::getProductId,
                            Collectors.collectingAndThen(
                                    Collectors.toList(),
                                    itemList -> {
                                        BigDecimal quantity = itemList.stream()
                                                .map(OrderItem::getQuantity)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        BigDecimal revenue = itemList.stream()
                                                .map(OrderItem::getTotalPrice)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        return new ProductSalesStats(quantity, revenue);
                                    }
                            )
                    ));

            // Get product information from catalog service
            Map<Integer, ProductResponse> productMap = new HashMap<>();
            try {
                ApiResponse<List<ProductResponse>> allProductsResponse = catalogServiceClient.getAllProducts();
                if (allProductsResponse != null && allProductsResponse.getResult() != null) {
                    Map<Integer, ProductResponse> fetchedProducts = allProductsResponse.getResult().stream()
                            .collect(Collectors.toMap(ProductResponse::getProductId, p -> p));
                    productMap.putAll(fetchedProducts);
                }
            } catch (Exception e) {
                log.warn("Failed to fetch products from catalog service: {}", e.getMessage());
            }
            final Map<Integer, ProductResponse> finalProductMap = productMap;

            // Top selling product
            Map.Entry<Integer, ProductSalesStats> topProduct = productStats.entrySet().stream()
                    .max(Comparator.comparing(e -> e.getValue().quantity))
                    .orElse(null);

            Integer topSellingProductId = topProduct != null ? topProduct.getKey() : null;
            String topSellingProductName = null;
            if (topSellingProductId != null && finalProductMap.containsKey(topSellingProductId)) {
                ProductResponse product = finalProductMap.get(topSellingProductId);
                topSellingProductName = product != null ? product.getName() : null;
            }

            // Product diversity score (simplified: unique products / total items)
            BigDecimal totalItems = orderItems.stream()
                    .map(OrderItem::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal diversityScore = totalItems.compareTo(BigDecimal.ZERO) > 0
                    ? BigDecimal.valueOf(uniqueProductsSold)
                            .divide(totalItems, 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            // Top products
            List<ProductMetricsResponse.TopProduct> topProducts = productStats.entrySet().stream()
                    .sorted((e1, e2) -> e2.getValue().quantity.compareTo(e1.getValue().quantity))
                    .limit(10)
                    .map(entry -> {
                        String productName = null;
                        if (finalProductMap.containsKey(entry.getKey())) {
                            ProductResponse product = finalProductMap.get(entry.getKey());
                            productName = product != null ? product.getName() : null;
                        }
                        return ProductMetricsResponse.TopProduct.builder()
                                .productId(entry.getKey())
                                .productName(productName)
                                .quantitySold(entry.getValue().quantity)
                                .revenue(entry.getValue().revenue)
                                .build();
                    })
                    .collect(Collectors.toList());

            // Products by category
            Map<String, Integer> productsByCategory = new HashMap<>();
            for (Integer productId : uniqueProductIds) {
                if (finalProductMap.containsKey(productId)) {
                    ProductResponse product = finalProductMap.get(productId);
                    if (product != null && product.getCategory() != null && product.getCategory().getName() != null) {
                        String categoryName = product.getCategory().getName();
                        productsByCategory.put(categoryName, productsByCategory.getOrDefault(categoryName, 0) + 1);
                    }
                }
            }

            return ProductMetricsResponse.builder()
                    .uniqueProductsSold(uniqueProductsSold)
                    .topSellingProductId(topSellingProductId)
                    .topSellingProductName(topSellingProductName)
                    .productDiversityScore(diversityScore)
                    .topProducts(topProducts)
                    .productsByCategory(productsByCategory)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating product metrics for branch {} on date {}", branchId, date, e);
            return ProductMetricsResponse.builder()
                    .uniqueProductsSold(0)
                    .topSellingProductId(null)
                    .topSellingProductName(null)
                    .productDiversityScore(BigDecimal.ZERO)
                    .topProducts(new ArrayList<>())
                    .productsByCategory(new HashMap<>())
                    .build();
        }
    }

    public ReviewMetricsResponse getReviewMetrics(Integer branchId, LocalDate date) {
        try {
            // Get reviews for the branch on this date using optimized query
            List<Review> reviews = reviewRepository.findByBranchIdAndDate(branchId, date);

            if (reviews.isEmpty()) {
                return ReviewMetricsResponse.builder()
                        .avgReviewScore(BigDecimal.ZERO)
                        .totalReviews(0)
                        .reviewDistribution(new HashMap<>())
                        .positiveReviews(0)
                        .negativeReviews(0)
                        .reviewRate(BigDecimal.ZERO)
                        .recentReviews(new ArrayList<>())
                        .build();
            }

            // Average review score
            double avgScore = reviews.stream()
                    .mapToInt(r -> r.getRating().intValue())
                    .average()
                    .orElse(0.0);

            BigDecimal avgReviewScore = BigDecimal.valueOf(avgScore).setScale(2, RoundingMode.HALF_UP);

            int totalReviews = reviews.size();

            // Review distribution
            Map<Integer, Integer> distribution = reviews.stream()
                    .collect(Collectors.groupingBy(
                            r -> r.getRating().intValue(),
                            Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                    ));

            // Positive (>=4) and negative (<3) reviews
            long positiveReviews = reviews.stream().filter(r -> r.getRating() >= 4).count();
            long negativeReviews = reviews.stream().filter(r -> r.getRating() < 3).count();

            // Review rate (reviews / orders)
            long orderCount = orderRepository.countOrdersByBranchAndDate(branchId, date);
            BigDecimal reviewRate = orderCount > 0
                    ? BigDecimal.valueOf(totalReviews)
                            .divide(BigDecimal.valueOf(orderCount), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            // Recent reviews
            List<ReviewMetricsResponse.RecentReview> recentReviews = reviews.stream()
                    .sorted(Comparator.comparing(Review::getCreateAt).reversed())
                    .limit(10)
                    .map(r -> ReviewMetricsResponse.RecentReview.builder()
                            .reviewId(r.getReviewId())
                            .customerId(r.getCustomerId())
                            .rating(r.getRating())
                            .comment(r.getComment())
                            .createdAt(r.getCreateAt())
                            .build())
                    .collect(Collectors.toList());

            return ReviewMetricsResponse.builder()
                    .avgReviewScore(avgReviewScore)
                    .totalReviews(totalReviews)
                    .reviewDistribution(distribution)
                    .positiveReviews((int) positiveReviews)
                    .negativeReviews((int) negativeReviews)
                    .reviewRate(reviewRate)
                    .recentReviews(recentReviews)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating review metrics for branch {} on date {}", branchId, date, e);
            return ReviewMetricsResponse.builder()
                    .avgReviewScore(BigDecimal.ZERO)
                    .totalReviews(0)
                    .reviewDistribution(new HashMap<>())
                    .positiveReviews(0)
                    .negativeReviews(0)
                    .reviewRate(BigDecimal.ZERO)
                    .recentReviews(new ArrayList<>())
                    .build();
        }
    }

    /**
     * Lấy thống kê đơn hàng và doanh thu theo ngày của chi nhánh
     */
    public BranchDailyStatsResponse getBranchDailyStats(Integer branchId, LocalDate date) {
        try {
            log.info("Getting daily stats for branch {} on date {}", branchId, date);
            
            // 1. Tổng số đơn hàng trong ngày (chỉ tính các đơn có status = 'COMPLETED')
            Long totalOrders = orderRepository.countOrdersByBranchAndDate(branchId, date);
            
            // 2. Tổng doanh thu trong ngày (chỉ tính các đơn có status = 'COMPLETED')
            BigDecimal totalRevenue = orderRepository.getTotalRevenueByBranchAndDate(branchId, date);
            if (totalRevenue == null) {
                totalRevenue = BigDecimal.ZERO;
            }
            
            // 3. Danh sách số đơn hàng theo giờ
            List<Object[]> hourlyData = orderRepository.countOrdersByHourAndBranchAndDate(branchId, date);
            
            // Tạo map để dễ lookup
            Map<Integer, Long> hourlyOrderCountMap = new HashMap<>();
            for (Object[] row : hourlyData) {
                Integer hour = ((Number) row[0]).intValue();
                Long count = ((Number) row[1]).longValue();
                hourlyOrderCountMap.put(hour, count);
            }
            
            // Tạo danh sách đầy đủ 24 giờ (0-23), nếu không có dữ liệu thì = 0
            List<BranchDailyStatsResponse.HourlyOrderCount> hourlyOrderCounts = new ArrayList<>();
            for (int hour = 0; hour < 24; hour++) {
                Long count = hourlyOrderCountMap.getOrDefault(hour, 0L);
                hourlyOrderCounts.add(BranchDailyStatsResponse.HourlyOrderCount.builder()
                        .hour(hour)
                        .orderCount(count)
                        .build());
            }
            
            return BranchDailyStatsResponse.builder()
                    .branchId(branchId)
                    .date(date.toString())
                    .totalOrders(totalOrders)
                    .totalRevenue(totalRevenue)
                    .hourlyOrderCounts(hourlyOrderCounts)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error getting daily stats for branch {} on date {}", branchId, date, e);
            return BranchDailyStatsResponse.builder()
                    .branchId(branchId)
                    .date(date.toString())
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .hourlyOrderCounts(new ArrayList<>())
                    .build();
        }
    }
    
    /**
     * Lấy doanh thu theo tuần hiện tại của chi nhánh
     */
    public BranchWeeklyRevenueResponse getBranchWeeklyRevenue(Integer branchId) {
        try {
            log.info("Getting weekly revenue for branch {}", branchId);
            
            // Tính toán tuần hiện tại (từ thứ 2 đến chủ nhật) - theo giờ Việt Nam
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6); // Chủ nhật
            
            // Convert từ giờ Việt Nam sang UTC để query (trừ 7 giờ)
            LocalDateTime startDateTime = weekStart.atStartOfDay().minusHours(7);
            LocalDateTime endDateTime = weekEnd.atTime(LocalTime.MAX).plusSeconds(1).minusHours(7); // Bao gồm cả ngày cuối
            
            // Lấy doanh thu theo ngày trong tuần (query sẽ convert lại sang giờ Việt Nam)
            List<Object[]> dailyRevenueData = orderRepository.getDailyRevenueByBranchAndDateRange(
                    branchId, startDateTime, endDateTime);
            
            // Tạo map để dễ lookup
            Map<LocalDate, DailyRevenueData> dailyRevenueMap = new HashMap<>();
            for (Object[] row : dailyRevenueData) {
                LocalDate date;
                if (row[0] instanceof java.sql.Date) {
                    date = ((java.sql.Date) row[0]).toLocalDate();
                } else if (row[0] instanceof java.time.LocalDate) {
                    date = (LocalDate) row[0];
                } else {
                    // Fallback: parse từ string hoặc timestamp
                    date = LocalDate.parse(row[0].toString());
                }
                BigDecimal revenue = (BigDecimal) row[1];
                if (revenue == null) {
                    revenue = BigDecimal.ZERO;
                }
                Long orderCount = ((Number) row[2]).longValue();
                dailyRevenueMap.put(date, new DailyRevenueData(revenue, orderCount));
            }
            
            // Tạo danh sách đầy đủ 7 ngày trong tuần
            List<BranchWeeklyRevenueResponse.DailyRevenue> dailyRevenues = new ArrayList<>();
            BigDecimal totalRevenue = BigDecimal.ZERO;
            Long totalOrders = 0L;
            
            for (int i = 0; i < 7; i++) {
                LocalDate currentDate = weekStart.plusDays(i);
                DailyRevenueData data = dailyRevenueMap.getOrDefault(currentDate, 
                        new DailyRevenueData(BigDecimal.ZERO, 0L));
                
                DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
                String dayName = dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                
                dailyRevenues.add(BranchWeeklyRevenueResponse.DailyRevenue.builder()
                        .date(currentDate.toString())
                        .dayOfWeek(dayName)
                        .revenue(data.revenue)
                        .orderCount(data.orderCount)
                        .build());
                
                totalRevenue = totalRevenue.add(data.revenue);
                totalOrders += data.orderCount;
            }
            
            return BranchWeeklyRevenueResponse.builder()
                    .branchId(branchId)
                    .weekStartDate(weekStart.toString())
                    .weekEndDate(weekEnd.toString())
                    .totalRevenue(totalRevenue)
                    .totalOrders(totalOrders)
                    .dailyRevenues(dailyRevenues)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error getting weekly revenue for branch {}", branchId, e);
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            
            return BranchWeeklyRevenueResponse.builder()
                    .branchId(branchId)
                    .weekStartDate(weekStart.toString())
                    .weekEndDate(weekEnd.toString())
                    .totalRevenue(BigDecimal.ZERO)
                    .totalOrders(0L)
                    .dailyRevenues(new ArrayList<>())
                    .build();
        }
    }
    
    // Helper classes
    private static class CustomerOrderStats {
        int count;
        BigDecimal total;
        String name;

        CustomerOrderStats(int count, BigDecimal total, String name) {
            this.count = count;
            this.total = total;
            this.name = name;
        }
    }

    /**
     * Get top selling products
     * 
     * @param branchId Optional branch ID filter (null = all branches)
     * @param startDate Optional start date filter (null = no start limit)
     * @param endDate Optional end date filter (null = no end limit)
     * @param limit Number of top products to return (default: 10)
     * @param sortBy Sort by "quantity" or "revenue" (default: "quantity")
     * @return TopSellingProductsResponse
     */
    public TopSellingProductsResponse getTopSellingProducts(
            Integer branchId,
            LocalDate startDate,
            LocalDate endDate,
            Integer limit,
            String sortBy) {
        try {
            // Set defaults
            if (limit == null || limit <= 0) {
                limit = 10;
            }
            if (sortBy == null || sortBy.isEmpty()) {
                sortBy = "quantity";
            }

            // Build date range
            LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
            LocalDateTime endDateTime = endDate != null ? endDate.atTime(LocalTime.MAX) : null;

            // Query orders - only COMPLETED orders
            List<Order> orders;
            if (branchId != null && startDateTime != null && endDateTime != null) {
                orders = orderRepository.findByBranchIdAndDateRange(branchId, startDateTime, endDateTime);
            } else if (branchId != null) {
                orders = orderRepository.findByBranchIdOrderByOrderDateDesc(branchId);
            } else if (startDateTime != null && endDateTime != null) {
                // Query all branches within date range
                orders = orderRepository.findAll().stream()
                        .filter(o -> o.getCreateAt() != null 
                                && o.getCreateAt().isAfter(startDateTime.minusSeconds(1))
                                && o.getCreateAt().isBefore(endDateTime.plusSeconds(1)))
                        .collect(Collectors.toList());
            } else {
                orders = orderRepository.findAll();
            }

            // Filter only COMPLETED orders
            List<Order> completedOrders = orders.stream()
                    .filter(o -> "COMPLETED".equals(o.getStatus()))
                    .collect(Collectors.toList());

            if (completedOrders.isEmpty()) {
                return TopSellingProductsResponse.builder()
                        .branchId(branchId)
                        .startDate(startDate)
                        .endDate(endDate)
                        .totalProducts(0)
                        .topProducts(new ArrayList<>())
                        .build();
            }

            List<Integer> orderIds = completedOrders.stream()
                    .map(Order::getOrderId)
                    .collect(Collectors.toList());

            // Get all order items for these orders
            List<OrderItem> orderItems = orderItemRepository.findAll().stream()
                    .filter(item -> orderIds.contains(item.getOrder().getOrderId()))
                    .collect(Collectors.toList());

            // Group by productId and calculate stats
            Map<Integer, ProductSalesStatsWithOrders> productStats = orderItems.stream()
                    .collect(Collectors.groupingBy(
                            OrderItem::getProductId,
                            Collectors.collectingAndThen(
                                    Collectors.toList(),
                                    itemList -> {
                                        BigDecimal quantity = itemList.stream()
                                                .map(OrderItem::getQuantity)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        BigDecimal revenue = itemList.stream()
                                                .map(OrderItem::getTotalPrice)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        // Count unique orders containing this product
                                        Set<Integer> uniqueOrderIds = itemList.stream()
                                                .map(item -> item.getOrder().getOrderId())
                                                .collect(Collectors.toSet());
                                        int orderCount = uniqueOrderIds.size();
                                        BigDecimal avgOrderValue = orderCount > 0
                                                ? revenue.divide(BigDecimal.valueOf(orderCount), 2, RoundingMode.HALF_UP)
                                                : BigDecimal.ZERO;
                                        return new ProductSalesStatsWithOrders(quantity, revenue, orderCount, avgOrderValue);
                                    }
                            )
                    ));

            // Get product information from catalog service
            Map<Integer, ProductResponse> productMap = new HashMap<>();
            try {
                ApiResponse<List<ProductResponse>> allProductsResponse = catalogServiceClient.getAllProducts();
                if (allProductsResponse != null && allProductsResponse.getResult() != null) {
                    Map<Integer, ProductResponse> fetchedProducts = allProductsResponse.getResult().stream()
                            .collect(Collectors.toMap(ProductResponse::getProductId, p -> p));
                    productMap.putAll(fetchedProducts);
                }
            } catch (Exception e) {
                log.warn("Failed to fetch products from catalog service: {}", e.getMessage());
            }
            final Map<Integer, ProductResponse> finalProductMap = productMap;

            // Sort and limit
            Comparator<Map.Entry<Integer, ProductSalesStatsWithOrders>> comparator;
            if ("revenue".equalsIgnoreCase(sortBy)) {
                comparator = Comparator.comparing(e -> e.getValue().revenue);
            } else {
                comparator = Comparator.comparing(e -> e.getValue().quantity);
            }

            List<TopSellingProductsResponse.TopSellingProduct> topProducts = productStats.entrySet().stream()
                    .sorted(comparator.reversed())
                    .limit(limit)
                    .map(entry -> {
                        Integer productId = entry.getKey();
                        ProductSalesStatsWithOrders stats = entry.getValue();
                        ProductResponse product = finalProductMap.get(productId);
                        
                        return TopSellingProductsResponse.TopSellingProduct.builder()
                                .productId(productId)
                                .productName(product != null ? product.getName() : "Unknown Product")
                                .categoryName(product != null && product.getCategory() != null 
                                        ? product.getCategory().getName() : null)
                                .totalQuantitySold(stats.quantity)
                                .totalRevenue(stats.revenue)
                                .orderCount(stats.orderCount)
                                .avgOrderValue(stats.avgOrderValue)
                                .rank(0) // Will be set below
                                .build();
                    })
                    .collect(Collectors.toList());

            // Set ranks
            for (int i = 0; i < topProducts.size(); i++) {
                topProducts.get(i).setRank(i + 1);
            }

            return TopSellingProductsResponse.builder()
                    .branchId(branchId)
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalProducts(productStats.size())
                    .topProducts(topProducts)
                    .build();

        } catch (Exception e) {
            log.error("Error getting top selling products for branch {} from {} to {}", 
                    branchId, startDate, endDate, e);
            return TopSellingProductsResponse.builder()
                    .branchId(branchId)
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalProducts(0)
                    .topProducts(new ArrayList<>())
                    .build();
        }
    }

    private static class ProductSalesStats {
        BigDecimal quantity;
        BigDecimal revenue;

        ProductSalesStats(BigDecimal quantity, BigDecimal revenue) {
            this.quantity = quantity;
            this.revenue = revenue;
        }
    }

    private static class ProductSalesStatsWithOrders {
        BigDecimal quantity;
        BigDecimal revenue;
        int orderCount;
        BigDecimal avgOrderValue;

        ProductSalesStatsWithOrders(BigDecimal quantity, BigDecimal revenue, int orderCount, BigDecimal avgOrderValue) {
            this.quantity = quantity;
            this.revenue = revenue;
            this.orderCount = orderCount;
            this.avgOrderValue = avgOrderValue;
        }
    }
    
    private static class DailyRevenueData {
        BigDecimal revenue;
        Long orderCount;
        
        DailyRevenueData(BigDecimal revenue, Long orderCount) {
            this.revenue = revenue;
            this.orderCount = orderCount;
        }
    }
}

