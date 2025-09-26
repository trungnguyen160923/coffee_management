package com.service.profile.mapper;

import org.mapstruct.Mapper;

import com.service.profile.dto.request.ManagerProfileCreationRequest;
import com.service.profile.dto.response.ManagerProfileResponse;
import com.service.profile.entity.ManagerProfile;

@Mapper(componentModel = "spring")
public interface ManagerProfileMapper {
    ManagerProfile toManagerProfile(ManagerProfileCreationRequest request);
    ManagerProfileResponse toManagerProfileResponse(ManagerProfile managerProfile);
}
