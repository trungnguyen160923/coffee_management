package com.service.profile.service;

import java.time.LocalDateTime;

import com.service.profile.dto.request.AddressCreationRequest;
import com.service.profile.dto.response.AddressResponse;
import com.service.profile.entity.Address;
import com.service.profile.entity.CustomerAddress;
import com.service.profile.entity.CustomerProfile;
import com.service.profile.exception.AppException;
import com.service.profile.exception.ErrorCode;
import com.service.profile.mapper.AddressMapper;
import com.service.profile.mapper.CustomerProfileMapper;
import com.service.profile.repository.AddressRepository;
import com.service.profile.repository.CustomerAddressRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AddressService {
    AddressRepository addressRepository;
    CustomerAddressRepository customerAddressRepository;
    CustomerProfileService customerProfileService;
    AddressMapper addressMapper;
    CustomerProfileMapper customerProfileMapper;

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public AddressResponse createAddress(AddressCreationRequest request) {
        if (addressRepository.existsByLabel(request.getLabel())) {
            throw new AppException(ErrorCode.LABEL_EXISTED);
        }

        // map request -> entity
        Address address = addressMapper.toAddress(request);

        address.setCreateAt(LocalDateTime.now());
        address.setUpdateAt(LocalDateTime.now());

        // save address trước (nếu không có cascade)
        addressRepository.save(address);

        // lấy customer hiện tại (ví dụ từ SecurityContext)
        CustomerProfile customer = customerProfileMapper
                .toCustomerProfile_(customerProfileService.getCurrentCustomerProfile());

        // mapping quan hệ
        CustomerAddress customerAddress = CustomerAddress.builder()
            .address(address)
            .customer(customer)
            .isDefault(false)
            .createAt(LocalDateTime.now())
            .updateAt(LocalDateTime.now())
            .build();

        customerAddressRepository.save(customerAddress);

        return addressMapper.toAddressResponse(address);
    }
}
