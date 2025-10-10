package com.service.catalog.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoodsReceiptResponse {
    Long grnId;
    String grnNumber;
    Integer poId;
    SupplierResponse supplier;
    Integer branchId;
    BigDecimal totalAmount;
    LocalDateTime receivedAt;
    Integer receivedBy;
    List<GoodsReceiptDetailResponse> details;
    LocalDateTime createAt;
}
