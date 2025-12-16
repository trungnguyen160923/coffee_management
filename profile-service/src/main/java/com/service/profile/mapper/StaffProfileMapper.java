package com.service.profile.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.entity.StaffProfile;

@Mapper(componentModel = "spring")
public interface StaffProfileMapper {
    @Mapping(target = "insuranceSalary", ignore = true)
    @Mapping(target = "numberOfDependents", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    StaffProfile toStaffProfile(StaffProfileCreationRequest request);
    
    @Mapping(target = "branch", ignore = true)
    @Mapping(target = "staffBusinessRoleIds", ignore = true)
    @Mapping(target = "proficiencyLevel", ignore = true)
    StaffProfileResponse toStaffProfileResponse(StaffProfile staffProfile);
}
