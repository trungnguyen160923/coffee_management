package com.service.catalog.dto.request.returnGoods;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ReturnGoodsDetailRequest {
    private Integer ingredientId;
    private String unitCode;
    private BigDecimal qty;
    private BigDecimal unitPrice;
    private String returnReason;
}
