package com.service.catalog.dto.request.goodsReceipt;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CreateGoodsReceiptRequest {
    private Integer poId;
    private Integer supplierId;
    private Integer branchId;
    private Integer receivedBy;
    private List<GoodsReceiptDetailRequest> details;
}
