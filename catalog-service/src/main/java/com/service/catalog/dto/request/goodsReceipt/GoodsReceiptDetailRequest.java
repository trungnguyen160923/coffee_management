package com.service.catalog.dto.request.goodsReceipt;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class GoodsReceiptDetailRequest {
    private Integer poDetailId;
    private Integer ingredientId;
    private String unitCodeInput;
    private BigDecimal qtyInput;
    private BigDecimal unitPrice;
    private String lotNumber;
    private LocalDate mfgDate;
    private LocalDate expDate;
    private String status; // OK, SHORT, OVER, DAMAGE
    private BigDecimal damageQty;
    private String note;
}
