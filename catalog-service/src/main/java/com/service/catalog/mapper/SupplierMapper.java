package com.service.catalog.mapper;

import org.mapstruct.Mapper;
import com.service.catalog.entity.Supplier;
import com.service.catalog.dto.request.SupplierCreationRequest;
import com.service.catalog.dto.request.SupplierUpdateRequest;
import com.service.catalog.dto.response.SupplierResponse;

@Mapper(componentModel = "spring")
public interface SupplierMapper {
    Supplier toSupplier(SupplierCreationRequest request);
    SupplierResponse toSupplierResponse(Supplier supplier);
    Supplier toSupplier(SupplierUpdateRequest request);
}
