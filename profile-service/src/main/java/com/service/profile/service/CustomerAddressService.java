package com.service.profile.service;

import com.service.profile.dto.request.AddressUpdateRequest;
import com.service.profile.dto.response.AddressResponse;
import com.service.profile.entity.CustomerAddress;
import com.service.profile.entity.CustomerProfile;
import com.service.profile.mapper.AddressMapper;
import com.service.profile.mapper.CustomerProfileMapper;
import com.service.profile.repository.CustomerAddressRepository;
import com.service.profile.service.CustomerProfileService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerAddressService {
    CustomerAddressRepository customerAddressRepository;
    AddressService addressService;
    CustomerProfileService customerProfileService;
    CustomerProfileMapper customerProfileMapper;
    AddressMapper addressMapper;

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public AddressResponse updateCustomerAddress(Integer addressId, AddressUpdateRequest request) {
        return addressService.updateAddress(addressId, request);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    public List<AddressResponse> getCustomerAddresses() {
        CustomerProfile currentCustomer = customerProfileMapper
                .toCustomerProfile_(customerProfileService.getCurrentCustomerProfile());

        List<CustomerAddress> customerAddresses = customerAddressRepository.findByCustomer(currentCustomer);

        return customerAddresses.stream()
                .map(customerAddress -> addressMapper.toAddressResponse(customerAddress.getAddress()))
                .toList();
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public void deleteCustomerAddress(Integer addressId) {
        addressService.deleteAddress(addressId);
    }
}
