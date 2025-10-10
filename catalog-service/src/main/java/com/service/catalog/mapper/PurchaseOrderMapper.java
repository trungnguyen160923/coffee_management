package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.catalog.dto.response.PurchaseOrderResponse;
import com.service.catalog.dto.response.PurchaseOrderDetailResponse;
import com.service.catalog.dto.response.UnitResponse;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderResquest;
import com.service.catalog.dto.request.purchaseOrder.PurchaseOrderDetailRequest;
import com.service.catalog.entity.PurchaseOrder;
import com.service.catalog.entity.PurchaseOrderDetail;
import com.service.catalog.entity.Unit;

@Mapper(componentModel = "spring")
public interface PurchaseOrderMapper {
    PurchaseOrderResponse toPurchaseOrderResponse(PurchaseOrder purchaseOrder);
    PurchaseOrder toPurchaseOrder(PurchaseOrderResquest purchaseOrderResquest);

    @Mapping(target = "unitCode", source = "unit.code")
    PurchaseOrderDetailResponse toPurchaseOrderDetailResponse(PurchaseOrderDetail purchaseOrderDetail);
    PurchaseOrderDetail toPurchaseOrderDetail(PurchaseOrderDetailRequest purchaseOrderDetailRequest);

    @Mapping(target = "baseUnitCode", source = "baseUnit.code")
    UnitResponse toUnitResponse(Unit unit);
}
