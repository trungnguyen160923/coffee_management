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
        if (product == null) {
            return null;
        }
        
        CategoryResponse categoryResponse = null;
        if (product.getCategory() != null) {
            categoryResponse = CategoryResponse.builder()
                    .categoryId(product.getCategory().getCategoryId())
                    .name(product.getCategory().getName())
                    .description(product.getCategory().getDescription())
                    .createAt(product.getCategory().getCreateAt())
                    .updateAt(product.getCategory().getUpdateAt())
                    .build();
        }
        
        List<ProductDetailResponse> productDetails = product.getProductDetails()
                .stream()
                .map(productDetailMapper::toProductDetailResponse)
                .toList();
        
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
