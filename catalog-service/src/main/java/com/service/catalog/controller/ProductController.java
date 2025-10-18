package com.service.catalog.controller;

import com.service.catalog.dto.ApiResponse;
import com.service.catalog.dto.request.product.ProductCreationRequest;
import com.service.catalog.dto.request.product.ProductSearchRequest;
import com.service.catalog.dto.request.product.ProductUpdateRequest;
import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.ProductPageResponse;
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
    
    @PutMapping("/{productId}")
    ApiResponse<ProductResponse> updateProduct(@PathVariable Integer productId, @Valid @RequestBody ProductUpdateRequest request) {
        ProductResponse result = productService.updateProduct(productId, request);
        return ApiResponse.<ProductResponse>builder().result(result).build();
    }
    
    @GetMapping
    ApiResponse<List<ProductResponse>> getAllProducts() {
        List<ProductResponse> result = productService.getAllProducts();
        return ApiResponse.<List<ProductResponse>>builder().result(result).build();
    }

    @GetMapping("/can-sell")
    ApiResponse<List<ProductResponse>> getAllProductsCanSell() {
        List<ProductResponse> result = productService.getAllProductsCanSell();
        return ApiResponse.<List<ProductResponse>>builder().result(result).build();
    }
    
    @GetMapping("/{productId}")
    ApiResponse<ProductResponse> getProductById(@PathVariable Integer productId) {
        ProductResponse result = productService.getProductById(productId);
        return ApiResponse.<ProductResponse>builder().result(result).build();
    }
    
    @GetMapping("/public/{productId}")
    ApiResponse<ProductResponse> getProductByIdForPublic(@PathVariable Integer productId) {
        ProductResponse result = productService.getProductByIdForPublic(productId);
        return ApiResponse.<ProductResponse>builder().result(result).build();
    }

    @GetMapping("/detail/{productDetailId}")
    ApiResponse<ProductDetailResponse> getProductDetailById(@PathVariable Integer productDetailId) {
        ProductDetailResponse result = productService.getProductDetailById(productDetailId);
        return ApiResponse.<ProductDetailResponse>builder().result(result).build();
    }
    
    @GetMapping("/search")
    ApiResponse<ProductPageResponse> searchProducts(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {
        
        ProductSearchRequest request = ProductSearchRequest.builder()
                .page(page)
                .size(size)
                .search(search)
                .categoryId(categoryId)
                .active(active)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();
        
        ProductPageResponse result = productService.searchProducts(request);
        return ApiResponse.<ProductPageResponse>builder().result(result).build();
    }
    
    @GetMapping("/public/search")
    ApiResponse<ProductPageResponse> searchProductsForPublic(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection) {
        
        ProductSearchRequest request = ProductSearchRequest.builder()
                .page(page)
                .size(size)
                .search(search)
                .categoryId(categoryId)
                .active(true) // Force active = true for public
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();
        
        ProductPageResponse result = productService.searchProductsForPublic(request);
        return ApiResponse.<ProductPageResponse>builder().result(result).build();
    }

    @DeleteMapping("/{productId}")
    ApiResponse<Void> deleteProduct(@PathVariable Integer productId) {
        productService.deleteProduct(productId);
        return ApiResponse.<Void>builder().build();
    }
}
