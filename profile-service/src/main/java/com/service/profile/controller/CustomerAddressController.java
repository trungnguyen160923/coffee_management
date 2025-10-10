package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.AddressUpdateRequest;
import com.service.profile.dto.response.AddressResponse;

import java.util.List;
import com.service.profile.service.CustomerAddressService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customer-addresses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CustomerAddressController {
    CustomerAddressService customerAddressService;

    @GetMapping
    ApiResponse<List<AddressResponse>> getCustomerAddresses() {
        List<AddressResponse> result = customerAddressService.getCustomerAddresses();
        return ApiResponse.<List<AddressResponse>>builder().result(result).build();
    }

    @PutMapping("/{addressId}")
    ApiResponse<AddressResponse> updateCustomerAddress(
            @PathVariable Integer addressId,
            @Valid @RequestBody AddressUpdateRequest request) {
        AddressResponse result = customerAddressService.updateCustomerAddress(addressId, request);
        return ApiResponse.<AddressResponse>builder().result(result).build();
    }

    @DeleteMapping("/{addressId}")
    ApiResponse<Void> deleteCustomerAddress(@PathVariable Integer addressId) {
        customerAddressService.deleteCustomerAddress(addressId);
        return ApiResponse.<Void>builder().build();
    }
}
