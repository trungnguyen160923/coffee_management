package com.service.profile.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.entity.ManagerProfile;

@Mapper(componentModel = "spring")
public interface ManagerProfileMapper {
    @Mapping(target = "baseSalary", source = "baseSalary")
    @Mapping(target = "insuranceSalary", source = "insuranceSalary")
    @Mapping(target = "numberOfDependents", source = "numberOfDependents")
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    ManagerProfile toManagerProfile(ManagerProfileCreationRequest request);
    
    @Mapping(target = "branch", ignore = true)
    @Mapping(target = "overtimeRate", ignore = true)
    ManagerProfileResponse toManagerProfileResponse(ManagerProfile managerProfile);
}
