package com.service.profile.mapper;

import com.service.profile.entity.AdminProfile;

import com.service.profile.dto.response.AdminProfileResponse;
// import com.service.profile.dto.request.AdminProfileCreationRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AdminProfileMapper {
    // AdminProfile toAdminProfile(AdminProfileCreationRequest request);
    AdminProfileResponse toAdminProfileResponse(AdminProfile adminProfile);;
}
