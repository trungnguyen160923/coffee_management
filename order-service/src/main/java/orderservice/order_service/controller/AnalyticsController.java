package orderservice.order_service.controller;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import orderservice.order_service.dto.ApiResponse;
import orderservice.order_service.dto.response.*;
import orderservice.order_service.service.AnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/analytics/metrics")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AnalyticsController {

    AnalyticsService analyticsService;

    // Analytics endpoints - require ADMIN or MANAGER role
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueMetricsResponse>> getRevenueMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            RevenueMetricsResponse metrics = analyticsService.getRevenueMetrics(branchId, date);
            ApiResponse<RevenueMetricsResponse> response = ApiResponse.<RevenueMetricsResponse>builder()
                    .code(200)
                    .message("Revenue metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving revenue metrics", e);
            ApiResponse<RevenueMetricsResponse> response = ApiResponse.<RevenueMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve revenue metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<CustomerMetricsResponse>> getCustomerMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            CustomerMetricsResponse metrics = analyticsService.getCustomerMetrics(branchId, date);
            ApiResponse<CustomerMetricsResponse> response = ApiResponse.<CustomerMetricsResponse>builder()
                    .code(200)
                    .message("Customer metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving customer metrics", e);
            ApiResponse<CustomerMetricsResponse> response = ApiResponse.<CustomerMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve customer metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<ProductMetricsResponse>> getProductMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            ProductMetricsResponse metrics = analyticsService.getProductMetrics(branchId, date);
            ApiResponse<ProductMetricsResponse> response = ApiResponse.<ProductMetricsResponse>builder()
                    .code(200)
                    .message("Product metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving product metrics", e);
            ApiResponse<ProductMetricsResponse> response = ApiResponse.<ProductMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve product metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<ReviewMetricsResponse>> getReviewMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            ReviewMetricsResponse metrics = analyticsService.getReviewMetrics(branchId, date);
            ApiResponse<ReviewMetricsResponse> response = ApiResponse.<ReviewMetricsResponse>builder()
                    .code(200)
                    .message("Review metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving review metrics", e);
            ApiResponse<ReviewMetricsResponse> response = ApiResponse.<ReviewMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve review metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * GET /api/analytics/metrics/daily-stats
     * Lấy thống kê đơn hàng và doanh thu theo ngày của chi nhánh
     * Bao gồm: số đơn hàng, tổng doanh thu, danh sách số đơn hàng theo giờ
     */
    @GetMapping("/daily-stats")
    public ResponseEntity<ApiResponse<BranchDailyStatsResponse>> getBranchDailyStats(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            BranchDailyStatsResponse stats = analyticsService.getBranchDailyStats(branchId, date);
            ApiResponse<BranchDailyStatsResponse> response = ApiResponse.<BranchDailyStatsResponse>builder()
                    .code(200)
                    .message("Daily stats retrieved successfully")
                    .result(stats)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving daily stats", e);
            ApiResponse<BranchDailyStatsResponse> response = ApiResponse.<BranchDailyStatsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve daily stats: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * GET /api/analytics/metrics/weekly-revenue
     * Lấy doanh thu theo tuần hiện tại của chi nhánh
     * Tuần được tính từ thứ 2 đến chủ nhật
     */
    @GetMapping("/weekly-revenue")
    public ResponseEntity<ApiResponse<BranchWeeklyRevenueResponse>> getBranchWeeklyRevenue(
            @RequestParam Integer branchId) {
        try {
            BranchWeeklyRevenueResponse revenue = analyticsService.getBranchWeeklyRevenue(branchId);
            ApiResponse<BranchWeeklyRevenueResponse> response = ApiResponse.<BranchWeeklyRevenueResponse>builder()
                    .code(200)
                    .message("Weekly revenue retrieved successfully")
                    .result(revenue)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving weekly revenue", e);
            ApiResponse<BranchWeeklyRevenueResponse> response = ApiResponse.<BranchWeeklyRevenueResponse>builder()
                    .code(500)
                    .message("Failed to retrieve weekly revenue: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * GET /api/analytics/metrics/top-selling-products
     * Lấy danh sách top selling products
     * 
     * @param branchId Optional - Filter theo chi nhánh (null = tất cả chi nhánh)
     * @param startDate Optional - Ngày bắt đầu (null = không giới hạn)
     * @param endDate Optional - Ngày kết thúc (null = không giới hạn)
     * @param limit Optional - Số lượng top products (default: 10)
     * @param sortBy Optional - Sắp xếp theo "quantity" hoặc "revenue" (default: "quantity")
     * @return TopSellingProductsResponse
     */
    @GetMapping("/top-selling-products")
    public ResponseEntity<ApiResponse<TopSellingProductsResponse>> getTopSellingProducts(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @RequestParam(required = false, defaultValue = "quantity") String sortBy) {
        try {
            TopSellingProductsResponse response = analyticsService.getTopSellingProducts(
                    branchId, startDate, endDate, limit, sortBy);
            ApiResponse<TopSellingProductsResponse> apiResponse = ApiResponse.<TopSellingProductsResponse>builder()
                    .code(200)
                    .message("Top selling products retrieved successfully")
                    .result(response)
                    .build();
            return ResponseEntity.ok(apiResponse);
        } catch (Exception e) {
            log.error("Error retrieving top selling products", e);
            ApiResponse<TopSellingProductsResponse> response = ApiResponse.<TopSellingProductsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve top selling products: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

