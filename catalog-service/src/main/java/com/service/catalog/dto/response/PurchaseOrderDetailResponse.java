package com.service.catalog.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PurchaseOrderDetailResponse {
    Integer id;
    IngredientResponse ingredient;
    BigDecimal qty;
    String unitCode;
    BigDecimal unitPrice;
    BigDecimal lineTotal;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
