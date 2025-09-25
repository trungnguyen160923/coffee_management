package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.service.AddressService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.service.profile.dto.request.AddressCreationRequest;
import com.service.profile.dto.response.AddressResponse;

@RestController
@RequestMapping("/addresses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AddressController {
    AddressService addressService;

    @PostMapping
    ApiResponse<AddressResponse> createAddress(@Valid @RequestBody AddressCreationRequest request) {
        AddressResponse result = addressService.createAddress(request);
        return ApiResponse.<AddressResponse>builder().result(result).build();
    }
}
