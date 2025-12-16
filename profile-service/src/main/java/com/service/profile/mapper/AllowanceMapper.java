package com.service.profile.mapper;

import com.service.profile.dto.response.AllowanceResponse;
import com.service.profile.entity.Allowance;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AllowanceMapper {
    
    @Mapping(target = "userRole", expression = "java(allowance.getUserRole().name())")
    @Mapping(target = "allowanceType", expression = "java(allowance.getAllowanceType().name())")
    @Mapping(target = "status", expression = "java(allowance.getStatus().name())")
    AllowanceResponse toAllowanceResponse(Allowance allowance);
}

