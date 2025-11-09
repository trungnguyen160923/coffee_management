package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.response.InventoryMetricsResponse;
import com.service.catalog.dto.response.MaterialCostMetricsResponse;
import com.service.catalog.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics/metrics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * GET /api/analytics/metrics/inventory
     * Lấy thông tin tồn kho cho một chi nhánh vào một ngày cụ thể
     * Endpoint này được AI Service gọi, không cần authentication
     */
    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<InventoryMetricsResponse>> getInventoryMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            InventoryMetricsResponse metrics = analyticsService.getInventoryMetrics(branchId, date);
            ApiResponse<InventoryMetricsResponse> response = ApiResponse.<InventoryMetricsResponse>builder()
                    .code(200)
                    .message("Inventory metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving inventory metrics", e);
            ApiResponse<InventoryMetricsResponse> response = ApiResponse.<InventoryMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve inventory metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * GET /api/analytics/metrics/material-cost
     * Lấy thông tin chi phí nguyên liệu cho một chi nhánh trong khoảng thời gian
     * Endpoint này được AI Service gọi, không cần authentication
     */
    @GetMapping("/material-cost")
    public ResponseEntity<ApiResponse<MaterialCostMetricsResponse>> getMaterialCostMetrics(
            @RequestParam Integer branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            MaterialCostMetricsResponse metrics = analyticsService.getMaterialCostMetrics(
                    branchId, startDate, endDate);
            ApiResponse<MaterialCostMetricsResponse> response = ApiResponse.<MaterialCostMetricsResponse>builder()
                    .code(200)
                    .message("Material cost metrics retrieved successfully")
                    .result(metrics)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving material cost metrics", e);
            ApiResponse<MaterialCostMetricsResponse> response = ApiResponse.<MaterialCostMetricsResponse>builder()
                    .code(500)
                    .message("Failed to retrieve material cost metrics: " + e.getMessage())
                    .result(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

