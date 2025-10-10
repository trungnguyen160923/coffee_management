package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.catalog.dto.response.GoodsReceiptResponse;
import com.service.catalog.dto.response.GoodsReceiptDetailResponse;
import com.service.catalog.entity.GoodsReceipt;
import com.service.catalog.entity.GoodsReceiptDetail;

@Mapper(componentModel = "spring")
public interface GoodsReceiptMapper {
    @Mapping(target = "poId", source = "purchaseOrder.poId")
    @Mapping(target = "supplier", source = "supplier")
    GoodsReceiptResponse toGoodsReceiptResponse(GoodsReceipt goodsReceipt);
    
    @Mapping(target = "grnId", source = "goodsReceipt.grnId")
    @Mapping(target = "poId", source = "purchaseOrder.poId")
    @Mapping(target = "poDetailId", source = "purchaseOrderDetail.id")
    @Mapping(target = "ingredient", source = "ingredient")
    @Mapping(target = "mfgDate", source = "mfgDate")
    @Mapping(target = "expDate", source = "expDate")
    GoodsReceiptDetailResponse toGoodsReceiptDetailResponse(GoodsReceiptDetail goodsReceiptDetail);
}
