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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    private static class ProductSalesStats {
        BigDecimal quantity;
        BigDecimal revenue;

        ProductSalesStats(BigDecimal quantity, BigDecimal revenue) {
            this.quantity = quantity;
            this.revenue = revenue;
        }
    }
}

