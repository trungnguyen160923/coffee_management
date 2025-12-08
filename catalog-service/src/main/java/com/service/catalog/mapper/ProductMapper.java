package com.service.catalog.mapper;

import com.service.catalog.dto.response.CategoryResponse;
import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.ProductResponse;
import com.service.catalog.entity.Product;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ProductMapper {
    
    private final ProductDetailMapper productDetailMapper;
    
    public ProductResponse toProductResponse(Product product) {
        return toProductResponse(product, false);
    }
    
    public ProductResponse toProductResponseForPublic(Product product) {
        return toProductResponse(product, true);
    }
    
    private ProductResponse toProductResponse(Product product, boolean filterActiveDetails) {
        if (product == null) {
            return null;
        }
        
        CategoryResponse categoryResponse = null;
        if (product.getCategory() != null) {
            categoryResponse = CategoryResponse.builder()
                    .categoryId(product.getCategory().getCategoryId())
                    .name(product.getCategory().getName())
                    .description(product.getCategory().getDescription())
                    .active(true) // Default to true if entity doesn't have active field
                    .createAt(product.getCategory().getCreateAt())
                    .updateAt(product.getCategory().getUpdateAt())
                    .build();
        }
        
        List<ProductDetailResponse> productDetails;
        if (filterActiveDetails) {
            // For public API: only show active product details
            productDetails = product.getProductDetails()
                    .stream()
                    .filter(detail -> detail.getActive() != null && detail.getActive())
                    .map(productDetailMapper::toProductDetailResponse)
                    .toList();
        } else {
            // For admin API: show all product details
            productDetails = product.getProductDetails()
                    .stream()
                    .map(productDetailMapper::toProductDetailResponse)
                    .toList();
        }
        
        return ProductResponse.builder()
                .productId(product.getProductId())
                .name(product.getName())
                .imageUrl(product.getImageUrl())
                .category(categoryResponse)
                .sku(product.getSku())
                .description(product.getDescription())
                .active(product.getActive())
                .createAt(product.getCreateAt())
                .updateAt(product.getUpdateAt())
                .productDetails(productDetails)
                .build();
    }
}
