package com.service.catalog.dto.request.stock;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckAndReserveRequest {
    private Integer branchId;
    private List<OrderItem> items;
    private Integer cartId;
    private String guestId;
    private String orderDraftId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private Integer productDetailId;
        private Integer quantity;
    }
}
