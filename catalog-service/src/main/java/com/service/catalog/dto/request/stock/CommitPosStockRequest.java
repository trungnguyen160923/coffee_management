package com.service.catalog.dto.request.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitPosStockRequest {
    private Integer branchId;
    private Integer orderId;
    private List<PosItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PosItem {
        private Integer productDetailId;
        private BigDecimal quantity;
    }
}

