package com.service.catalog.dto.request.returnGoods;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CreateReturnGoodsRequest {
    private Integer poId;
    private Integer supplierId;
    private Integer branchId;
    private String returnReason;
    private List<ReturnGoodsDetailRequest> details;
}
