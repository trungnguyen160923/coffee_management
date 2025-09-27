package com.service.catalog.mapper;

import com.service.catalog.dto.response.ProductDetailResponse;
import com.service.catalog.dto.response.SizeResponse;
import com.service.catalog.entity.ProductDetail;
import org.springframework.stereotype.Component;

@Component
public class ProductDetailMapper {
    
    public ProductDetailResponse toProductDetailResponse(ProductDetail productDetail) {
        if (productDetail == null) {
            return null;
        }
        
        SizeResponse sizeResponse = SizeResponse.builder()
                .sizeId(productDetail.getSize().getSizeId())
                .name(productDetail.getSize().getName())
                .description(productDetail.getSize().getDescription())
                .createAt(productDetail.getSize().getCreateAt())
                .updateAt(productDetail.getSize().getUpdateAt())
                .build();
        
        return ProductDetailResponse.builder()
                .pdId(productDetail.getPdId())
                .size(sizeResponse)
                .price(productDetail.getPrice())
                .createAt(productDetail.getCreateAt())
                .updateAt(productDetail.getUpdateAt())
                .build();
    }
}
