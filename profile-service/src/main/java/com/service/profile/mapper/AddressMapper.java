package com.service.profile.mapper;

import com.service.profile.dto.request.AddressCreationRequest;
import com.service.profile.dto.response.AddressResponse;
import com.service.profile.entity.Address;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AddressMapper {
    Address toAddress(AddressCreationRequest request);
    AddressResponse toAddressResponse(Address address);
}
