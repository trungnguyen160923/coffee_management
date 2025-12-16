package com.service.profile.mapper;

import com.service.profile.dto.request.CustomerProfileCreationRequest;
import com.service.profile.dto.response.CustomerProfileResponse;
import com.service.profile.entity.CustomerProfile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CustomerProfileMapper {
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    CustomerProfile toCustomerProfile(CustomerProfileCreationRequest request);
    
    CustomerProfileResponse toCustomerProfileResponse(CustomerProfile customerProfile);
    
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    CustomerProfile toCustomerProfile_(CustomerProfileResponse response);
}
