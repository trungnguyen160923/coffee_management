package com.service.catalog.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.supplier.SupplierCreationRequest;
import com.service.catalog.dto.request.supplier.SupplierUpdateRequest;
import com.service.catalog.dto.response.SupplierResponse;
import com.service.catalog.dto.response.SupplierPageResponse;
import com.service.catalog.service.SupplierService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/suppliers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SupplierController {
    SupplierService supplierService;

    @GetMapping
    ApiResponse<List<SupplierResponse>> getAllSuppliers() {
        return ApiResponse.<List<SupplierResponse>>builder().result(supplierService.getAllSuppliers()).build();
    }

    @PostMapping
    ApiResponse<SupplierResponse> createSupplier(@Valid @RequestBody SupplierCreationRequest request) {
        return ApiResponse.<SupplierResponse>builder().result(supplierService.createSupplier(request)).build();
    }

    @PutMapping("/{supplierId}")
    ApiResponse<SupplierResponse> updateSupplier(@PathVariable Integer supplierId, @Valid @RequestBody SupplierUpdateRequest request) {
        return ApiResponse.<SupplierResponse>builder().result(supplierService.updateSupplier(supplierId, request)).build();
    }

    @GetMapping("/search")
    ApiResponse<SupplierPageResponse> searchSuppliers(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {
        
        com.service.catalog.dto.request.supplier.SupplierSearchRequest request = 
            com.service.catalog.dto.request.supplier.SupplierSearchRequest.builder()
                .page(page)
                .size(size)
                .search(search)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();
        
        SupplierPageResponse result = supplierService.searchSuppliers(request);
        return ApiResponse.<SupplierPageResponse>builder().result(result).build();
    }

    @DeleteMapping("/{supplierId}")
    ApiResponse<Void> deleteSupplier(@PathVariable Integer supplierId) {
        supplierService.deleteSupplier(supplierId);
        return ApiResponse.<Void>builder().build();
    }
}
