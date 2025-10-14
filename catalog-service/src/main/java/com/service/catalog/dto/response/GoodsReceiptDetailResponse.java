package com.service.catalog.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoodsReceiptDetailResponse {
    Long id;
    Long grnId;
    Integer poId;
    Integer poDetailId;
    IngredientResponse ingredient;
    String unitCodeInput;
    BigDecimal qtyInput;
    BigDecimal conversionFactor;
    BigDecimal qtyBase;
    BigDecimal damageQty;
    BigDecimal unitPrice;
    BigDecimal lineTotal;
    String lotNumber;
    LocalDate mfgDate;
    LocalDate expDate;
    String status;
    String statusLabel;
    String note;
    LocalDateTime createAt;
}
