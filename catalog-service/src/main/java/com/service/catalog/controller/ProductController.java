package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.ProductCreationRequest;
import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.ProductResponse;
import com.service.catalog.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class ProductController {
    
    ProductService productService;
    
    @PostMapping
    ApiResponse<ProductResponse> createProduct(@Valid @RequestBody ProductCreationRequest request) {
        ProductResponse result = productService.createProduct(request);
        return ApiResponse.<ProductResponse>builder().result(result).build();
    }
    
    @GetMapping
    ApiResponse<List<ProductResponse>> getAllProducts() {
        List<ProductResponse> result = productService.getAllProducts();
        return ApiResponse.<List<ProductResponse>>builder().result(result).build();
    }
    
    @GetMapping("/{productId}")
    ApiResponse<ProductResponse> getProductById(@PathVariable Integer productId) {
        ProductResponse result = productService.getProductById(productId);
        return ApiResponse.<ProductResponse>builder().result(result).build();
    }

    @GetMapping("/detail/{productDetailId}")
    ApiResponse<ProductDetailResponse> getProductDetailById(@PathVariable Integer productDetailId) {
        ProductDetailResponse result = productService.getProductDetailById(productDetailId);
        return ApiResponse.<ProductDetailResponse>builder().result(result).build();
    }
}
