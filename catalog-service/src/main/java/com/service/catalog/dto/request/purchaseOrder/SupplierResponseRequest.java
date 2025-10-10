package com.service.catalog.dto.request.purchaseOrder;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SupplierResponseRequest {
    private String status; // "SUPPLIER_CONFIRMED" | "SUPPLIER_CANCELLED"
    private LocalDateTime expectedDeliveryAt;
    private String supplierResponse; // Notes from supplier
}
