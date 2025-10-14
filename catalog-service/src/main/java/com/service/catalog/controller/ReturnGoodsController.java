package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.returnGoods.CreateReturnGoodsRequest;
import com.service.catalog.dto.response.ReturnGoodsResponse;
import com.service.catalog.service.ReturnGoodsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
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

    @GetMapping("/{returnId}")
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<ReturnGoodsResponse> getReturnGoodsById(@PathVariable Integer returnId) {
        ReturnGoodsResponse response = returnGoodsService.getReturnGoodsById(returnId);
        return ApiResponse.<ReturnGoodsResponse>builder()
                .result(response)
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('STAFF') or hasRole('MANAGER')")
    public ApiResponse<Page<ReturnGoodsResponse>> search(
            @RequestParam(required = false) Integer poId,
            @RequestParam(required = false) Integer supplierId,
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String returnNumber,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort sort = Sort.by("DESC".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ReturnGoodsResponse> result = returnGoodsService.searchReturnGoods(poId, supplierId, branchId, returnNumber, status, fromDate, toDate, pageable);
        return ApiResponse.<Page<ReturnGoodsResponse>>builder().result(result).build();
    }
}
