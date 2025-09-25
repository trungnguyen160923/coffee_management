package com.service.profile.mapper;

import com.service.profile.dto.request.CustomerProfileCreationRequest;
import com.service.profile.dto.response.CustomerProfileResponse;
import com.service.profile.entity.CustomerProfile;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CustomerProfileMapper {
    CustomerProfile toCustomerProfile(CustomerProfileCreationRequest request);
    CustomerProfileResponse toCustomerProfileResponse(CustomerProfile customerProfile);
    CustomerProfile toCustomerProfile_(CustomerProfileResponse response);
}
