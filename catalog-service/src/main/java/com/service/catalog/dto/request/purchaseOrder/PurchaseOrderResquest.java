package com.service.catalog.dto.request.purchaseOrder;

import java.util.List;

import lombok.*;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PurchaseOrderResquest {
    Integer branchId;
    List<PurchaseOrderDetailRequest> items;
}
