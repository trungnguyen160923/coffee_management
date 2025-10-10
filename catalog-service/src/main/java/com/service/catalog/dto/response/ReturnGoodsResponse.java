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
public class ReturnGoodsResponse {
    Integer returnId;
    String returnNumber;
    Integer poId;
    SupplierResponse supplier;
    Integer branchId;
    String status;
    BigDecimal totalAmount;
    String returnReason;
    LocalDateTime approvedAt;
    LocalDateTime returnedAt;
    List<com.service.catalog.dto.response.ReturnGoodsDetailResponse> details;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
