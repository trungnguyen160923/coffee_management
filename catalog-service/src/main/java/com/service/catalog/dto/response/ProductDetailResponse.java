package com.service.catalog.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductDetailResponse {
    Integer pdId;
    SizeResponse size;
    BigDecimal price;
    Boolean active;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
