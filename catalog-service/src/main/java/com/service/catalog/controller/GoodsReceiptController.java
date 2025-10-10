package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.goodsReceipt.CreateGoodsReceiptRequest;
import com.service.catalog.dto.request.goodsReceipt.ValidateUnitConversionRequest;
import com.service.catalog.dto.request.unitConversion.CreateIngredientUnitConversionRequest;
import com.service.catalog.dto.response.GoodsReceiptResponse;
import com.service.catalog.dto.response.IngredientUnitConversionResponse;
import com.service.catalog.dto.response.UnitConversionResponse;
import com.service.catalog.service.GoodsReceiptService;
import com.service.catalog.service.UnitConversionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/goods-receipts")
@RequiredArgsConstructor
@Slf4j
public class GoodsReceiptController {

    private final GoodsReceiptService goodsReceiptService;
    private final UnitConversionService unitConversionService;

    @PostMapping
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<GoodsReceiptResponse> createGoodsReceipt(@RequestBody CreateGoodsReceiptRequest request) {
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(request);
        return ApiResponse.<GoodsReceiptResponse>builder()
                .result(response)
                .build();
    }

    @GetMapping("/po/{poId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<List<GoodsReceiptResponse>> getGoodsReceiptsByPo(@PathVariable Integer poId) {
        List<GoodsReceiptResponse> response = goodsReceiptService.getGoodsReceiptsByPo(poId);
        return ApiResponse.<List<GoodsReceiptResponse>>builder()
                .result(response)
                .build();
    }

    @PostMapping("/validate-unit-conversion")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<UnitConversionResponse> validateUnitConversion(@RequestBody ValidateUnitConversionRequest request) {
        try {
            log.info("=== VALIDATE UNIT CONVERSION DEBUG ===");
            log.info("ingredientId: {}, fromUnit: {}, toUnit: {}, quantity: {}", 
                    request.getIngredientId(), request.getFromUnitCode(), request.getToUnitCode(), request.getQuantity());
            
            boolean canConvert = unitConversionService.canConvert(
                request.getIngredientId(), 
                request.getFromUnitCode(), 
                request.getToUnitCode()
            );
            
            if (canConvert) {
                // For validation, we don't have branchId, so use null (admin scope)
                BigDecimal convertedQuantity = unitConversionService.convertQuantity(
                    request.getIngredientId(),
                    request.getFromUnitCode(),
                    request.getToUnitCode(),
                    request.getQuantity(),
                    null // No branchId for validation
                );
                
                BigDecimal conversionFactor = unitConversionService.getConversionFactor(
                    request.getIngredientId(),
                    request.getFromUnitCode(),
                    request.getToUnitCode(),
                    null // No branchId for validation
                );
                
                UnitConversionResponse response = UnitConversionResponse.builder()
                    .canConvert(true)
                    .convertedQuantity(convertedQuantity)
                    .conversionFactor(conversionFactor)
                    .build();
                
                return ApiResponse.<UnitConversionResponse>builder()
                    .result(response)
                    .build();
            } else {
                UnitConversionResponse response = UnitConversionResponse.builder()
                    .canConvert(false)
                    .errorMessage("Cannot convert between these units")
                    .build();
                
                return ApiResponse.<UnitConversionResponse>builder()
                    .result(response)
                    .build();
            }
        } catch (Exception e) {
            UnitConversionResponse response = UnitConversionResponse.builder()
                .canConvert(false)
                .errorMessage(e.getMessage())
                .build();
            
            return ApiResponse.<UnitConversionResponse>builder()
                .result(response)
                .build();
        }
    }

    @PostMapping("/create-unit-conversion")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<IngredientUnitConversionResponse> createUnitConversion(@RequestBody CreateIngredientUnitConversionRequest request) {
        try {
            IngredientUnitConversionResponse response = unitConversionService.createConversion(request);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                .result(response)
                .build();
        } catch (Exception e) {
            log.error("Error creating unit conversion: {}", e.getMessage(), e);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                .code(500)
                .message("Failed to create unit conversion: " + e.getMessage())
                .build();
        }
    }

    /**
     * Get all GLOBAL conversions (for ADMIN)
     */
    @GetMapping("/conversions/global")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<IngredientUnitConversionResponse>> getAllGlobalConversions() {
        try {
            List<IngredientUnitConversionResponse> conversions = unitConversionService.getAllGlobalConversions();
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                .result(conversions)
                .build();
        } catch (Exception e) {
            log.error("Error getting global conversions: {}", e.getMessage(), e);
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                .code(500)
                .message("Failed to get global conversions: " + e.getMessage())
                .build();
        }
    }

    /**
     * Get all conversions for a branch (GLOBAL + branch-specific for MANAGER/STAFF)
     */
    @GetMapping("/conversions/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<IngredientUnitConversionResponse>> getConversionsForBranch(@PathVariable Integer branchId) {
        try {
            List<IngredientUnitConversionResponse> conversions = unitConversionService.getConversionsForBranch(branchId);
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                .result(conversions)
                .build();
        } catch (Exception e) {
            log.error("Error getting conversions for branch {}: {}", branchId, e.getMessage(), e);
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                .code(500)
                .message("Failed to get conversions for branch: " + e.getMessage())
                .build();
        }
    }

    /**
     * Get all conversions for a specific ingredient (GLOBAL + branch-specific for MANAGER/STAFF)
     */
    @GetMapping("/conversions/ingredient/{ingredientId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ApiResponse<List<IngredientUnitConversionResponse>> getConversionsForIngredient(
            @PathVariable Integer ingredientId,
            @RequestParam(required = false) Integer branchId) {
        try {
            List<IngredientUnitConversionResponse> conversions;
            
            if (branchId == null) {
                // ADMIN: get all conversions for ingredient
                conversions = unitConversionService.getGlobalConversionsForIngredient(ingredientId);
            } else {
                // MANAGER/STAFF: get GLOBAL + branch-specific conversions
                conversions = unitConversionService.getConversionsForIngredient(ingredientId, branchId);
            }
            
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                    .result(conversions)
                    .build();
        } catch (Exception e) {
            log.error("Error getting conversions for ingredient {}: {}", ingredientId, e.getMessage(), e);
            return ApiResponse.<List<IngredientUnitConversionResponse>>builder()
                    .code(500)
                    .message("Failed to get conversions for ingredient: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping("/conversions/{conversionId}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<IngredientUnitConversionResponse> updateConversionStatus(
            @PathVariable Long conversionId,
            @RequestBody Map<String, Boolean> request) {
        try {
            Boolean isActive = request.get("isActive");
            if (isActive == null) {
                return ApiResponse.<IngredientUnitConversionResponse>builder()
                        .code(400)
                        .message("isActive field is required")
                        .build();
            }
            
            IngredientUnitConversionResponse response = unitConversionService.updateConversionStatus(conversionId, isActive);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Error updating conversion status for {}: {}", conversionId, e.getMessage(), e);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                    .code(500)
                    .message("Failed to update conversion status: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping("/conversions/{conversionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ApiResponse<IngredientUnitConversionResponse> updateConversion(
            @PathVariable Long conversionId,
            @RequestBody CreateIngredientUnitConversionRequest request) {
        try {
            IngredientUnitConversionResponse response = unitConversionService.updateConversion(conversionId, request);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Error updating conversion {}: {}", conversionId, e.getMessage(), e);
            return ApiResponse.<IngredientUnitConversionResponse>builder()
                    .code(500)
                    .message("Failed to update conversion: " + e.getMessage())
                    .build();
        }
    }
}
