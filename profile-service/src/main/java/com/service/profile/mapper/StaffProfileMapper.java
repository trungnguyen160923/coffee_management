package com.service.profile.mapper;

import org.mapstruct.Mapper;

import com.service.profile.dto.request.StaffProfileCreationRequest;
import com.service.profile.dto.response.StaffProfileResponse;
import com.service.profile.entity.StaffProfile;

@Mapper(componentModel = "spring")
public interface StaffProfileMapper {
    StaffProfile toStaffProfile(StaffProfileCreationRequest request);
    StaffProfileResponse toStaffProfileResponse(StaffProfile staffProfile);
}
