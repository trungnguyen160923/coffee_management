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
@RequestMapping("/api/analytics/metrics")
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
}

