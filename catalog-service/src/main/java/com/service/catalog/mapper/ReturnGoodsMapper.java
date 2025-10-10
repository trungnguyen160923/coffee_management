package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.catalog.dto.response.ReturnGoodsResponse;
import com.service.catalog.dto.response.ReturnGoodsDetailResponse;
import com.service.catalog.dto.request.returnGoods.CreateReturnGoodsRequest;
import com.service.catalog.dto.request.returnGoods.ReturnGoodsDetailRequest;
import com.service.catalog.entity.ReturnGoods;
import com.service.catalog.entity.ReturnGoodsDetail;

@Mapper(componentModel = "spring")
public interface ReturnGoodsMapper {
    @Mapping(target = "poId", source = "purchaseOrder.poId")
    @Mapping(target = "supplier", source = "supplier")
    ReturnGoodsResponse toReturnGoodsResponse(ReturnGoods returnGoods);
    
    @Mapping(target = "purchaseOrder", ignore = true)
    @Mapping(target = "supplier", ignore = true)
    @Mapping(target = "details", ignore = true)
    @Mapping(target = "returnId", ignore = true)
    @Mapping(target = "returnNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    ReturnGoods toReturnGoods(CreateReturnGoodsRequest request);

    @Mapping(target = "unitCode", source = "unit.code")
    @Mapping(target = "ingredient", source = "ingredient")
    ReturnGoodsDetailResponse toReturnGoodsDetailResponse(ReturnGoodsDetail returnGoodsDetail);
    
    @Mapping(target = "returnGoods", ignore = true)
    @Mapping(target = "ingredient", ignore = true)
    @Mapping(target = "unit", ignore = true)
    @Mapping(target = "lineTotal", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    ReturnGoodsDetail toReturnGoodsDetail(ReturnGoodsDetailRequest request);
}
