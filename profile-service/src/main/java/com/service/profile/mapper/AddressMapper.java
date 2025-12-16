package com.service.profile.mapper;

import com.service.profile.dto.request.AddressCreationRequest;
import com.service.profile.dto.response.AddressResponse;
import com.service.profile.entity.Address;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AddressMapper {
    @Mapping(target = "addressId", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    Address toAddress(AddressCreationRequest request);
    
    AddressResponse toAddressResponse(Address address);
}
