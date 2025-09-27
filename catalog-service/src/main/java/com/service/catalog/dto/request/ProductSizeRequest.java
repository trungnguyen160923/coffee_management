package com.service.catalog.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSizeRequest {
    @NotNull(message = "EMPTY_SIZE_ID")
    @Positive(message = "INVALID_SIZE_ID")
    Integer sizeId;
    
    @NotNull(message = "EMPTY_PRICE")
    @Positive(message = "INVALID_PRICE")
    BigDecimal price;
}
