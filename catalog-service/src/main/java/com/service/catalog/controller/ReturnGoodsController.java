package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.returnGoods.CreateReturnGoodsRequest;
import com.service.catalog.dto.response.ReturnGoodsResponse;
import com.service.catalog.service.ReturnGoodsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/return-goods")
@RequiredArgsConstructor
public class ReturnGoodsController {

    private final ReturnGoodsService returnGoodsService;

    @PostMapping
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<ReturnGoodsResponse> createReturnGoods(@RequestBody CreateReturnGoodsRequest request) {
        ReturnGoodsResponse response = returnGoodsService.createReturnGoods(request);
        return ApiResponse.<ReturnGoodsResponse>builder()
                .result(response)
                .build();
    }

    @PostMapping("/{returnId}/approve")
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<ReturnGoodsResponse> approveReturnGoods(@PathVariable Integer returnId) {
        ReturnGoodsResponse response = returnGoodsService.approveReturnGoods(returnId);
        return ApiResponse.<ReturnGoodsResponse>builder()
                .result(response)
                .build();
    }

    @PostMapping("/{returnId}/process")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<ReturnGoodsResponse> processReturnGoods(@PathVariable Integer returnId) {
        ReturnGoodsResponse response = returnGoodsService.processReturnGoods(returnId);
        return ApiResponse.<ReturnGoodsResponse>builder()
                .result(response)
                .build();
    }

    @GetMapping("/po/{poId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<List<ReturnGoodsResponse>> getReturnGoodsByPo(@PathVariable Integer poId) {
        List<ReturnGoodsResponse> response = returnGoodsService.getReturnGoodsByPo(poId);
        return ApiResponse.<List<ReturnGoodsResponse>>builder()
                .result(response)
                .build();
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<List<ReturnGoodsResponse>> getReturnGoodsByStatus(@PathVariable String status) {
        List<ReturnGoodsResponse> response = returnGoodsService.getReturnGoodsByStatus(status);
        return ApiResponse.<List<ReturnGoodsResponse>>builder()
                .result(response)
                .build();
    }
}
