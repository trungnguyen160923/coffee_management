package com.service.profile.controller;

import com.service.profile.dto.ApiResponse;
import com.service.profile.dto.request.CustomerProfileCreationRequest;
import com.service.profile.dto.request.CustomerProfileUpdateRequest;
import com.service.profile.dto.response.CustomerProfileResponse;
import com.service.profile.service.CustomerProfileService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customer-profiles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CustomerProfileController {
    CustomerProfileService customerProfileService;

    @PostMapping("/internal")
    ApiResponse<CustomerProfileResponse> createCustomerProfile(@Valid @RequestBody CustomerProfileCreationRequest request) {
        CustomerProfileResponse result = customerProfileService.createCustomerProfile(request);
        return ApiResponse.<CustomerProfileResponse>builder().result(result).build();
    }

    @GetMapping("/me")
    ApiResponse<CustomerProfileResponse> getCurrentCustomerProfile() {
        CustomerProfileResponse result = customerProfileService.getCurrentCustomerProfile();
        return ApiResponse.<CustomerProfileResponse>builder().result(result).build();
    }

    @GetMapping("/{userId}")
    ApiResponse<CustomerProfileResponse> getCustomerProfile(@PathVariable Integer userId) {
        CustomerProfileResponse result = customerProfileService.getCustomerProfile(userId);
        return ApiResponse.<CustomerProfileResponse>builder().result(result).build();
    }

    @PutMapping("/me")
    ApiResponse<CustomerProfileResponse> updateOwnCustomerProfile(@Valid @RequestBody CustomerProfileUpdateRequest request) {
        CustomerProfileResponse result = customerProfileService.updateOwnCustomerProfile(request);
        return ApiResponse.<CustomerProfileResponse>builder().result(result).build();
    }

}
