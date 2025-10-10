package com.service.catalog.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReturnGoodsDetailResponse {
    Integer id;
    IngredientResponse ingredient;
    String unitCode;
    BigDecimal qty;
    BigDecimal unitPrice;
    BigDecimal lineTotal;
    String returnReason;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
