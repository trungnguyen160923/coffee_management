package com.service.profile.service;

import java.time.LocalDateTime;

import com.service.profile.dto.request.AddressCreationRequest;
import com.service.profile.dto.request.AddressUpdateRequest;
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

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public AddressResponse updateAddress(Integer addressId, AddressUpdateRequest request) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_FOUND));

        // Kiểm tra xem địa chỉ có thuộc về customer hiện tại không
        CustomerProfile currentCustomer = customerProfileMapper
                .toCustomerProfile_(customerProfileService.getCurrentCustomerProfile());

        boolean isOwner = customerAddressRepository.existsByAddressAndCustomer(address, currentCustomer);
        if (!isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Kiểm tra label trùng lặp (trừ địa chỉ hiện tại)
        if (addressRepository.existsByLabelAndAddressIdNot(request.getLabel(), addressId)) {
            throw new AppException(ErrorCode.LABEL_EXISTED);
        }

        // Cập nhật thông tin địa chỉ
        address.setLabel(request.getLabel());
        address.setFullAddress(request.getFullAddress());
        address.setUpdateAt(LocalDateTime.now());

        addressRepository.save(address);

        return addressMapper.toAddressResponse(address);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public void deleteAddress(Integer addressId) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_FOUND));

        // Kiểm tra xem địa chỉ có thuộc về customer hiện tại không
        CustomerProfile currentCustomer = customerProfileMapper
                .toCustomerProfile_(customerProfileService.getCurrentCustomerProfile());

        boolean isOwner = customerAddressRepository.existsByAddressAndCustomer(address, currentCustomer);
        if (!isOwner) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // Xóa quan hệ CustomerAddress trước
        CustomerAddress customerAddress = customerAddressRepository.findByAddressAndCustomer(address, currentCustomer)
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_FOUND));

        customerAddressRepository.delete(customerAddress);

        // Xóa địa chỉ
        addressRepository.delete(address);
    }
}
