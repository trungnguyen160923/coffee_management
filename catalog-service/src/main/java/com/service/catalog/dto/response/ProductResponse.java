package com.service.catalog.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductResponse {
    Integer productId;
    String name;
    String imageUrl;
    CategoryResponse category;
    String sku;
    String description;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;
    
    // Danh sách các size và price của product
    List<ProductDetailResponse> productDetails;
}
