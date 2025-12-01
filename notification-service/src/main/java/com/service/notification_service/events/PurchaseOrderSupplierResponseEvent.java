package com.service.notification_service.events;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderSupplierResponseEvent {

    private Integer poId;
    private String poNumber;
    private Integer branchId;
    private String branchName;
    private String supplierName;
    private String status; // SUPPLIER_CONFIRMED or SUPPLIER_CANCELLED
    private BigDecimal totalAmount;
    private LocalDateTime expectedDeliveryAt;
    private String supplierResponse;
    private LocalDateTime confirmedAt;
}


