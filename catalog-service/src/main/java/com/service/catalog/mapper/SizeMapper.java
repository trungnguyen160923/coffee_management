package com.service.catalog.mapper;

import org.mapstruct.Mapper;

import com.service.catalog.dto.request.size.SizeCreationRequest;
import com.service.catalog.dto.request.size.SizeUpdateRequest;
import com.service.catalog.dto.response.SizeResponse;
import com.service.catalog.entity.Size;

@Mapper(componentModel = "spring")
public interface SizeMapper {
    Size toSize(SizeCreationRequest request);
    SizeResponse toSizeResponse(Size size);
    Size toSize(SizeUpdateRequest request);
}
