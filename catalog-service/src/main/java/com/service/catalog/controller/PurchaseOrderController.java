package com.service.catalog.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderResquest;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderDetailUpdateRequest;
import com.service.catalog.dto.request.purchaseOrder.SendToSupplierRequest;
import com.service.catalog.dto.response.PurchaseOrderResponse;
import com.service.catalog.service.PurchaseOrderService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<PurchaseOrderResponse>> getPurchaseOrders(@PathVariable Integer branchId) {
        List<PurchaseOrderResponse> purchaseOrders = purchaseOrderService.getPurchaseOrders(branchId);
        return ApiResponse.<List<PurchaseOrderResponse>>builder()
                .result(purchaseOrders)
                .build();
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<PurchaseOrderResponse>> createBulk(@RequestBody PurchaseOrderResquest request) {
        List<PurchaseOrderResponse> created = purchaseOrderService.createPurchaseOrder(request);
        return  ApiResponse.<List<PurchaseOrderResponse>>builder()
                    .result(created)
                    .build();
    }

    @PutMapping("/{poId}/status/{status}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<PurchaseOrderResponse> updateStatus(@PathVariable Integer poId, @PathVariable String status) {
        PurchaseOrderResponse resp = purchaseOrderService.updateStatus(poId, status);
        return ApiResponse.<PurchaseOrderResponse>builder().result(resp).build();
    }


    // removed /draft; use /bulk?status=DRAFT

    @DeleteMapping("/{poId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<String> deletePurchaseOrder(@PathVariable Integer poId) {
        purchaseOrderService.deletePurchaseOrder(poId);
        return ApiResponse.<String>builder()
                .result("Purchase Order deleted successfully")
                .build();
    }

    @PostMapping("/{poId}/send-to-supplier")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<PurchaseOrderResponse> sendToSupplier(@PathVariable Integer poId,
                                                             @RequestBody SendToSupplierRequest request) {
        PurchaseOrderResponse response = purchaseOrderService.sendToSupplier(poId, request);
        return ApiResponse.<PurchaseOrderResponse>builder()
                .result(response)
                .build();
    }

    @GetMapping("/{poId}/can-cancel")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<Boolean> canCancel(@PathVariable Integer poId) {
        boolean canCancel = purchaseOrderService.canBeCancelled(poId);
        return ApiResponse.<Boolean>builder()
                .result(canCancel)
                .build();
    }

    @GetMapping("/{poId}/cancellation-restriction")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<String> getCancellationRestriction(@PathVariable Integer poId) {
        String restriction = purchaseOrderService.getCancellationRestriction(poId);
        return ApiResponse.<String>builder()
                .result(restriction)
                .build();
    }

    @DeleteMapping("/details/{detailId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<String> deletePurchaseOrderDetail(@PathVariable Integer detailId) {
        purchaseOrderService.deletePurchaseOrderDetail(detailId);
        return ApiResponse.<String>builder()
                .result("Purchase Order Detail deleted successfully")
                .build();
    }

    @PutMapping("/details/{detailId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrderDetail(@PathVariable Integer detailId, 
                                                          @RequestBody PurchaseOrderDetailUpdateRequest request) {
        PurchaseOrderResponse response = purchaseOrderService.updatePurchaseOrderDetail(detailId, request);
        return ApiResponse.<PurchaseOrderResponse>builder()
                .result(response)
                .build();
    }

}


