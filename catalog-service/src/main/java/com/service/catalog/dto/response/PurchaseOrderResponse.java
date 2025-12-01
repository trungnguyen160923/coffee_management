package com.service.catalog.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PurchaseOrderResponse {
    Integer poId;
    String poNumber;
    SupplierResponse supplier;
    Integer branchId;
    String status;
    BigDecimal totalAmount;
    LocalDateTime expectedDeliveryAt;
    LocalDateTime sentAt;
    LocalDateTime confirmedAt;
    String supplierResponse;
    List<PurchaseOrderDetailResponse> details;
    LocalDateTime createAt;
    LocalDateTime updateAt;
}
