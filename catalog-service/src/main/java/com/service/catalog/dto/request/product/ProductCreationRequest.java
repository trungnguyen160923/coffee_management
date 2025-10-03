package com.service.catalog.dto.request.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductCreationRequest {
    @NotBlank(message = "EMPTY_NAME_PRODUCT")
    @Size(max = 150, message = "INVALID_NAME_PRODUCT")
    String name;
    
    @NotNull(message = "EMPTY_CATEGORY_ID")
    Integer categoryId;
    
    @Size(max = 100, message = "INVALID_SKU")
    String sku;
    
    String description;
    Boolean active;
    
    @Size(max = 255, message = "INVALID_IMAGE_URL")
    String imageUrl;
    
    @Valid
    @NotNull(message = "EMPTY_PRODUCT_SIZES")
    @Size(min = 1, message = "INVALID_PRODUCT_SIZES")
    List<ProductSizeRequest> productSizes;
}
