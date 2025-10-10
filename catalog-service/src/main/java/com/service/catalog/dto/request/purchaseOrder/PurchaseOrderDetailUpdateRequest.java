package com.service.catalog.dto.request.purchaseOrder;

import lombok.*;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PurchaseOrderDetailUpdateRequest {
    Integer ingredientId;
    BigDecimal qty;
    String unitCode;
    BigDecimal unitPrice;
}
