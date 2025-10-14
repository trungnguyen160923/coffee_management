package com.service.catalog.controller;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.purchaseOrder.SupplierResponseRequest;
import com.service.catalog.dto.response.PurchaseOrderResponse;
import com.service.catalog.exception.AppException;
import com.service.catalog.exception.ErrorCode;
import com.service.catalog.service.PurchaseOrderService;
import com.service.catalog.repository.PurchaseOrderRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/public/purchase-orders")
@RequiredArgsConstructor
public class PublicPurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderRepository purchaseOrderRepository;

    @GetMapping("/{poId}")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrder(@PathVariable Integer poId, 
                                                              @RequestParam String token) {
        if (!validateToken(poId, token)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        
        PurchaseOrderResponse response = purchaseOrderService.getPurchaseOrderForSupplier(poId);
        return ApiResponse.<PurchaseOrderResponse>builder()
                .result(response)
                .build();
    }

    @PostMapping("/{poId}/supplier-response")
    public ApiResponse<PurchaseOrderResponse> updateSupplierResponse(@PathVariable Integer poId,
                                                                    @RequestParam String token,
                                                                    @RequestBody SupplierResponseRequest request) {
        if (!validateToken(poId, token)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        PurchaseOrderResponse response = purchaseOrderService.updateSupplierResponsePublic(poId, request);
        return ApiResponse.<PurchaseOrderResponse>builder()
                .result(response)
                .build();
    }

    @PostMapping("/{poId}/cancel")
    public ApiResponse<String> cancelPurchaseOrder(@PathVariable Integer poId, 
                                                  @RequestParam String token,
                                                  @RequestBody(required = false) Map<String, String> requestBody) {
        if (!validateToken(poId, token)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        
        String reason = requestBody != null ? requestBody.get("reason") : "Cancelled by supplier";
        
        purchaseOrderService.cancelPurchaseOrderBySupplier(poId, reason);
        return ApiResponse.<String>builder()
                .result("Purchase Order cancelled successfully")
                .build();
    }
    
    @GetMapping("/{poId}/status")
    public ApiResponse<Map<String, Object>> getPurchaseOrderStatus(@PathVariable Integer poId, 
                                                                  @RequestParam String token) {
        if (!validateToken(poId, token)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid or expired token");
        }
        
        PurchaseOrderResponse po = purchaseOrderService.getPurchaseOrderForSupplier(poId);
        String status = po.getStatus();
        
        Map<String, Object> statusInfo = new java.util.HashMap<>();
        statusInfo.put("status", status);
        statusInfo.put("canTakeAction", "SENT_TO_SUPPLIER".equals(status));
        
        if ("CANCELLED".equals(status)) {
            statusInfo.put("message", "This Purchase Order has been cancelled by the system and cannot be modified.");
            statusInfo.put("showSuccessInfo", false);
        } else if ("SUPPLIER_CANCELLED".equals(status)) {
            statusInfo.put("message", "You have cancelled this Purchase Order. The order has been cancelled.");
            statusInfo.put("showSuccessInfo", false);
        } else if ("SUPPLIER_CONFIRMED".equals(status) || "PARTIALLY_RECEIVED".equals(status) || "RECEIVED".equals(status)) {
            statusInfo.put("message", "✅ This Purchase Order has been successfully processed. Thank you for your response!");
            statusInfo.put("showSuccessInfo", true);
        } else if ("DELIVERED".equals(status) || "COMPLETED".equals(status)) {
            statusInfo.put("message", "📦 This Purchase Order has been completed. Thank you for your service!");
            statusInfo.put("showSuccessInfo", true);
        } else if ("SENT_TO_SUPPLIER".equals(status)) {
            statusInfo.put("message", "This Purchase Order is ready for your response.");
            statusInfo.put("showSuccessInfo", false);
        } else {
            statusInfo.put("message", "This Purchase Order is in " + status + " status and cannot be modified.");
            statusInfo.put("showSuccessInfo", false);
        }
        
        return ApiResponse.<Map<String, Object>>builder()
                .result(statusInfo)
                .build();
    }
    
    private boolean validateToken(Integer poId, String token) {
        try {
            // Basic validation
            if (token == null || token.trim().isEmpty()) {
                return false;
            }
            
            // Try to get PO to verify it exists and is in correct status
            try {
                // Check if PO exists and is in correct status without throwing exceptions
                var po = purchaseOrderRepository.findById(poId);
                if (!po.isPresent()) {
                    return false;
                }
                
                var purchaseOrder = po.get();
                
                // Check if PO is in correct status for supplier access
                // Allow viewing for any status after SENT_TO_SUPPLIER
                String status = purchaseOrder.getStatus();
                if (!"SENT_TO_SUPPLIER".equals(status) && 
                    !"SUPPLIER_CONFIRMED".equals(status) && 
                    !"SUPPLIER_CANCELLED".equals(status) &&
                    !"CANCELLED".equals(status) &&
                    !"PARTIALLY_RECEIVED".equals(status) &&
                    !"RECEIVED".equals(status) &&
                    !"DELIVERED".equals(status) &&
                    !"COMPLETED".equals(status)) {
                    return false;
                }
                
                // For now, accept any non-empty token if PO exists and is in correct status
                // In production, you should validate the token format and signature
                return true;
                
            } catch (Exception e) {
                return false;
            }
        } catch (Exception e) {
            return false;
        }
    }
}
