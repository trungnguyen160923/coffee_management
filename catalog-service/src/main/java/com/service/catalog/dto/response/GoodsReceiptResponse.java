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
    String branchName;
    BigDecimal totalAmount;
    LocalDateTime receivedAt;
    Integer receivedBy;
    String receivedByName;
    String status;
    String notes;
    List<GoodsReceiptDetailResponse> details;
    LocalDateTime createAt;
}
